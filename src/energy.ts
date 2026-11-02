// Enerji ve enerji maliyeti. Vergi, kademeli tarife ve güç bedelleri dahil değildir.

import { positive, positiveResult, requireObject } from "./validate.js";

/** Enerji: E = P·t/1000 [kWh]; güç süre boyunca sabit kabul edilir. */
export function energyKWh(params: { activePowerW: number; durationH: number }): number {
  const p = requireObject(params);
  const w = positive("activePowerW", p.activePowerW);
  const h = positive("durationH", p.durationH);
  return positiveResult("energyKWh", (w * h) / 1000);
}

/** Maliyet = E·birim fiyat; para birimi birim fiyatınkiyle aynıdır. */
export function energyCost(params: { energyKWh: number; unitPricePerKWh: number }): number {
  const p = requireObject(params);
  const e = positive("energyKWh", p.energyKWh);
  const price = positive("unitPricePerKWh", p.unitPricePerKWh);
  return positiveResult("cost", e * price);
}
