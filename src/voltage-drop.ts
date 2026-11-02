// Gerilim düşümü: akım biçimi, güç biçimi ve dirençli (iletkenlikli) biçim.
// Tümü küçük düşüm yaklaşımıdır: ΔV ≈ k·I·L·(R·cosφ ± X·sinφ); kaynak ile yük gerilimi
// arasındaki açı farkı ihmal edilir. L tek yön hat uzunluğudur.

import { ElectricalInputError } from "./errors.js";
import type { PowerFactorType, VoltageDropResult, VoltageDropWarning } from "./types.js";
import {
  finite,
  finiteResult,
  nonNegative,
  percentLimit,
  positive,
  positiveResult,
  powerFactor,
  powerFactorType,
  requireObject,
  sineFromPowerFactor,
} from "./validate.js";

// Bir fazda gidiş-dönüş iki iletken, dengeli üç fazda √3 çarpanı.
const SINGLE_PHASE_FACTOR = 2;
const THREE_PHASE_FACTOR = Math.sqrt(3);

/** |e%| bu değeri aşarsa (eşitlik hariç) sonuçla birlikte yaklaşım uyarısı döner. */
export const LARGE_DROP_WARNING_PERCENT = 10;

function buildResult(dropV: number, nominalV: number): VoltageDropResult {
  const voltageDropV = finiteResult("voltageDropV", dropV);
  const voltageDropPercent = finiteResult("voltageDropPercent", (100 * voltageDropV) / nominalV);
  // Düşüm anma gerilimine ulaşıyorsa yaklaşım fiziksel anlamını yitirmiştir.
  if (Math.abs(voltageDropPercent) >= 100) {
    throw new ElectricalInputError(
      "RESULT_OUT_OF_RANGE",
      "voltageDropPercent",
      `Hesaplanan düşüm (%${voltageDropPercent}) anma gerilimine ulaşıyor; yaklaşık formül bu durumda geçersiz, girdileri kontrol edin`,
      `The computed drop (${voltageDropPercent}%) reaches the nominal voltage; the approximate formula is invalid here, check the inputs`,
    );
  }
  const magnitude = Math.abs(voltageDropPercent);
  const warnings: VoltageDropWarning[] =
    magnitude > LARGE_DROP_WARNING_PERCENT
      ? [
          {
            code: "LARGE_DROP_APPROXIMATION",
            messageTr: `GERİLİM DÜŞÜMÜ UYARISI: |e| = %${magnitude}, %10 sınırını aşıyor; küçük düşüm yaklaşımı zayıflar, sonuç güvenilir olmayabilir.`,
            messageEn: `VOLTAGE DROP WARNING: |e| = ${magnitude}% exceeds the 10% limit; the small-drop approximation weakens and the result may be unreliable.`,
          },
        ]
      : [];
  return { voltageDropV, voltageDropPercent, warnings };
}

function currentForm(
  factor: number,
  currentA: number,
  lengthM: number,
  rOhmPerKm: number,
  xOhmPerKm: number,
  pf: number,
  type: PowerFactorType,
): number {
  const sign = type === "lagging" ? 1 : -1;
  return factor * currentA * (lengthM / 1000) * (rOhmPerKm * pf + sign * xOhmPerKm * sineFromPowerFactor(pf));
}

/** Bir faz, akım biçimi: ΔV ≈ 2·I·L·(R·cosφ ± X·sinφ); geri için +, ileri için −. */
export function singlePhaseVoltageDropCurrentForm(params: {
  currentA: number;
  lengthM: number;
  resistanceOhmPerKm: number;
  reactanceOhmPerKm: number;
  powerFactor: number;
  powerFactorType: PowerFactorType;
  nominalVoltageV: number;
}): VoltageDropResult {
  const p = requireObject(params);
  const i = positive("currentA", p.currentA);
  const l = positive("lengthM", p.lengthM);
  const r = positive("resistanceOhmPerKm", p.resistanceOhmPerKm);
  const x = nonNegative("reactanceOhmPerKm", p.reactanceOhmPerKm);
  const pf = powerFactor("powerFactor", p.powerFactor);
  const type = powerFactorType("powerFactorType", p.powerFactorType);
  const v = positive("nominalVoltageV", p.nominalVoltageV);
  return buildResult(currentForm(SINGLE_PHASE_FACTOR, i, l, r, x, pf, type), v);
}

