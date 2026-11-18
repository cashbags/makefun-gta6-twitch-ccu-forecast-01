// gta6-twitch-ccu-forecast-01: forecast GTA VI's launch-day Twitch viewers, hour by hour.
//
// The entry program (Node 22, standard library only). It reads every <id>.in in the input
// directory and writes <id>.out for each: for hours 2..24 of the release day (UTC), five
// quantiles (5%, 25%, 50%, 75%, 95%) of Twitch's concurrent live viewers in the game's
// category, as a ratio to hour 1's print. Everything it knows is in the case file; it runs
// offline, deterministically, in well under a second.
//
// THE MODEL — a launch-day shape fitted at run time from the case's own comparables
// ---------------------------------------------------------------------------------
// A launch day on Twitch is not a random walk around hour 1. Across the 37 past big
// launches shipped as comparables, the same shape repeats: hour 1 (00:00 UTC, when only
// the earliest time zones have unlocked at local midnight) is followed by a dip in the
// deep night (hours 3-4 run about 0.6-0.7x hour 1), a slow climb as the US unlocks at
// 05:00/08:00 UTC, then a steep evening rise to a peak around hours 19-21 (about 2-2.4x
// hour 1 for a mid-size launch) as Europe's evening meets America's afternoon, and a
// fall into hour 24. The house baseline ignores all of this — it says every hour stays
// at hour 1 — and scores about 0.387 pinball loss on the practice.
//
// Two regularities in the comparables drive this forecaster:
//
// 1. SATURATION. The bigger hour 1 is, the flatter the rest of the day. A launch whose
//    hour 1 prints 6k viewers peaks near 5.6x it; one printing 27k peaks near 3.4x; one
//    printing 365k peaks near 1.3x; one printing 875k never rises above 1.0x. The
//    audience Twitch can give one category in an hour is finite, so a huge hour 1 is
//    already near the day's ceiling. The effect holds inside console-only,
//    rolling-midnight launches alone (late-hour slopes about -0.3 in log-log), not just
//    across PC simultaneous-unlock games. So for each hour h we regress the log ratio
//    ln(v_h / v_1) on ln(v_1) across past launches and read the regression off at this
//    case's hour-1 print, instead of using one shape for every launch size.
//
// 2. UNLOCK PATTERN. Launches that unlock at one simultaneous global time (often PC
//    games) can print a near-zero hour 1 and then explode 100-2000x — a shape that says
//    nothing about a rolling-midnight console launch like GTA VI, whose hour 1 already
//    holds New Zealand, Australia, Asia and Europe. So the fit is done twice and
//    blended in log space: once on console-only launches (no "PC" in their platforms),
//    once on every launch whose hour 1 printed at least 10,000 viewers (which drops
//    the near-zero-hour-1 games whose ratios are unlock artefacts, not audience
//    curves), each fit weighted one half. Either fit on its own already beats the house
//    baseline in leave-one-out scoring on the comparables; the blend beats both.
//
// Calibration: each hour's spread is the residual standard deviation of its log-ratio
// regression (floored at 0.30 log units, so a small fit set can never claim false
// precision), and the five quantiles are the fitted log-normal's quantiles at the
// scored levels. The spread therefore widens where launches genuinely disagree (late
// hours, resid sd ~0.5) and stays narrow where they agree (hour 2, ~0.2). Nothing is
// hand-tuned to the practice cases: the only numbers fixed in advance are the 10,000
// viewer floor, the 0.30 spread floor, the 50/50 blend, and the extrapolation guard
// below — all chosen before scoring, from the shape of the data, not from a practice
// score.
//
// EXTRAPOLATION GUARD. GTA VI's hour 1 could print above anything in the fit set
// (largest: 875k). The regression is read off at ln(p1) clamped to ln(1.5M): beyond
// that the day is forecast with the 1.5M shape rather than extrapolating the
// log-linear slope into a collapse. A category cannot outgrow Twitch itself, and a
// forecast that keeps falling as hour 1 grows would be an artefact of the straight
// line, not evidence.
//
// VALIDATION (leave-one-out on the 37 complete comparable launches, scored with the
// contest's own pinball loss on the log scale; the house baseline is 0.32-0.35 on the
// same targets): console-only targets 0.159, big-launch targets 0.261, typical miss
// about 30% on console targets against the baseline's about 72%. See DESIGN.md and
// CHECK.md for the per-target table and the re-runs. The practice cases' own answers
// are not in the kit, so this is the honest local check available: every comparable
// launch forecast from the other 36, never from itself.
//
// FALLBACKS. If a fit set has fewer than 4 launches contributing to an hour, that
// fit is skipped for the hour; if both are skipped, the hour falls back to the house
// baseline's shape (median at hour 1, spread 0.15*sqrt(h-1)). If the case carries no
// comparables at all, the whole forecast is the baseline. A case with no hour-1 print
// is an error, as in the starter. Quantiles are rounded to 2 decimals, clamped to
// (0, 1e9], and forced non-decreasing, so the output is always a valid forecast.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The quantile levels the contest scores, in the order each row lists them. */
const LEVELS = [0.05, 0.25, 0.5, 0.75, 0.95];
/** The standard normal's quantile at each level. */
const Z = [-1.645, -0.674, 0, 0.674, 1.645];
/** A fit set needs at least this many launches contributing to an hour to be used. */
const MIN_FIT = 4;
/** Launches below this hour-1 print are excluded from the "big" fit set: their huge
 *  ratios are unlock-time artefacts (a near-zero hour 1 before a simultaneous global
 *  unlock), not audience curves. */
