---
# joseflys-82ax
title: Toggle kt/mph de V-speeds para aviones con ASI en MPH
status: completed
type: feature
priority: normal
tags:
    - takeoff
created_at: 2026-06-17T15:56:59Z
updated_at: 2026-06-17T15:57:07Z
---

## Qué

Para aviones con anemómetro calibrado en MPH (C150), la página de despegue ofrece un toggle KT/MPH en las V-speeds, default MPH. Resto de la flota: kt, sin toggle.

## Implementación

- `lib/aircraft/types.d.ts`: campo opcional `usesMPH?: boolean` en `AircraftPerformance` y `ResolvedAircraftPerformance`.
- `lib/aircraft/CESSNA_150.ts`: `usesMPH: true`.
- `lib/aircraftStorage.ts`: propaga `usesMPH` en rama heredada de resolveAircraft.
- `app/takeoff/TakeoffCalculatorClient.tsx`: estado `speedUnit`, useEffect que setea default según `aircraft.usesMPH`, toggle visible solo si usesMPH, conversión de las 4 V-speeds con `fromKnots()` de `lib/speedConversion.ts`. El viento queda en kt (METAR siempre en kt).

## Verificación

- 491/491 tests verde, tsc sin errores nuevos.
- Visual: C150 default MPH (VX 64 / VY 72 a PA 1180 ft), toggle a KT (VX 56 / VY 63). Coincide con POH.

Relacionado con joseflys-b52g.
