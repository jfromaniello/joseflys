---
# joseflys-b52g
title: Vx/Vy reales del POH con tabla por altitud + corrección por peso
status: completed
type: feature
priority: normal
tags:
    - takeoff
created_at: 2026-06-17T15:38:09Z
updated_at: 2026-06-17T15:41:33Z
---

## Problema

Vx y Vy en la calculadora de despegue se estiman como múltiplos de la velocidad de pérdida (Vx=1.3×Vs1, Vy=1.4×Vs1) en `lib/takeoffCalculations.ts:324-330`. Ningún avión define Vx/Vy reales. Para el C150 esto da Vy ~59 kt cuando el POH dice ~63 kt a nivel del mar.

## Solución

Estructura genérica reutilizable para toda la flota: en `AircraftLimits` agregar `vx`/`vy` como `number | ClimbSpeedPoint[]` (valor único o tabla por altitud de presión) + `climbSpeedRefWeight` (peso al que el POH publica esas velocidades).

- Helper `resolveClimbSpeed(spec, pressureAltitude)`: interpolación lineal por altitud, satura en extremos.
- En takeoffCalculations: `vxIAS = resolveClimbSpeed(...) corregido por peso ?? vs1IAS*1.3` (mantiene fallback).
- Corrección por peso √(W/refWeight), igual que Vs1, con refWeight del POH.

## Datos POH C150 (1969), convertidos MPH→kt

- climbSpeedRefWeight: 1600 lb (gross)
- Vx: 64 MPH IAS = 56 kt (flaps arriba, único)
- Vy tabla: SL=73 MPH (63 kt), 5000 ft=69 MPH (60 kt), 10000 ft=65 MPH (57 kt)

## Criterios de aceptación

- [ ] Tipos `ClimbSpeedPoint`, `vx/vy/climbSpeedRefWeight` en types.d.ts
- [ ] Helper resolveClimbSpeed con interpolación + clamp
- [ ] takeoffCalculations usa POH si existe, fallback a estimación
- [ ] C150 con datos del POH
- [ ] Tests del helper y de Vy variando con altitud
- [ ] npm test verde


## Implementación

- `lib/aircraft/types.d.ts`: tipos `ClimbSpeedPoint`, `ClimbSpeed` (`number | ClimbSpeedPoint[]`); campos `vx`, `vy`, `climbSpeedRefWeight` en `AircraftLimits`.
- `lib/aircraft/utils.ts`: helper `resolveClimbSpeed(spec, pa)` — interpolación lineal por altitud de presión con clamp en extremos; ordena la tabla; devuelve undefined si falta/vacía.
- `lib/takeoffCalculations.ts`: usa POH si existe, con corrección por peso √(W/climbSpeedRefWeight); fallback a 1.3×Vs1 / 1.4×Vs1.
- `lib/aircraftStorage.ts`: merge de los 3 campos nuevos en resolveAircraft (rama heredada).
- `lib/aircraft/CESSNA_150.ts`: datos del POH 1969 (gross 1600 lb). Vx=55.6 kt (64 mph), Vy tabla 63.4/60.0/56.5 kt (73/69/65 mph @ SL/5000/10000).
- `__tests__/climbSpeeds.test.ts`: 8 tests (helper + integración C150).

## Verificación

- npm test: 491/491 verde.
- Errores de tsc detectados son preexistentes (notam/route, aircraftStorage.test altitudeFrom, courseCalculations.test) — no relacionados.

## Pendiente / futuro

- Solo el C150 tiene datos del POH. El resto de la flota sigue con la estimación 1.3/1.4×Vs1 hasta cargar sus tablas.
- Conversión IAS→CAS no se aplica (el código ya trata IAS≈CAS para todas las V-speeds); revisar si se quiere precisión a baja velocidad.
