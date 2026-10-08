---
# joseflys-hmid
title: 'ISA calculator: compute ISA temp at pressure altitude for DA'
status: completed
type: bug
priority: normal
tags:
    - isa
created_at: 2026-10-08T23:21:08Z
updated_at: 2026-10-08T23:23:36Z
---

DA used ISA temperature at field elevation instead of pressure altitude.

Repro: elev 3894 ft, QNH 30.35 inHg, OAT 25°F (−3.888889°C) → PA ≈ 3510.31 ft.
Current DA ≈ 2183 ft (ISA 7.285°C @ elevation). Expected ≈ 2092.52 ft (ISA 8.045°C @ PA).

Fix:
- ISA temp = 15 − 0.0065 × PA_m (exact lapse rate), evaluated at PA.
- Keep barometric PA; keep linear DA approximation (118.8 ft/°C).
- Same bug in conditions cards (MetarCard, OverviewCard, WeatherCard, og-conditions) → use PA.
- UI: PA = ISA barometric formula, DA = linear approximation (not "exact").
- Tests: regression case, unit equivalence (inHg/hPa, °F/°C), DA = PA when OAT = ISA(PA).


## Implementation notes
- `calculateISATemp` now uses exact lapse 0.0065 °C/m; `calculateISA` evaluates it at PA. `calculatePAFromDA` coefficient updated to match.
- Conditions cards / OG image now use `calculateISA` (unrounded PA) instead of ISA@elevation + pre-rounded PA.
- /isa UI: ISA card "°C at PA"; tooltips + method note say PA = ISA barometric, DA = linear approx; explanation reordered (PA → ISA@PA → DA), exact section renamed "Method Used by this Calculator".
- Verified: 3894 ft / 30.35 inHg / 25°F → PA 3510.306, ISA 8.0454 °C, DA 2092.515 (shows 2093). 518 tests pass, tsc + eslint clean.
