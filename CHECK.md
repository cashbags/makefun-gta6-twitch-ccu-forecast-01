# CHECK.md — validation runs for the GTA VI Twitch CCU forecaster

All runs 18 Nov 2026, system node v24.22.1, entry at
`~/workspace/makefun/bounties/gta6-twitch-ccu-forecast-01/entry/main.ts`.
The kit ships no practice answers, so the scored check is leave-one-out
over the comparables (see "Leave-one-out" below). The practice cases are
checked for shape, determinism and runtime only — their answers are not in
the kit and were not fetched from anywhere.

## Leave-one-out: the shipped program against the house baseline

Method: the 37 comparables in `input/p00.in` with a complete release day
(hour 1 and hours 2–24 all present; the GTA VI pre-release comparable is
the only exclusion — it has no release day). For each launch, a synthetic
case is built with that launch as the target (its hour-1 print as `known`)
and the other 36 launches as its `comparables`; the shipped `main.ts` is
run on it, and the output is scored with an independent Python
implementation of the rules' pinball loss (mean over 23 hours × 5 levels,
log scale). The starter (`starter/main.ts`, the house baseline) is run on
the same 37 synthetic cases for the comparison column. Neither program
ever sees its target's answer.

| launch | hour 1 | entry loss | baseline loss | entry miss | baseline miss |
| --- | --- | --- | --- | --- | --- |
| ELDEN RING | 875,155 | 0.0975 | 0.2108 | 8.5% | 39.2% |
| Call of Duty: Modern Warfare 4 | 59,162 | 0.1032 | 0.2361 | 9.4% | 47.7% |
| Call of Duty: Black Ops 7 | 79,207 | 0.1066 | 0.1733 | 13.5% | 31.8% |
| Forza Horizon 6 | 26,312 | 0.1191 | 0.4098 | 16.1% | 91.0% |
| Ghost of Tsushima | 131,910 | 0.1207 | 0.2283 | 20.8% | 47.5% |
| Call of Duty: Modern Warfare III | 114,417 | 0.1234 | 0.1520 | 20.0% | 25.9% |
| The Last of Us Part II | 365,019 | 0.1260 | 0.2470 | 19.0% | 44.4% |
| Cyberpunk 2077 | 851,999 | 0.1293 | 0.2299 | 17.6% | 41.5% |
| Stellar Blade | 27,057 | 0.1321 | 0.3725 | 20.8% | 84.3% |
| Hogwarts Legacy | 387,358 | 0.1351 | 0.2881 | 21.0% | 52.8% |
| Saros | 6,400 | 0.1385 | 0.6011 | 24.6% | 145.8% |
| FINAL FANTASY VII REBIRTH | 53,526 | 0.1494 | 0.1734 | 27.9% | 32.2% |
| Diablo IV | 533,455 | 0.1541 | 0.1254 | 28.7% | 13.5% |
| Ghost of Yōtei | 27,206 | 0.1547 | 0.4734 | 26.8% | 113.1% |
| Elden Ring Nightreign | 319,909 | 0.1560 | 0.2516 | 33.6% | 46.0% |
| Call of Duty: Black Ops 6 | 139,097 | 0.1995 | 0.2620 | 43.8% | 58.5% |
| The Legend of Zelda: Tears of the Kingdom | 129,948 | 0.2244 | 0.3087 | 50.6% | 70.5% |
| Death Stranding 2: On the Beach | 42,221 | 0.2266 | 0.1762 | 45.6% | 34.7% |
| Marvel Rivals | 165,939 | 0.2572 | 0.2097 | 53.2% | 41.5% |
| 007 First Light | 127,800 | 0.2653 | 0.3484 | 59.4% | 66.3% |
| Borderlands 4 | 133,568 | 0.2820 | 0.2529 | 65.6% | 46.7% |
| DOOM: The Dark Ages | 50,351 | 0.3052 | 0.2564 | 69.3% | 46.9% |
| Assassin's Creed Shadows | 146,993 | 0.3117 | 0.3452 | 69.5% | 57.8% |
| Forza Horizon 5 | 43,895 | 0.3499 | 0.3248 | 77.9% | 58.0% |
| Starfield | 156,828 | 0.3889 | 0.2909 | 88.7% | 65.3% |
| Monster Hunter Wilds | 152,314 | 0.4061 | 0.4273 | 86.1% | 112.0% |
| Clair Obscur: Expedition 33 | 10,639 | 0.5535 | 1.1450 | 125.7% | 348.5% |
| Halo Infinite | 20,526 | 0.6829 | 0.6314 | 154.9% | 154.1% |
| Resident Evil Requiem | 46,345 | 1.0484 | 1.2729 | 264.2% | 404.3% |
| Marathon | 1,393 | 1.2150 | 1.7452 | 337.8% | 694.7% |
| Baldur's Gate 3 | 3,447 | 1.4029 | 2.1768 | 416.3% | 1105.1% |
| Battlefield 6 | 2,470 | 1.5040 | 2.4065 | 471.0% | 1437.3% |
| HELLDIVERS 2 | 419 | 2.2489 | 3.4288 | 1153.5% | 4247.6% |
| ARC Raiders | 1,410 | 2.3444 | 3.3766 | 1265.6% | 4011.2% |
| Kingdom Come: Deliverance II | 414 | 2.3742 | 3.4638 | 1336.5% | 4473.4% |
| Black Myth: Wukong | 4,941 | 2.6974 | 3.4340 | 1884.7% | 4339.3% |
| Hollow Knight: Silksong | 164 | 2.7960 | 3.9411 | 1950.1% | 7051.7% |

