// İletken direnci: özdirenç, kesit ve sıcaklığa göre. Malzeme değerleri kullanıcıdan alınır.

import { ElectricalInputError } from "./errors.js";
import { finite, positive, positiveResult, requireObject } from "./validate.js";

const ABSOLUTE_ZERO_C = -273.15;

function temperature(name: string, value: unknown): number {
  const t = finite(name, value);
  if (t < ABSOLUTE_ZERO_C) {
    throw new ElectricalInputError(
      "OUT_OF_RANGE",
      name,
      `'${name}' mutlak sıfırın (−273,15 °C) altında olamaz (verilen: ${t})`,
      `'${name}' cannot be below absolute zero (−273.15 °C) (got: ${t})`,
    );
  }
  return t;
}

/**
 * Doğrusal sıcaklık modeliyle direnç: R = ρ_ref·(1 + α·(T − T_ref))·L/A [Ω].
 * ρ, T_ref ve α aynı malzeme ve referans için kullanıcıdan alınır; varsayılan malzeme yoktur.
 */
export function conductorResistanceOhm(params: {
  resistivityOhmMm2PerM: number;
  referenceTemperatureC: number;
  temperatureCoefficientPerC: number;
  temperatureC: number;
  lengthM: number;
  sectionMm2: number;
}): number {
  const p = requireObject(params);
  const rho = positive("resistivityOhmMm2PerM", p.resistivityOhmMm2PerM);
  const tRef = temperature("referenceTemperatureC", p.referenceTemperatureC);
  const alpha = finite("temperatureCoefficientPerC", p.temperatureCoefficientPerC);
  const t = temperature("temperatureC", p.temperatureC);
  const l = positive("lengthM", p.lengthM);
  const a = positive("sectionMm2", p.sectionMm2);
  const factor = 1 + alpha * (t - tRef);
  // Doğrusal model bu noktada fiziksel anlamını yitirir (negatif veya sıfır direnç).
  if (factor <= 0) {
    throw new ElectricalInputError(
      "INCONSISTENT_INPUT",
      "temperatureC",
      `Doğrusal sıcaklık modeli bu girdilerde sıfır veya negatif direnç veriyor (1 + α·ΔT = ${factor})`,
      `The linear temperature model gives zero or negative resistance for these inputs (1 + α·ΔT = ${factor})`,
    );
  }
  return positiveResult("resistanceOhm", (rho * factor * l) / a);
}

/** İletkenlikten birim direnç: R' = 1000/(γ·A) [Ω/km]. */
export function resistanceOhmPerKmFromConductivity(params: { conductivityMPerOhmMm2: number; sectionMm2: number }): number {
  const p = requireObject(params);
  const g = positive("conductivityMPerOhmMm2", p.conductivityMPerOhmMm2);
  const a = positive("sectionMm2", p.sectionMm2);
  return positiveResult("resistanceOhmPerKm", 1000 / (g * a));
}
