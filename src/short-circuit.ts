// Basit kısa devre akımı: yalnızca kullanıcının verdiği empedans üzerinden.
// Sonuçlar basitleştirilmiştir: gerilim faktörü, motor katkısı, tepe akımı ve DC bileşen
// hesaba katılmaz. Şalter, koruma veya kesme kapasitesi seçiminde KULLANILMAMALIDIR.

import { ElectricalInputError } from "./errors.js";
import { finite, nonNegative, percentLimit, positive, positiveResult, requireObject } from "./validate.js";

const SQRT3 = Math.sqrt(3);

/** Empedans büyüklüğü: |Z| = √(R² + X²) [Ω]. */
export function impedanceMagnitudeOhm(params: { resistanceOhm: number; reactanceOhm: number }): number {
  const p = requireObject(params);
  const r = nonNegative("resistanceOhm", p.resistanceOhm);
  const x = finite("reactanceOhm", p.reactanceOhm);
  if (r === 0 && x === 0) {
    throw new ElectricalInputError(
      "INCONSISTENT_INPUT",
      "resistanceOhm",
      "R ve X aynı anda sıfır olamaz; kısa devre akımı sonsuza gider",
      "R and X cannot both be zero; the short-circuit current would be infinite",
    );
  }
  return positiveResult("impedanceOhm", Math.hypot(r, x));
}

/** Üç faz dengeli kısa devre: I_k = V_LL / (√3·|Z|); Z faz başına toplam empedanstır. Basitleştirilmiş değerdir; gerilim faktörü, motor katkısı, tepe akımı ve DC bileşen dahil değildir. Şalter veya koruma seçiminde kullanılmamalıdır. */
export function threePhaseShortCircuitCurrentA(params: { lineVoltageV: number; impedancePerPhaseOhm: number }): number {
  const p = requireObject(params);
  const v = positive("lineVoltageV", p.lineVoltageV);
  const z = positive("impedancePerPhaseOhm", p.impedancePerPhaseOhm);
  return positiveResult("shortCircuitCurrentA", v / (SQRT3 * z));
}

/** Faz-nötr çevrim kısa devresi: I_k = V_LN / |Z_çevrim|; Z gidiş-dönüş toplamıdır. Basitleştirilmiş değerdir; gerilim faktörü, motor katkısı, tepe akımı ve DC bileşen dahil değildir. Şalter veya koruma seçiminde kullanılmamalıdır. */
export function singlePhaseShortCircuitCurrentA(params: { lineToNeutralVoltageV: number; loopImpedanceOhm: number }): number {
  const p = requireObject(params);
  const v = positive("lineToNeutralVoltageV", p.lineToNeutralVoltageV);
  const z = positive("loopImpedanceOhm", p.loopImpedanceOhm);
  return positiveResult("shortCircuitCurrentA", v / z);
}

/** Trafo sekonder uçlarında kısa devre (sonsuz güçlü şebeke): I_k = I_n·100/u_k%. Basitleştirilmiş değerdir; gerilim faktörü, motor katkısı, tepe akımı ve DC bileşen dahil değildir. Şalter veya koruma seçiminde kullanılmamalıdır. */
export function transformerShortCircuitCurrentA(params: { ratedCurrentA: number; impedanceVoltagePercent: number }): number {
  const p = requireObject(params);
  const i = positive("ratedCurrentA", p.ratedCurrentA);
  const uk = percentLimit("impedanceVoltagePercent", p.impedanceVoltagePercent);
  return positiveResult("shortCircuitCurrentA", (i * 100) / uk);
}