Summary:

| targets | n | entry loss | baseline loss | entry miss | entry 90% coverage |
| --- | --- | --- | --- | --- | --- |
| console-only launches | 8 | **0.1590** (median 0.1440) | 0.3226 (median 0.2778) | 29.5% | 0.967 |
| hour-1 ≥ 10k launches | 28 | **0.2610** (median 0.1777) | 0.3508 (median 0.2592) | 54.9% | 0.831 |
| all 37 launches | 37 | 0.6495 (median 0.2572) | 0.9297 (median 0.3248) | 280.5% | 0.694 |

The entry beats the baseline on 28 of 37 targets. The 9 it loses on are
mostly launches whose release day is distorted by paid early access or a
surprise early multiplayer (Diablo IV, Starfield, Death Stranding 2,
DOOM: The Dark Ages, Forza Horizon 5, Halo Infinite) or free-to-play /
slow-burn shapes (Marvel Rivals, Borderlands 4) — GTA VI has no early
access and a standard midnight unlock, so those failure modes do not
apply to the final. The five worst losses overall are the tiny-hour-1
simultaneous-unlock games (hour 1 of 164–4,941 viewers, losses 2.25–2.80),
whose ratios are unlock artefacts; the final's fit set excludes them from
fit B by the 10,000-viewer floor, and GTA VI's hour 1 will be orders of
magnitude larger.

## Practice cases (shape check only — answers not in the kit)

`main.ts` run on `input/p00.in`–`p03.in`; every output is 23 rows, hours
2–24, five non-decreasing quantiles in (0, 1e9], ~1.7 KB per file:

| case | hour-1 print | median ratio h2 / h6 / h12 / h19 / h24 |
| --- | --- | --- |
| p00 Marvel's Wolverine | 23,357 | 0.84 / 0.89 / 1.26 / 3.36 / 2.56 |
| p01 Red Dead Redemption 2 | 116,550 | 0.86 / 0.85 / 0.87 / 1.82 / 1.54 |
| p02 God of War Ragnarök | 269,517 | 0.88 / 0.83 / 0.71 / 1.33 / 1.18 |
| p03 Marvel's Spider-Man 2 | 119,087 | 0.87 / 0.85 / 0.86 / 1.81 / 1.53 |

The flattening with hour-1 size is the saturation effect working as
designed. The starter baseline on the same cases is a flat 1.00x median
at every hour.

## Determinism and runtime

- Two runs over the 4 practice cases: byte-identical outputs
  (`diff -r` clean). Two runs over the 37 pseudo-cases: byte-identical.
- 37 pseudo-cases in 0.57 s (~15 ms a case); 4 practice cases in 0.18 s.
  Cap is 8 s per case on 1 CPU / 1024 MB. No randomness, no clock, no
  network in the program.
- Adding the ±0.6 slope guard leaves all 37 pseudo-case outputs and all
  4 practice outputs byte-identical: it binds on no real data.

## Edge cases (synthetic cases, all valid outputs)

| case | input | result |
| --- | --- | --- |
| e1 | no comparables | exactly the house baseline (median 1.00x every hour) |
| e2 | hour-1 print 3,000,000 | clamped 1.5M shape, h19 median 0.89x, no crash |
| e3 | hour-1 print 50 | low clamp, h19 median 1.90x, no crash |
| e4 | comparables with missing hours | per-hour fits skip cleanly, valid output |
| e5 | hour-1 print 0 | treated as 1, valid output |

## Research grounding

- Launch-day Twitch peaks from Streams Charts / Gamesight: WoW Classic
  1.13M and WoW Forever 1.12M peak viewers; Marvel's Wolverine 268.5k
  peak across platforms, ~15.3k channels day one; CoD Vanguard 338.5k
  peak / 221k average over its first 24 h, Battlefield 2042 342.8k,
  Halo Infinite 258.5k. Big launches sustain hundreds of thousands of
  concurrent category viewers across the whole first day — the scale the
  saturation curve is fitted against.
- GTA context: GTA V is Twitch's most-watched game (1.46B hours watched
  in 2024; all-time category peak 1,158,046 viewers); Kai Cenat's
  November 2026 GTA marathon peaked at 665k category viewers. The GTA VI
  category already read 1,240 viewers / 181 channels before release
  (house probe, 17 Nov 2026, in the kit's competition.yaml).
