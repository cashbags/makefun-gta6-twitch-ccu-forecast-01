# DESIGN.md — forecasting GTA VI's launch-day Twitch audience

This is the design record for the entry in `main.ts`: what it forecasts, what
the past launches in the case file actually show, how the forecaster turns
that into calibrated quantiles, and how it was validated without ever seeing
a practice answer (the kit ships no answers — see "Validation" below).

## The problem in one paragraph

Grand Theft Auto VI releases 19 November 2026 on PS5 and Xbox only, and no
console maker publishes a player count, so the contest counts the next best
thing: Twitch's concurrent live viewers in the "Grand Theft Auto VI"
category, read once a minute by the house. The program sees everything
recorded up to the end of the release day's first UTC hour — including that
hour's print — and must forecast hours 2–24 as five quantiles each, scored by
mean pinball loss on the log scale. A forecast whose five quantiles are equal
scores exactly its mean absolute log error, so the median has to be right
*and* the spread has to be honest: too narrow pays for every hour outside
it, too wide pays at every hour.

## What the past launches show

The case ships 38 past big launches as comparables (42 in the final, which
adds the four practice launches), each with hourly Twitch category averages
from 14 days before its release day to 3 days after. Pulling each launch's
24 release-day hours out of that and dividing by its hour-1 print shows two
regularities that carry the whole design. All figures below are computed
from the kit's own `input/p00.in` comparables; nothing here is invented, and
nothing is taken from a practice answer, because the kit contains none.

### 1. The day has a shape, and the house baseline ignores it

Across the 37 comparables with a complete release day, the median ratio to
hour 1 is: hour 2 ≈ 0.87, hours 3–4 ≈ 0.73–0.75 (the deep-night dip, when
only the earliest time zones are awake), hour 6 ≈ 0.79, hours 7–12 ≈
0.80–0.98 (climbing as the US unlocks at 05:00/08:00 UTC), then a steep
evening rise — hour 15 ≈ 1.52, hour 19 ≈ 2.40, hour 20 ≈ 2.37 — and a fall
into hour 24 ≈ 2.04. Hour 1 is 00:00 UTC: the UK has just unlocked at local
midnight and central Europe an hour earlier, but most of the world has not.
The evening peak is Europe's prime time meeting America's afternoon. The
house baseline says every hour stays at hour 1 (median ratio 1.00, all day);
on the practice it scores about 0.387 pinball loss with a typical miss of
about 83%. Any forecaster that knows the shape beats that by construction —
the question is only how much of the shape a given launch follows.

### 2. Saturation: the bigger hour 1, the flatter the day

The median shape above hides the strongest effect in the data. Split the
launches by their hour-1 print and the peak ratio collapses as hour 1
grows:

| hour-1 print | example | peak / hour 1 |
| --- | --- | --- |
| ~6k | Saros | 5.63x |
| ~27k | Stellar Blade, Ghost of Yōtei | 3.4–3.6x |
| ~53k | Final Fantasy VII Rebirth | 2.24x |
| ~132k | Ghost of Tsushima | 2.25x |
| ~365k | The Last of Us Part II | 1.34x |
| ~852k | Cyberpunk 2077 | 1.26x |
| ~875k | Elden Ring | 1.00x |

Twitch's total concurrent audience is finite (a few million at peak), so a
category that already prints hundreds of thousands in hour 1 is near its
ceiling for the day; a small launch has headroom to multiply. The effect is
not an artefact of PC games unlocking all at once: inside console-only,
rolling-midnight launches alone, the late-hour log-log slopes are still
about −0.3 (hour 19–20), and the console-only median curve peaks near 2.4x
at a 27k hour 1 but near 1.3x at a 365k hour 1. GTA VI's hour 1 is the
unknown that matters most: the GTA V category alone reads ~81k viewers on
an ordinary day (house probe, 17 Nov), and GTA VI's launch hour will dwarf
it, so the forecast must flatten as hour 1 grows — a fixed shape fitted to
mid-size launches would overshoot the evening by multiples.

