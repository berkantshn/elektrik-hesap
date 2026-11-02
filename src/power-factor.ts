// Güç üçgeni (P, Q, S, cosφ) ve kompanzasyon kondansatörü hesabı.

import { ElectricalInputError } from "./errors.js";
import type { PowerFactorType, PowerTriangle } from "./types.js";
import {
  finite,
  finiteResult,
  nonNegative,
  positive,
  positiveResult,
  powerFactor,
  powerFactorType,
  requireObject,
  sineFromPowerFactor,
} from "./validate.js";

function typeFromReactive(q: number): PowerTriangle["powerFactorType"] {
  if (q > 0) return "lagging";
  if (q < 0) return "leading";
  return "unity";
}

function angleDeg(p: number, q: number): number {
  return (Math.atan2(q, p) * 180) / Math.PI;
}

/** P ve işaretli Q'dan üçgen: S = √(P² + Q²), cosφ = P/S. P = 0 iken cosφ = 0 döner. */
export function powerTriangleFromPQ(params: { activePowerW: number; reactivePowerVar: number }): PowerTriangle {
  const p = requireObject(params);
  const w = nonNegative("activePowerW", p.activePowerW) + 0; // -0 → 0
  const q = finite("reactivePowerVar", p.reactivePowerVar) + 0;
  if (w === 0 && q === 0) {
    throw new ElectricalInputError(
      "INCONSISTENT_INPUT",
      "activePowerW",
      "P ve Q aynı anda sıfır olamaz; güç katsayısı tanımsız olur",
      "P and Q cannot both be zero; the power factor would be undefined",
    );
  }
  const s = positiveResult("apparentPowerVA", Math.hypot(w, q));
  return {
    activePowerW: w,
    reactivePowerVar: q,
    apparentPowerVA: s,
    powerFactor: Math.min(1, w / s),
    powerFactorType: typeFromReactive(q),
    phaseAngleDeg: angleDeg(w, q),
  };
}

/** P, cosφ ve yük karakterinden üçgen: S = P/cosφ, Q = ±S·sinφ. */
export function powerTriangleFromPAndPF(params: {
  activePowerW: number;
  powerFactor: number;
  powerFactorType: PowerFactorType;
}): PowerTriangle {
  const p = requireObject(params);
  const w = positive("activePowerW", p.activePowerW);
  const pf = powerFactor("powerFactor", p.powerFactor);
  const sign = powerFactorType("powerFactorType", p.powerFactorType) === "lagging" ? 1 : -1;
  const s = positiveResult("apparentPowerVA", w / pf);
  const q = finiteResult("reactivePowerVar", sign * s * sineFromPowerFactor(pf));
  return {
    activePowerW: w,
    reactivePowerVar: q,
    apparentPowerVA: s,
    powerFactor: pf,
    powerFactorType: typeFromReactive(q),
    phaseAngleDeg: angleDeg(w, q),
  };
}

/** S, cosφ ve yük karakterinden üçgen: P = S·cosφ, Q = ±S·sinφ. */
export function powerTriangleFromSAndPF(params: {
  apparentPowerVA: number;
  powerFactor: number;
  powerFactorType: PowerFactorType;
}): PowerTriangle {
  const p = requireObject(params);
  const s = positive("apparentPowerVA", p.apparentPowerVA);
  const pf = powerFactor("powerFactor", p.powerFactor);
  const sign = powerFactorType("powerFactorType", p.powerFactorType) === "lagging" ? 1 : -1;
  const w = positiveResult("activePowerW", s * pf);
  const q = finiteResult("reactivePowerVar", sign * s * sineFromPowerFactor(pf));
  return {
    activePowerW: w,
    reactivePowerVar: q,
    apparentPowerVA: s,
    powerFactor: pf,
    powerFactorType: typeFromReactive(q),
    phaseAngleDeg: angleDeg(w, q),
  };
}

/**
 * Kompanzasyon kondansatör gücü: Qc = P·(tanφ1 − tanφ2) [kVAr].
 * Başlangıç ve hedef cosφ geri (endüktif) kabul edilir; hedef başlangıçtan küçük olamaz.
 */
export function correctionCapacitorKvar(params: {
  activePowerKW: number;
  initialPowerFactor: number;
  targetPowerFactor: number;
}): number {
  const p = requireObject(params);
  const kw = positive("activePowerKW", p.activePowerKW);
  const pf1 = powerFactor("initialPowerFactor", p.initialPowerFactor);
  const pf2 = powerFactor("targetPowerFactor", p.targetPowerFactor);
  if (pf2 < pf1) {
    throw new ElectricalInputError(
      "INCONSISTENT_INPUT",
      "targetPowerFactor",
      `Hedef güç katsayısı (${pf2}) başlangıçtan (${pf1}) küçük olamaz`,
      `The target power factor (${pf2}) cannot be below the initial one (${pf1})`,
    );
  }
  const tan = (pf: number): number => sineFromPowerFactor(pf) / pf;
  return finiteResult("capacitorKvar", kw * (tan(pf1) - tan(pf2)));
}
