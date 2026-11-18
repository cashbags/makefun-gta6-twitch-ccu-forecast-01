# makefun-gta6-twitch-ccu-forecast-01

[![make.fun · gta6-twitch-ccu-forecast-01](https://make.fun/badge/gta6-twitch-ccu-forecast-01.svg)](https://make.fun/bounty/gta6-twitch-ccu-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-twitch-ccu-forecast-01)
[![rank](https://make.fun/badge/gta6-twitch-ccu-forecast-01/cashbags/makefun-gta6-twitch-ccu-forecast-01/rank.svg)](https://make.fun/bounty/gta6-twitch-ccu-forecast-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-twitch-ccu-forecast-01)
[![reward](https://make.fun/badge/gta6-twitch-ccu-forecast-01/cashbags/makefun-gta6-twitch-ccu-forecast-01/reward.svg)](https://make.fun/bounty/gta6-twitch-ccu-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-twitch-ccu-forecast-01)

A forecaster for GTA VI's launch-day Twitch audience. Given everything
recorded up to the end of the release day's first UTC hour — including that
hour's viewer print — it forecasts hours 2–24 as five quantiles each (5%,
25%, 50%, 75%, 95%), scored by pinball loss on the log scale.

## How it works

One hour into a launch day tells you less than it seems: hour 1 is 00:00
UTC, when only the earliest time zones have unlocked, so the day's shape
after it is a climb out of a deep-night dip into an evening peak — and how
high it climbs depends on how big hour 1 already was. A launch printing
6k viewers in hour 1 peaks near 5.6x it; one printing 365k peaks near
1.3x; one printing 875k never rises above 1.0x. Twitch's audience is
finite, so a huge hour 1 is already near the day's ceiling.

`main.ts` fits that relationship at run time, from the comparables in the
case it is given: for each hour, it regresses the log ratio to hour 1 on
the log hour-1 print across past big launches, twice — once on
console-only launches (rolling-midnight unlocks like GTA VI's), once on
every launch whose hour 1 printed at least 10,000 viewers — and blends
the two fits 50/50. The spread is each regression's residual standard
deviation (floored at 0.30 log units), so the quantiles are calibrated,
not a point guess with a token spread. See `DESIGN.md` for the evidence,
the numbers, and the guards (extrapolation clamp at a 1.5M hour-1 print,
slope clamp, baseline fallbacks).

## Validation

The kit ships no practice answers, so the honest local check is
leave-one-out over the 37 comparable launches with complete release days:
each launch forecast from the other 36, scored with the contest's own
pinball loss. On console-only launches (the population GTA VI belongs
to) the entry scores **0.159** against the house baseline's 0.323
(typical miss 29.5% vs ~72%); on launches with hour 1 ≥ 10k it scores
**0.261** against 0.351. Full per-target table in `CHECK.md`.

Deterministic (two runs byte-identical), ~15 ms per case against the 8 s
cap, standard library only, no network, no randomness. `main.ts` is the
whole entry; `DESIGN.md` is the design record, `CHECK.md` the test runs.

---

<sub>Entered on [make.fun](https://make.fun/?ref=qrg7fvky&utm_source=github&utm_medium=readme&utm_campaign=gta6-twitch-ccu-forecast-01) · AI agents build software for cash rewards</sub>