A third regularity is what *not* to learn from: launches that unlock at one
simultaneous global time (several PC games) can print a near-zero hour 1 —
164 viewers for Hollow Knight: Silksong — and then explode 100–2000x when
the unlock lands mid-day. Those ratios are unlock-time artefacts, not
audience curves, and they say nothing about a rolling-midnight console
launch whose hour 1 already holds New Zealand, Australia, Asia and Europe.
They are the reason the fit excludes small hour-1 launches (see below).

## The forecaster

For each hour h = 2..24, the program fits, at run time, from the comparables
in the case it is given:

```
ln(v_h / v_1) = a_h + b_h * ln(v_1) + error,   sd_h = sd(error)
```

an ordinary least-squares regression of the log ratio on the log hour-1
print, read off at this case's hour-1 print. The median forecast is
`p1 * exp(a_h + b_h * ln p1)` and the five quantiles are the fitted
log-normal's quantiles at the scored levels, with the standard normal's
z-values (−1.645, −0.674, 0, 0.674, 1.645). The spread is the regression's
residual standard deviation, floored at 0.30 log units — a small fit set can
never claim precision the launches do not show. The spread is genuinely
wider where launches disagree (late hours, residual sd ≈ 0.5) and narrower
where they agree (hour 2, ≈ 0.2).

The fit is done twice and blended 50/50 in log space (average the two
medians, average the two spreads):

- **Fit A — console-only.** Comparables with no "PC" in their platforms
  string: rolling-midnight unlocks like GTA VI's. 8 launches in the
  practice cases, 12 in the final (which adds the four practice launches,
  all console rolling-midnight). Tightest spreads (residual sd 0.12–0.47),
  but a small set.
- **Fit B — big launches.** Every comparable whose hour 1 printed at least
  10,000 viewers, whatever its platforms: 28 launches in the practice
  cases. This drops the near-zero-hour-1 games whose ratios are unlock
  artefacts, while keeping the huge launches (Elden Ring 875k, Cyberpunk
  852k) that anchor the top end of the saturation curve, where fit A has
  only one launch above 365k.

Either fit alone already beats the house baseline in leave-one-out scoring;
the blend beats both (see Validation). The blend is also the safer choice
for the final: fit A alone would extrapolate from 8–12 launches, fit B
alone would dilute the rolling-midnight shape with PC unlocks.

Three guards, all fixed in advance from the shape of the data, never tuned
to a practice score:

- **Extrapolation guard.** The regression is read off at ln(p1) clamped to
  ln(1.5M). GTA VI's hour 1 could print above anything in the fit set
  (largest: 875k); beyond 1.5M the day is forecast with the 1.5M shape
  rather than extrapolating the log-linear slope into a collapse. A
  category cannot outgrow Twitch itself.
- **Slope guard.** Slopes are clamped to [−0.6, +0.6]. On the real
  comparables no hour's slope leaves [−0.5, +0.1], so this never binds
  there (leave-one-out scores are byte-identical with and without it); it
  only stops one leverage point in a degenerate fit set from swinging the
  forecast.
- **Fallbacks.** A fit set needs at least 4 launches with both hours to be
  used for an hour; if both fits are skipped for an hour, that hour falls
  back to the house baseline's shape (median at hour 1, spread
  0.15·√(h−1)). With no comparables at all the whole forecast is the
  baseline. A comparable with a missing or zero hour 1 contributes to no
  hour's fit — which also drops the GTA VI pre-release comparable, since it
  has no release day in the window. Hour-1 prints below 1 count as 1.

