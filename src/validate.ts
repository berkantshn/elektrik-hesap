// Girdi doğrulama yardımcıları: hiçbir değer sessizce düzeltilmez veya varsayılmaz.

import { ElectricalInputError } from "./errors.js";
import type { PowerFactorType } from "./types.js";

function shown(value: unknown): string {
  return typeof value === "string" ? `"${value}"` : String(value);
}

/** Parametre nesnesinin gerçekten bir nesne olduğunu doğrular. */
export function requireObject<T>(params: T): T {
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    throw new ElectricalInputError(
      "INVALID_ARGUMENTS",
      "params",
      "Parametreler adlandırılmış alanlara sahip bir nesne olarak verilmeli",
      "Parameters must be given as an object with named fields",
    );
  }
  return params;
}

/** Sonlu sayı: NaN, ±Infinity, metin, undefined ve null reddedilir. */
export function finite(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ElectricalInputError(
      "NOT_A_FINITE_NUMBER",
      name,
      `'${name}' sonlu bir sayı olmalı (verilen: ${shown(value)})`,
      `'${name}' must be a finite number (got: ${shown(value)})`,
    );
  }
  return value;
}

/** Sıfırdan büyük sayı. */
export function positive(name: string, value: unknown): number {
  const v = finite(name, value);
  if (v <= 0) {
    throw new ElectricalInputError(
      "MUST_BE_POSITIVE",
      name,
      `'${name}' sıfırdan büyük olmalı (verilen: ${v})`,
      `'${name}' must be greater than zero (got: ${v})`,
    );
  }
  return v;
}

/** Sıfır veya daha büyük sayı. */
export function nonNegative(name: string, value: unknown): number {
  const v = finite(name, value);
  if (v < 0) {
    throw new ElectricalInputError(
      "MUST_BE_NON_NEGATIVE",
      name,
      `'${name}' negatif olamaz (verilen: ${v})`,
      `'${name}' must not be negative (got: ${v})`,
    );
  }
  return v;
}

/** Güç katsayısı: 0 < cosφ ≤ 1. */
export function powerFactor(name: string, value: unknown): number {
  const v = finite(name, value);
  if (v <= 0 || v > 1) {
    throw new ElectricalInputError(
      "OUT_OF_RANGE",
      name,
      `'${name}' 0'dan büyük ve en fazla 1 olmalı (verilen: ${v})`,
      `'${name}' must be greater than 0 and at most 1 (got: ${v})`,
    );
  }
  return v;
}

/** Yüzde limiti: 0 < değer < 100. */
export function percentLimit(name: string, value: unknown): number {
  const v = finite(name, value);
  if (v <= 0 || v >= 100) {
    throw new ElectricalInputError(
      "OUT_OF_RANGE",
      name,
      `'${name}' 0 ile 100 arasında olmalı, uçlar hariç (verilen: ${v})`,
      `'${name}' must be between 0 and 100, exclusive (got: ${v})`,
    );
  }
  return v;
}

/** Yük karakteri açıkça verilmeli: "lagging" (geri) veya "leading" (ileri). */
export function powerFactorType(name: string, value: unknown): PowerFactorType {
  if (value !== "lagging" && value !== "leading") {
    throw new ElectricalInputError(
      "INVALID_CHOICE",
      name,
      `'${name}' "lagging" (geri/endüktif) veya "leading" (ileri/kapasitif) olmalı (verilen: ${shown(value)})`,
      `'${name}' must be "lagging" or "leading" (got: ${shown(value)})`,
    );
  }
  return value;
}

function rangeError(name: string): ElectricalInputError {
  return new ElectricalInputError(
    "RESULT_OUT_OF_RANGE",
    name,
    `'${name}' sonucu sayısal aralığın dışında kaldı; girdileri kontrol edin`,
    `The result '${name}' fell outside the numeric range; check the inputs`,
  );
}

/** Sonuç sonlu olmalı; taşma sessizce Infinity olarak dönmez. -0 değeri 0'a çevrilir. */
export function finiteResult(name: string, value: number): number {
  if (!Number.isFinite(value)) throw rangeError(name);
  return value === 0 ? 0 : value;
}

/** Sonuç pozitif olmalı; alttan taşma sessizce 0 olarak dönmez. */
export function positiveResult(name: string, value: number): number {
  if (!Number.isFinite(value) || value <= 0) throw rangeError(name);
  return value;
}

/** sinφ = √(1 − cos²φ); (1−c)(1+c) biçimi 1'e yakın değerlerde yuvarlama hatasını azaltır. */
export function sineFromPowerFactor(pf: number): number {
  return Math.sqrt((1 - pf) * (1 + pf));
}
