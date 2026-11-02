// Bir ve üç faz güç-akım-gerilim bağıntıları.
// Üç faz fonksiyonları dengeli yük ve fazlar arası (hat) gerilim varsayar.

import { positive, positiveResult, powerFactor, requireObject } from "./validate.js";

const SQRT3 = Math.sqrt(3);

/** Bir faz aktif güç: P = V·I·cosφ [W] */
export function singlePhaseActivePowerW(params: { voltageV: number; currentA: number; powerFactor: number }): number {
  const p = requireObject(params);
  const v = positive("voltageV", p.voltageV);
  const i = positive("currentA", p.currentA);
  const pf = powerFactor("powerFactor", p.powerFactor);
  return positiveResult("activePowerW", v * i * pf);
}

/** Üç faz aktif güç: P = √3·V_LL·I_L·cosφ [W] */
export function threePhaseActivePowerW(params: { lineVoltageV: number; lineCurrentA: number; powerFactor: number }): number {
  const p = requireObject(params);
  const v = positive("lineVoltageV", p.lineVoltageV);
  const i = positive("lineCurrentA", p.lineCurrentA);
  const pf = powerFactor("powerFactor", p.powerFactor);
  return positiveResult("activePowerW", SQRT3 * v * i * pf);
}

/** Bir faz görünür güç: S = V·I [VA] */
export function singlePhaseApparentPowerVA(params: { voltageV: number; currentA: number }): number {
  const p = requireObject(params);
  const v = positive("voltageV", p.voltageV);
  const i = positive("currentA", p.currentA);
  return positiveResult("apparentPowerVA", v * i);
}

/** Üç faz görünür güç: S = √3·V_LL·I_L [VA] */
export function threePhaseApparentPowerVA(params: { lineVoltageV: number; lineCurrentA: number }): number {
  const p = requireObject(params);
  const v = positive("lineVoltageV", p.lineVoltageV);
  const i = positive("lineCurrentA", p.lineCurrentA);
  return positiveResult("apparentPowerVA", SQRT3 * v * i);
}

/** Bir faz akım: I = P / (V·cosφ) [A] */
export function singlePhaseCurrentA(params: { activePowerW: number; voltageV: number; powerFactor: number }): number {
  const p = requireObject(params);
  const w = positive("activePowerW", p.activePowerW);
  const v = positive("voltageV", p.voltageV);
  const pf = powerFactor("powerFactor", p.powerFactor);
  return positiveResult("currentA", w / (v * pf));
}

/** Üç faz hat akımı: I_L = P / (√3·V_LL·cosφ) [A] */
export function threePhaseLineCurrentA(params: { activePowerW: number; lineVoltageV: number; powerFactor: number }): number {
  const p = requireObject(params);
  const w = positive("activePowerW", p.activePowerW);
  const v = positive("lineVoltageV", p.lineVoltageV);
  const pf = powerFactor("powerFactor", p.powerFactor);
  return positiveResult("lineCurrentA", w / (SQRT3 * v * pf));
}

/** Bir faz gerilim: V = P / (I·cosφ) [V] */
export function singlePhaseVoltageV(params: { activePowerW: number; currentA: number; powerFactor: number }): number {
  const p = requireObject(params);
  const w = positive("activePowerW", p.activePowerW);
  const i = positive("currentA", p.currentA);
  const pf = powerFactor("powerFactor", p.powerFactor);
  return positiveResult("voltageV", w / (i * pf));
}

/** Üç faz fazlar arası gerilim: V_LL = P / (√3·I_L·cosφ) [V] */
export function threePhaseLineVoltageV(params: { activePowerW: number; lineCurrentA: number; powerFactor: number }): number {
  const p = requireObject(params);
  const w = positive("activePowerW", p.activePowerW);
  const i = positive("lineCurrentA", p.lineCurrentA);
  const pf = powerFactor("powerFactor", p.powerFactor);
  return positiveResult("lineVoltageV", w / (SQRT3 * i * pf));
}

/** Faz-nötr gerilim: V_LN = V_LL / √3 [V] (dengeli üç faz) */
export function lineToNeutralVoltageV(params: { lineVoltageV: number }): number {
  const p = requireObject(params);
  return positiveResult("lineToNeutralVoltageV", positive("lineVoltageV", p.lineVoltageV) / SQRT3);
}

/** Fazlar arası gerilim: V_LL = √3·V_LN [V] (dengeli üç faz) */
export function lineToLineVoltageV(params: { lineToNeutralVoltageV: number }): number {
  const p = requireObject(params);
  return positiveResult("lineVoltageV", positive("lineToNeutralVoltageV", p.lineToNeutralVoltageV) * SQRT3);
}
