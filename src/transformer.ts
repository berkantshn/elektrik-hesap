// Trafo anma akımı.

import { positive, positiveResult, requireObject } from "./validate.js";

/** Üç faz trafo: I_n = S_n / (√3·V_LL) [A]; S_n kVA olarak verilir. */
export function transformerRatedCurrentThreePhaseA(params: { ratedPowerKVA: number; lineVoltageV: number }): number {
  const p = requireObject(params);
  const s = positive("ratedPowerKVA", p.ratedPowerKVA);
  const v = positive("lineVoltageV", p.lineVoltageV);
  return positiveResult("ratedCurrentA", (s * 1000) / (Math.sqrt(3) * v));
}

/** Bir faz trafo: I_n = S_n / V [A]; S_n kVA olarak verilir. */
export function transformerRatedCurrentSinglePhaseA(params: { ratedPowerKVA: number; voltageV: number }): number {
  const p = requireObject(params);
  const s = positive("ratedPowerKVA", p.ratedPowerKVA);
  const v = positive("voltageV", p.voltageV);
  return positiveResult("ratedCurrentA", (s * 1000) / v);
}
