---
# joseflys-ywf2
title: Factor de potencia disponible (motor gastado) en despegue
status: completed
type: feature
priority: normal
tags:
    - takeoff
created_at: 2026-06-17T16:17:28Z
updated_at: 2026-06-17T16:17:34Z
---

## Qué

Input "Available Power" (% de potencia nominal, default 100) en la página de despegue. El POH asume motor nuevo al 100%; los motores viejos dan menos (verificable por RPM estático). Modela el efecto en carrera y, sobre todo, en ascenso.

## Modelo físico

- Carrera: ground roll ∝ 1/powerRatio (aceleración ∝ empuje ∝ potencia a baja velocidad).
- Ascenso: ROC = potencia EXCEDENTE / peso. La pérdida de potencia se descuenta del excedente, así que el ROC cae mucho más que proporcionalmente:
  ΔROC[fpm] = (1 − powerRatio) × η × ratedHP × 33000 / peso, con η=0.75 (hélice paso fijo en ascenso).
- Si el ROC resultante ≤ 0 (y hay climbTable), se fuerza NO-GO ("Rate of climb is zero or negative...").
- Warning siempre que potencia < 100%.

## Implementación

- lib/takeoffCalculations.ts: `availablePowerPercent` en TakeoffInputs (clamp 0.3–1.0); CLIMB_PROP_EFFICIENCY=0.75; penalización en carrera y ROC; flag climbImpossible → NO-GO; warning.
- app/takeoff/page.tsx: param `power` (default "100").
- app/takeoff/TakeoffCalculatorClient.tsx: prop initialPower, estado availablePower, URL sync (solo si ≠100), pasaje a calc, campo "Available Power" en Weight & Configuration.
- __tests__/availablePower.test.ts: 5 tests.

## Verificación

- 496/496 tests, tsc sin errores nuevos.
- Visual SACD verano (DA 4301, 1600 lb, GF, 85%): NO-GO, margen −11.3%, ROC 145 fpm, obstacle 4236 ft > pista 3806. Reproduce el comportamiento empírico real.

## Futuro (lo "otro" pendiente)

- Factor de margen de seguridad simple (×1.25–1.5) encima, configurable.
- Default de potencia por avión (campo en la estructura del avión).