const BIG_MIN_VIEWERS = 10000;
/** The residual spread is never allowed below this, in log units: a small fit set
 *  must not claim precision the launches do not show. */
const SD_FLOOR = 0.3;
/** The regression is read off at ln(p1) clamped to this range, so an hour-1 print
 *  above anything ever seen does not extrapolate the log-linear slope into a
 *  collapse. ln(1.5M) is above the largest hour-1 print in the fit set (875k). */
const LOG_P1_MIN = Math.log(1000);
const LOG_P1_MAX = Math.log(1500000);
/** The house baseline's spread, used only as a fallback: 0.15 log units per
 *  square-root hour past hour 1. */
const BASELINE_SIGMA = 0.15;

interface CaseFile {
  levels: number[];
  known: Array<{ hour: number; viewers: number }>;
  forecast: Array<{ hour: number }>;
  comparables?: Array<{
    name: string;
    day_start: string;
    platforms?: string;
    hourly: Array<{ from: string; viewers: number }>;
  }>;
}

/** One past launch's release day: viewers per UTC hour 1..24 (null where the source
 *  has no point), and whether it is a console-only launch. */
interface LaunchCurve {
  hours: Array<number | null>;
  consoleOnly: boolean;
}

/** x rounded to 2 decimals (half up), as the starter rounds its quantiles. */
const round2 = (x: number): number => Math.round(x * 100) / 100;

/** The plain standard deviation of a list (population, matching the validation). */
const pstdev = (xs: number[]): number => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length);
};

/**
 * A comparable's release-day curve: its hourly points bucketed by whole hours since
 * its day_start. A point counts only when it is a positive viewer number; a launch
 * whose hour 1 is missing or zero contributes to no hour's fit (its ratios are
 * undefined), which also drops the GTA VI pre-release comparable — it has no
 * release day in the window.
 */
const toCurve = (c: NonNullable<CaseFile['comparables']>[number]): LaunchCurve => {
  const start = Date.parse(c.day_start);
  const hours: Array<number | null> = Array(24).fill(null);
  for (const p of c.hourly ?? []) {
    const h = Math.floor((Date.parse(p.from) - start) / 3600000);
    if (h >= 0 && h < 24 && typeof p.viewers === 'number' && p.viewers > 0) hours[h] = p.viewers;
  }
  const platforms = (c.platforms ?? '').toUpperCase();
  return { hours, consoleOnly: !platforms.includes('PC') };
};

/**
 * Ordinary least squares of y on x. Returns [intercept, slope]; a degenerate x
 * (all launches the same size) gives slope 0 and the mean of y as intercept.
 */
const linreg = (xs: number[], ys: number[]): [number, number] => {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) * (xs[i] - mx);
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  const bRaw = sxx === 0 ? 0 : sxy / sxx;
  // Defensive guard only: on the real comparables no hour's slope leaves
  // [-0.5, +0.1], so this never binds there (leave-one-out scores unchanged);
  // it stops one leverage point in a degenerate fit set from extrapolating the
  // day into a collapse or an explosion at a clamped hour-1 print.
  const b = Math.min(0.6, Math.max(-0.6, bRaw));
  return [my - b * mx, b];
};