/** Üç faz, akım biçimi: ΔV_LL ≈ √3·I_L·L·(R·cosφ ± X·sinφ); geri için +, ileri için −. */
export function threePhaseVoltageDropCurrentForm(params: {
  lineCurrentA: number;
  lengthM: number;
  resistanceOhmPerKm: number;
  reactanceOhmPerKm: number;
  powerFactor: number;
  powerFactorType: PowerFactorType;
  nominalLineVoltageV: number;
}): VoltageDropResult {
  const p = requireObject(params);
  const i = positive("lineCurrentA", p.lineCurrentA);
  const l = positive("lengthM", p.lengthM);
  const r = positive("resistanceOhmPerKm", p.resistanceOhmPerKm);
  const x = nonNegative("reactanceOhmPerKm", p.reactanceOhmPerKm);
  const pf = powerFactor("powerFactor", p.powerFactor);
  const type = powerFactorType("powerFactorType", p.powerFactorType);
  const v = positive("nominalLineVoltageV", p.nominalLineVoltageV);
  return buildResult(currentForm(THREE_PHASE_FACTOR, i, l, r, x, pf, type), v);
}

/** Bir faz, güç biçimi: ΔV ≈ 2·L·(R·P + X·Q)/V; Q işaretlidir (geri +, ileri −). */
export function singlePhaseVoltageDropPowerForm(params: {
  activePowerW: number;
  reactivePowerVar: number;
  lengthM: number;
  resistanceOhmPerKm: number;
  reactanceOhmPerKm: number;
  nominalVoltageV: number;
}): VoltageDropResult {
  const p = requireObject(params);
  const w = positive("activePowerW", p.activePowerW);
  const q = finite("reactivePowerVar", p.reactivePowerVar);
  const l = positive("lengthM", p.lengthM);
  const r = positive("resistanceOhmPerKm", p.resistanceOhmPerKm);
  const x = nonNegative("reactanceOhmPerKm", p.reactanceOhmPerKm);
  const v = positive("nominalVoltageV", p.nominalVoltageV);
  return buildResult((SINGLE_PHASE_FACTOR * (l / 1000) * (r * w + x * q)) / v, v);
}

/** Üç faz, güç biçimi: ΔV_LL ≈ L·(R·P + X·Q)/V_LL; P ve Q toplam üç faz değeridir. */
export function threePhaseVoltageDropPowerForm(params: {
  activePowerW: number;
  reactivePowerVar: number;
  lengthM: number;
  resistanceOhmPerKm: number;
  reactanceOhmPerKm: number;
  nominalLineVoltageV: number;
}): VoltageDropResult {
  const p = requireObject(params);
  const w = positive("activePowerW", p.activePowerW);
  const q = finite("reactivePowerVar", p.reactivePowerVar);
  const l = positive("lengthM", p.lengthM);
  const r = positive("resistanceOhmPerKm", p.resistanceOhmPerKm);
  const x = nonNegative("reactanceOhmPerKm", p.reactanceOhmPerKm);
  const v = positive("nominalLineVoltageV", p.nominalLineVoltageV);
  return buildResult(((l / 1000) * (r * w + x * q)) / v, v);
}

/** Bir faz, dirençli: ΔV = 2·L·I·cosφ/(γ·A); reaktans ihmal edilir. */
export function singlePhaseVoltageDropResistive(params: {
  currentA: number;
  powerFactor: number;
  lengthM: number;
  conductivityMPerOhmMm2: number;
  sectionMm2: number;
  nominalVoltageV: number;
}): VoltageDropResult {
  const p = requireObject(params);
  const i = positive("currentA", p.currentA);
  const pf = powerFactor("powerFactor", p.powerFactor);
  const l = positive("lengthM", p.lengthM);
  const g = positive("conductivityMPerOhmMm2", p.conductivityMPerOhmMm2);
  const a = positive("sectionMm2", p.sectionMm2);
  const v = positive("nominalVoltageV", p.nominalVoltageV);
  return buildResult((SINGLE_PHASE_FACTOR * l * i * pf) / (g * a), v);
}