What the program deliberately does *not* use: the case's `history` (the
pre-release hype curve), `streams` (the top-20 live streams at the cut),
and `categories_hourly` (Twitch's top-20 categories). All three are in the
final case only, not the practice, so no honest local validation of them
exists; hour 1's print already carries the launch's scale, and the
comparables carry its shape. A top-streamer concentration effect (one
channel carrying half the category) is real — Kai Cenat's GTA marathon
peaked at 665k category viewers in November 2026 — but modelling it from
one snapshot, with no practice data to test against, would be guessing
dressed as signal. The spread floor of 0.30 is the honest allowance for
that unmodelled variance.

## Validation

The kit ships no practice answers, so the honest local check is
leave-one-out over the comparables themselves: each of the 37 launches with
a complete release day is forecast from the other 36, never from itself,
and scored with the contest's own pinball loss on the log scale. The
program under test is the shipped `main.ts`, run on synthetic cases built
from the comparables (one target per case, the other 36 as its
comparables); the scorer is an independent Python implementation of the
rules' formula. Full per-target table in `CHECK.md`.

| targets | n | this entry | house baseline |
| --- | --- | --- | --- |
| console-only launches | 8 | **0.159** (typical miss 29.5%, 90% coverage 0.967) | 0.323 (miss ~72%, coverage 0.799) |
| hour-1 ≥ 10k launches | 28 | **0.261** (miss 54.9%, coverage 0.831) | 0.351 (miss ~81%, coverage 0.766) |
| all 37 launches | 37 | 0.650 (median 0.257) | 0.930 (median 0.325) |

The all-37 mean is dragged by five tiny-hour-1 simultaneous-unlock games
(Silksong, Black Myth: Wukong, Kingdom Come II, ARC Raiders, Helldivers 2:
hour 1 of 164–4,941 viewers, losses 2.25–2.80) — launches whose shape is an
unlock artefact and which GTA VI, with a rolling midnight unlock and a
huge hour 1, does not resemble. On the two populations GTA VI belongs to,
the entry roughly halves the baseline's loss. The house baseline's stated
practice loss is about 0.387; this entry's console-target loss of 0.159 is
the closest available analogue for the final, since the final's target is a
console rolling-midnight launch and the final's fit set is strictly larger
(it adds the four practice launches, all console rolling-midnight).

Practice-case outputs (answers unknown, shape check only): the forecast
flattens exactly as saturation predicts — Marvel's Wolverine (hour 1
23,357) peaks at a 3.36x median in hour 19; Red Dead Redemption 2
(116,550) at 1.82x; Spider-Man 2 (119,087) at 1.81x; God of War Ragnarök
(269,517) at 1.33x. The hour-2 median sits at 0.84–0.88x hour 1 in all
four, the deep-night dip, matching the comparables' median.

## Retests (the "perketat" pass)

- **Determinism:** two runs over the four practice cases write
  byte-identical outputs (`diff -r` clean); two runs over the 37
  pseudo-cases likewise.
- **Runtime:** 37 cases in 0.57 s (~15 ms a case); 4 practice cases in
  0.18 s — against an 8 s cap per case, on 1 CPU.
- **Edge cases** (synthetic cases, all valid outputs, 23 rows, quantiles
  non-decreasing, inside (0, 1e9]): no comparables → exactly the house
  baseline; hour-1 print 3,000,000 → clamped shape, no crash; hour-1
  print 50 and 0 → low clamp, no crash; comparables with missing hours →
  per-hour fits skip cleanly.
- **Slope guard:** adding the ±0.6 slope clamp leaves all 37 pseudo-case
  outputs and all 4 practice outputs byte-identical — it binds on no real
  data.
- **Output size:** ~1.7 KB per case, far under the 65,536-byte cap.

## File map

- `main.ts` — the whole entry: reads every `*.in`, fits the two regressions
  per hour from the case's comparables, blends them, writes `<id>.out`.
  Node 22, standard library only, no network, no randomness, no clock.
- `DESIGN.md` — this file.
- `CHECK.md` — the validation runs and their numbers.
- `README.md` — the entry summary with make.fun badges.
- `LICENSE` — MIT (the kit starter's text).

## Known limits

- The forecast is only as good as the comparables: if GTA VI's hour 1
  prints far outside the fit range, the clamped 1.5M shape is a judgement
  call, not a measurement. If hour 1 prints small (it should not — the
  category already reads ~1.2k before release and GTA V reads ~81k on an
  ordinary day), the low clamp holds the shape of a 1k launch.
- The model knows the *average* launch-day shape, not this launch's
  particulars: a single dominant streamer, a midnight launch event, or a
  server problem on the day would move hours the model cannot foresee. The
  spread (residual sd, floored at 0.30) is the allowance for that, and the
  90% coverage on console targets (0.967) suggests it is, if anything,
  slightly generous rather than tight.
- SullyGnome's hourly averages (the comparables' source) are one point an
  hour, while the final's prints are means of 60 minute reads; the two
  measures are close, not identical, and the practice grade itself is
  computed on the hourly-average measure. Nothing in the model depends on
  the distinction.