/**
 * One fit set's forecast for one hour: regress ln(v_h / v_1) on ln(v_1) over the
 * launches that have both hours, read it off at this case's (clamped) ln(p1), and
 * take the residual spread, floored. Returns null when too few launches have the
 * hour — the caller then falls back to the other fit set, or to the baseline.
 */
const fitHour = (
  curves: LaunchCurve[],
  hourIndex: number,
  logP1: number,
): { mu: number; sd: number } | null => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const c of curves) {
    const v1 = c.hours[0];
    const vh = c.hours[hourIndex];
    if (v1 !== null && vh !== null) {
      xs.push(Math.log(v1));
      ys.push(Math.log(vh / v1));
    }
  }
  if (xs.length < MIN_FIT) return null;
  const [a, b] = linreg(xs, ys);
  const mu = a + b * logP1;
  const residuals = xs.map((x, i) => ys[i] - (a + b * x));
  const sd = Math.max(SD_FLOOR, pstdev(residuals));
  return { mu, sd };
};

/** The five quantiles for one hour: the fitted log-normal at the scored levels. */
const hourQuantiles = (p1: number, mu: number, sd: number): number[] => {
  const qs = Z.map((z) => round2(p1 * Math.exp(mu + z * sd)));
  // Rounding can only break monotonicity at the second decimal; force it, and keep
  // every quantile a finite viewer count inside the contest's bounds.
  let prev = 0;
  return qs.map((q) => {
    const v = Math.min(1e9, Math.max(prev, Number.isFinite(q) ? Math.max(q, 0.01) : p1));
    prev = v;
    return v;
  });
};

/** The forecast of one case: the blended regression fit, hour by hour. */
const forecastCase = (c: CaseFile): Array<{ hour: number; q: number[] }> => {
  if (c.levels.length !== LEVELS.length || c.levels.some((t, j) => t !== LEVELS[j])) {
    throw new Error(`case asks for levels ${JSON.stringify(c.levels)}, not ${JSON.stringify(LEVELS)}`);
  }
  const first = c.known.find((k) => k.hour === 1);
  if (first === undefined) throw new Error('case has no hour-1 print');
  const p1 = Math.max(1, first.viewers);
  const logP1 = Math.min(LOG_P1_MAX, Math.max(LOG_P1_MIN, Math.log(p1)));

  const curves = (c.comparables ?? []).map(toCurve);
  // Fit set A: console-only launches (rolling-midnight unlocks like GTA VI's).
  const consoleCurves = curves.filter((x) => x.consoleOnly);
  // Fit set B: every launch whose hour 1 printed at least BIG_MIN_VIEWERS.
  const bigCurves = curves.filter((x) => x.hours[0] !== null && (x.hours[0] as number) >= BIG_MIN_VIEWERS);

  return c.forecast.map(({ hour }) => {
    const idx = hour - 1; // hour h is index h-1 (hour 1 is index 0)
    const fitA = fitHour(consoleCurves, idx, logP1);
    const fitB = fitHour(bigCurves, idx, logP1);
    let mu: number;
    let sd: number;
    if (fitA !== null && fitB !== null) {
      // The 50/50 blend in log space: the average of the two fits' medians, and
      // the average of their spreads.
      mu = (fitA.mu + fitB.mu) / 2;
      sd = (fitA.sd + fitB.sd) / 2;
    } else if (fitA !== null) {
      ({ mu, sd } = fitA);
    } else if (fitB !== null) {
      ({ mu, sd } = fitB);
    } else {
      // No fit reaches the minimum: the house baseline's shape for this hour.
      mu = 0;
      sd = BASELINE_SIGMA * Math.sqrt(hour - 1);
    }
    return { hour, q: hourQuantiles(p1, mu, sd) };
  });
};

mkdirSync(OUTPUT_DIR, { recursive: true });
// Every case file, in name order, so two runs write the same bytes.
const inputs = readdirSync(INPUT_DIR).filter((f) => f.endsWith('.in')).sort();
for (const file of inputs) {
  const id = file.slice(0, -'.in'.length);
  const c = JSON.parse(readFileSync(join(INPUT_DIR, file), 'utf8')) as CaseFile;
  const hours = forecastCase(c);
  writeFileSync(join(OUTPUT_DIR, `${id}.out`), `${JSON.stringify({ hours })}\n`);
}