/** Üç faz, dirençli: ΔV_LL = √3·L·I_L·cosφ/(γ·A); reaktans ihmal edilir. */
export function threePhaseVoltageDropResistive(params: {
  lineCurrentA: number;
  powerFactor: number;
  lengthM: number;
  conductivityMPerOhmMm2: number;
  sectionMm2: number;
  nominalLineVoltageV: number;
}): VoltageDropResult {
  const p = requireObject(params);
  const i = positive("lineCurrentA", p.lineCurrentA);
  const pf = powerFactor("powerFactor", p.powerFactor);
  const l = positive("lengthM", p.lengthM);
  const g = positive("conductivityMPerOhmMm2", p.conductivityMPerOhmMm2);
  const a = positive("sectionMm2", p.sectionMm2);
  const v = positive("nominalLineVoltageV", p.nominalLineVoltageV);
  return buildResult((THREE_PHASE_FACTOR * l * i * pf) / (g * a), v);
}

function minimumSection(
  factor: number,
  i: number,
  pf: number,
  type: PowerFactorType,
  l: number,
  g: number,
  x: number,
  v: number,
  limitPercent: number,
): number {
  const sign = type === "lagging" ? 1 : -1;
  const allowedDropV = (limitPercent / 100) * v;
  // İzin verilen düşümden izin verilen birim direnç bulunur: R' = (ΔV/(k·I·L) ∓ X·sinφ)/cosφ
  const allowedSum = (allowedDropV * 1000) / (factor * i * l);
  const maxROhmPerKm = (allowedSum - sign * x * sineFromPowerFactor(pf)) / pf;
  if (!(maxROhmPerKm > 0)) {
    throw new ElectricalInputError(
      "DROP_LIMIT_UNREACHABLE",
      "maxVoltageDropPercent",
      "Reaktans bileşeni tek başına izin verilen düşümü aşıyor; kesit artırmak bu limiti sağlamaz",
      "The reactance term alone exceeds the allowed drop; increasing the section cannot meet this limit",
    );
  }
  return positiveResult("sectionMm2", 1000 / (g * maxROhmPerKm));
}

/**
 * Bir faz minimum kesit [mm²]; yalnızca gerilim düşümü limitine göre teorik alt sınırdır.
 * Akım taşıma kapasitesi ve standart kesit kontrolü YAPILMAZ.
 * Reaktans yoksa reactanceOhmPerKm açıkça 0 verilir.
 */
export function singlePhaseMinimumSectionMm2(params: {
  currentA: number;
  powerFactor: number;
  powerFactorType: PowerFactorType;
  lengthM: number;
  conductivityMPerOhmMm2: number;
  reactanceOhmPerKm: number;
  nominalVoltageV: number;
  maxVoltageDropPercent: number;
}): number {
  const p = requireObject(params);
  return minimumSection(
    SINGLE_PHASE_FACTOR,
    positive("currentA", p.currentA),
    powerFactor("powerFactor", p.powerFactor),
    powerFactorType("powerFactorType", p.powerFactorType),
    positive("lengthM", p.lengthM),
    positive("conductivityMPerOhmMm2", p.conductivityMPerOhmMm2),
    nonNegative("reactanceOhmPerKm", p.reactanceOhmPerKm),
    positive("nominalVoltageV", p.nominalVoltageV),
    percentLimit("maxVoltageDropPercent", p.maxVoltageDropPercent),
  );
}

/**
 * Üç faz minimum kesit [mm²]; yalnızca gerilim düşümü limitine göre teorik alt sınırdır.
 * Akım taşıma kapasitesi ve standart kesit kontrolü YAPILMAZ.
 * Reaktans yoksa reactanceOhmPerKm açıkça 0 verilir.
 */
export function threePhaseMinimumSectionMm2(params: {
  lineCurrentA: number;
  powerFactor: number;
  powerFactorType: PowerFactorType;
  lengthM: number;
  conductivityMPerOhmMm2: number;
  reactanceOhmPerKm: number;
  nominalLineVoltageV: number;
  maxVoltageDropPercent: number;
}): number {
  const p = requireObject(params);
  return minimumSection(
    THREE_PHASE_FACTOR,
    positive("lineCurrentA", p.lineCurrentA),
    powerFactor("powerFactor", p.powerFactor),
    powerFactorType("powerFactorType", p.powerFactorType),
    positive("lengthM", p.lengthM),
    positive("conductivityMPerOhmMm2", p.conductivityMPerOhmMm2),
    nonNegative("reactanceOhmPerKm", p.reactanceOhmPerKm),
    positive("nominalLineVoltageV", p.nominalLineVoltageV),
    percentLimit("maxVoltageDropPercent", p.maxVoltageDropPercent),
  );
}
