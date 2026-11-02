// Çapraz kontroller: formüller birbiriyle ve fiziksel bağıntılarla tutarlı olmalı.

import { describe, expect, it } from "vitest";
import {
  conductorResistanceOhm,
  correctionCapacitorKvar,
  lineToLineVoltageV,
  lineToNeutralVoltageV,
  powerTriangleFromPAndPF,
  powerTriangleFromPQ,
  powerTriangleFromSAndPF,
  resistanceOhmPerKmFromConductivity,
  singlePhaseActivePowerW,
  singlePhaseApparentPowerVA,
  singlePhaseCurrentA,
  singlePhaseMinimumSectionMm2,
  singlePhaseVoltageDropCurrentForm,
  singlePhaseVoltageDropPowerForm,
  singlePhaseVoltageDropResistive,
  singlePhaseVoltageV,
  threePhaseActivePowerW,
  threePhaseApparentPowerVA,
  threePhaseLineCurrentA,
  threePhaseLineVoltageV,
  threePhaseMinimumSectionMm2,
  threePhaseShortCircuitCurrentA,
  threePhaseVoltageDropCurrentForm,
  threePhaseVoltageDropPowerForm,
  threePhaseVoltageDropResistive,
  transformerRatedCurrentThreePhaseA,
  transformerShortCircuitCurrentA,
} from "../src/index.js";

function near(actual: number, expected: number, rel = 1e-10): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(rel * Math.abs(expected) + 1e-12);
}

const powerFactors = [0.1, 0.3, 0.5, 0.6, 0.8, 0.85, 0.95, 0.99, 1];
const voltages = [12, 230, 400, 690, 34500];
const currents = [0.5, 16, 250, 4000];

describe("güç bağıntıları", () => {
  it("P = S·cosφ, bir ve üç faz", () => {
    for (const pf of powerFactors) for (const v of voltages) for (const i of currents) {
      near(singlePhaseActivePowerW({ voltageV: v, currentA: i, powerFactor: pf }), singlePhaseApparentPowerVA({ voltageV: v, currentA: i }) * pf);
      near(threePhaseActivePowerW({ lineVoltageV: v, lineCurrentA: i, powerFactor: pf }), threePhaseApparentPowerVA({ lineVoltageV: v, lineCurrentA: i }) * pf);
    }
  });

  it("üç faz gücü, üç adet faz-nötr gücün toplamıdır", () => {
    for (const pf of powerFactors) for (const v of voltages) for (const i of currents) {
      const onePhase = singlePhaseActivePowerW({ voltageV: lineToNeutralVoltageV({ lineVoltageV: v }), currentA: i, powerFactor: pf });
      near(threePhaseActivePowerW({ lineVoltageV: v, lineCurrentA: i, powerFactor: pf }), 3 * onePhase);
    }
  });

  it("akım ve gerilim gidiş-dönüşü", () => {
    for (const pf of powerFactors) for (const v of voltages) for (const i of currents) {
      const p1 = singlePhaseActivePowerW({ voltageV: v, currentA: i, powerFactor: pf });
      near(singlePhaseCurrentA({ activePowerW: p1, voltageV: v, powerFactor: pf }), i);
      near(singlePhaseVoltageV({ activePowerW: p1, currentA: i, powerFactor: pf }), v);
      const p3 = threePhaseActivePowerW({ lineVoltageV: v, lineCurrentA: i, powerFactor: pf });
      near(threePhaseLineCurrentA({ activePowerW: p3, lineVoltageV: v, powerFactor: pf }), i);
      near(threePhaseLineVoltageV({ activePowerW: p3, lineCurrentA: i, powerFactor: pf }), v);
    }
  });

  it("V_LL ↔ V_LN gidiş-dönüşü ve oranı", () => {
    for (const v of voltages) {
      near(lineToLineVoltageV({ lineToNeutralVoltageV: lineToNeutralVoltageV({ lineVoltageV: v }) }), v);
      near(v / lineToNeutralVoltageV({ lineVoltageV: v }), Math.sqrt(3));
    }
  });
});

describe("güç üçgeni", () => {
  it("S² = P² + Q² her üç kurucu için geçerlidir", () => {
    for (const pf of powerFactors) for (const type of ["lagging", "leading"] as const) {
      for (const t of [powerTriangleFromPAndPF({ activePowerW: 1234, powerFactor: pf, powerFactorType: type }), powerTriangleFromSAndPF({ apparentPowerVA: 5678, powerFactor: pf, powerFactorType: type })]) {
        near(t.apparentPowerVA ** 2, t.activePowerW ** 2 + t.reactivePowerVar ** 2);
        near(Math.cos((t.phaseAngleDeg * Math.PI) / 180), pf);
      }
    }
  });

  it("PQ → S,cosφ → PQ gidiş-dönüşü işareti korur", () => {
    for (const [p, q] of [[3000, 4000], [4000, -3000], [1, 1000], [1000, -1]] as const) {
      const a = powerTriangleFromPQ({ activePowerW: p, reactivePowerVar: q });
      const b = powerTriangleFromSAndPF({ apparentPowerVA: a.apparentPowerVA, powerFactor: a.powerFactor, powerFactorType: q > 0 ? "lagging" : "leading" });
      near(b.activePowerW, p, 1e-9);
      near(b.reactivePowerVar, q, 1e-7);
    }
  });

  it("cosφ = 1 için ileri yük -0 döndürmez ve türü unity olur", () => {
    const t = powerTriangleFromPAndPF({ activePowerW: 10, powerFactor: 1, powerFactorType: "leading" });
    expect(Object.is(t.reactivePowerVar, 0)).toBe(true);
    expect(t.powerFactorType).toBe("unity");
  });

  it("P = 0 için cosφ = 0 ve Q işareti korunur", () => {
    const t = powerTriangleFromPQ({ activePowerW: 0, reactivePowerVar: -50 });
    expect(t.powerFactor).toBe(0);
    expect(t.phaseAngleDeg).toBe(-90);
    expect(t.powerFactorType).toBe("leading");
  });
});

describe("kompanzasyon", () => {
  it("Qc çıkarılınca güç katsayısı hedefe ulaşır", () => {
    for (const [pf1, pf2] of [[0.6, 0.8], [0.7, 0.95], [0.8, 1], [0.5, 0.99]] as const) {
      const kw = 80;
      const qc = correctionCapacitorKvar({ activePowerKW: kw, initialPowerFactor: pf1, targetPowerFactor: pf2 });
      const before = powerTriangleFromPAndPF({ activePowerW: kw, powerFactor: pf1, powerFactorType: "lagging" });
      const after = powerTriangleFromPQ({ activePowerW: kw, reactivePowerVar: before.reactivePowerVar - qc });
      near(after.powerFactor, pf2);
    }
  });

  it("kademeli kompanzasyon toplanabilir", () => {
    const whole = correctionCapacitorKvar({ activePowerKW: 100, initialPowerFactor: 0.6, targetPowerFactor: 0.95 });
    const a = correctionCapacitorKvar({ activePowerKW: 100, initialPowerFactor: 0.6, targetPowerFactor: 0.8 });
    const b = correctionCapacitorKvar({ activePowerKW: 100, initialPowerFactor: 0.8, targetPowerFactor: 0.95 });
    near(whole, a + b);
  });
});

describe("gerilim düşümü", () => {
  it("akım biçimi ile güç biçimi aynı sonucu verir", () => {
    const line = { lengthM: 150, resistanceOhmPerKm: 0.6, reactanceOhmPerKm: 0.09 };
    for (const pf of powerFactors) for (const type of ["lagging", "leading"] as const) {
      const i = 40;
      const v3 = 400;
      const p3 = threePhaseActivePowerW({ lineVoltageV: v3, lineCurrentA: i, powerFactor: pf });
      const t3 = powerTriangleFromPAndPF({ activePowerW: p3, powerFactor: pf, powerFactorType: type });
      near(
        threePhaseVoltageDropCurrentForm({ lineCurrentA: i, powerFactor: pf, powerFactorType: type, nominalLineVoltageV: v3, ...line }).voltageDropV,
        threePhaseVoltageDropPowerForm({ activePowerW: p3, reactivePowerVar: t3.reactivePowerVar, nominalLineVoltageV: v3, ...line }).voltageDropV,
      );
      const v1 = 230;
      const p1 = singlePhaseActivePowerW({ voltageV: v1, currentA: i, powerFactor: pf });
      const t1 = powerTriangleFromPAndPF({ activePowerW: p1, powerFactor: pf, powerFactorType: type });
      near(
        singlePhaseVoltageDropCurrentForm({ currentA: i, powerFactor: pf, powerFactorType: type, nominalVoltageV: v1, ...line }).voltageDropV,
        singlePhaseVoltageDropPowerForm({ activePowerW: p1, reactivePowerVar: t1.reactivePowerVar, nominalVoltageV: v1, ...line }).voltageDropV,
      );
    }
  });

  it("iletkenlikli biçim, X = 0 ve R = 1000/(γA) ile R/X biçimine eşittir", () => {
    const g = 56;
    const a = 16;
    const r = resistanceOhmPerKmFromConductivity({ conductivityMPerOhmMm2: g, sectionMm2: a });
    for (const pf of powerFactors) {
      near(
        threePhaseVoltageDropResistive({ lineCurrentA: 30, powerFactor: pf, lengthM: 80, conductivityMPerOhmMm2: g, sectionMm2: a, nominalLineVoltageV: 400 }).voltageDropV,
        threePhaseVoltageDropCurrentForm({ lineCurrentA: 30, powerFactor: pf, powerFactorType: "lagging", lengthM: 80, resistanceOhmPerKm: r, reactanceOhmPerKm: 0, nominalLineVoltageV: 400 }).voltageDropV,
      );
      near(
        singlePhaseVoltageDropResistive({ currentA: 30, powerFactor: pf, lengthM: 80, conductivityMPerOhmMm2: g, sectionMm2: a, nominalVoltageV: 230 }).voltageDropV,
        singlePhaseVoltageDropCurrentForm({ currentA: 30, powerFactor: pf, powerFactorType: "lagging", lengthM: 80, resistanceOhmPerKm: r, reactanceOhmPerKm: 0, nominalVoltageV: 230 }).voltageDropV,
      );
    }
  });

  it("ders kitabı yüzde formülleriyle uyumludur: üç faz e% = 100·L·P/(γ·A·U²), bir faz e% = 200·L·P/(γ·A·U²)", () => {
    const [l, p, g, a] = [120, 20000, 56, 25];
    const r = resistanceOhmPerKmFromConductivity({ conductivityMPerOhmMm2: g, sectionMm2: a });
    const line = { activePowerW: p, reactivePowerVar: 0, lengthM: l, resistanceOhmPerKm: r, reactanceOhmPerKm: 0 };
    near(threePhaseVoltageDropPowerForm({ ...line, nominalLineVoltageV: 400 }).voltageDropPercent, (100 * l * p) / (g * a * 400 ** 2));
    near(singlePhaseVoltageDropPowerForm({ ...line, nominalVoltageV: 230 }).voltageDropPercent, (200 * l * p) / (g * a * 230 ** 2));
  });

  it("uzunluk ve akımla doğrusal, bir/üç faz oranı 2/√3", () => {
    const base = { lengthM: 100, resistanceOhmPerKm: 0.5, reactanceOhmPerKm: 0.1, powerFactor: 0.8, powerFactorType: "lagging" as const };
    const d1 = threePhaseVoltageDropCurrentForm({ ...base, lineCurrentA: 10, nominalLineVoltageV: 400 }).voltageDropV;
    near(threePhaseVoltageDropCurrentForm({ ...base, lineCurrentA: 20, nominalLineVoltageV: 400 }).voltageDropV, 2 * d1);
    near(threePhaseVoltageDropCurrentForm({ ...base, lengthM: 300, lineCurrentA: 10, nominalLineVoltageV: 400 }).voltageDropV, 3 * d1);
    near(singlePhaseVoltageDropCurrentForm({ ...base, currentA: 10, nominalVoltageV: 400 }).voltageDropV, (2 / Math.sqrt(3)) * d1);
  });

  it("yaklaşım, fazör çözümüne küçük düşümde ikinci mertebe farkla yaklaşır", () => {
    // L = 500 m gidiş-dönüş 1 km olduğundan Z = R + jX [Ω]. Fazör: V_s = V_r + I·Z. Tam düşüm |V_s| − V_r; fark yaklaşık (I·X·cosφ − I·R·sinφ)²/(2·V_r).
    const [vr, i, pf, rOhm, xOhm] = [230, 40, 0.8, 0.2, 0.1];
    const sin = 0.6;
    const re = vr + i * (rOhm * pf + xOhm * sin);
    const im = i * (xOhm * pf - rOhm * sin);
    const exact = Math.hypot(re, im) - vr;
    const approx = singlePhaseVoltageDropCurrentForm({ currentA: i, lengthM: 500, resistanceOhmPerKm: rOhm, reactanceOhmPerKm: xOhm, powerFactor: pf, powerFactorType: "lagging", nominalVoltageV: vr }).voltageDropV;
    expect(approx).toBeCloseTo(i * (rOhm * pf + xOhm * sin), 10);
    near(exact - approx, (im * im) / (2 * vr), 0.05);
  });

  it("5 kat büyük kesit 5 kat küçük düşüm verir", () => {
    const base = { lineCurrentA: 50, powerFactor: 0.9, lengthM: 60, conductivityMPerOhmMm2: 56, nominalLineVoltageV: 400 };
    near(threePhaseVoltageDropResistive({ ...base, sectionMm2: 10 }).voltageDropV, 5 * threePhaseVoltageDropResistive({ ...base, sectionMm2: 50 }).voltageDropV);
  });
});

describe("minimum kesit", () => {
  it("bulunan kesitte düşüm limite eşittir (X = 0)", () => {
    const a = threePhaseMinimumSectionMm2({ lineCurrentA: 63, powerFactor: 0.85, powerFactorType: "lagging", lengthM: 75, conductivityMPerOhmMm2: 56, reactanceOhmPerKm: 0, nominalLineVoltageV: 400, maxVoltageDropPercent: 3 });
    near(threePhaseVoltageDropResistive({ lineCurrentA: 63, powerFactor: 0.85, lengthM: 75, conductivityMPerOhmMm2: 56, sectionMm2: a, nominalLineVoltageV: 400 }).voltageDropPercent, 3);
  });

  for (const type of ["lagging", "leading"] as const) {
    it(`bulunan kesitte düşüm limite eşittir (X > 0, ${type})`, () => {
      const q = { powerFactor: 0.8, powerFactorType: type, lengthM: 120, reactanceOhmPerKm: 0.08 };
      const a1 = singlePhaseMinimumSectionMm2({ ...q, currentA: 25, conductivityMPerOhmMm2: 56, nominalVoltageV: 230, maxVoltageDropPercent: 3 });
      const r1 = resistanceOhmPerKmFromConductivity({ conductivityMPerOhmMm2: 56, sectionMm2: a1 });
      near(singlePhaseVoltageDropCurrentForm({ ...q, currentA: 25, resistanceOhmPerKm: r1, nominalVoltageV: 230 }).voltageDropPercent, 3);
      const a3 = threePhaseMinimumSectionMm2({ ...q, lineCurrentA: 25, conductivityMPerOhmMm2: 35, nominalLineVoltageV: 400, maxVoltageDropPercent: 2 });
      const r3 = resistanceOhmPerKmFromConductivity({ conductivityMPerOhmMm2: 35, sectionMm2: a3 });
      near(threePhaseVoltageDropCurrentForm({ ...q, lineCurrentA: 25, resistanceOhmPerKm: r3, nominalLineVoltageV: 400 }).voltageDropPercent, 2);
    });
  }

  it("endüktif reaktans gereken kesiti büyütür, kapasitif küçültür", () => {
    const base = { lineCurrentA: 100, powerFactor: 0.8, lengthM: 100, conductivityMPerOhmMm2: 56, nominalLineVoltageV: 400, maxVoltageDropPercent: 3 };
    const none = threePhaseMinimumSectionMm2({ ...base, powerFactorType: "lagging", reactanceOhmPerKm: 0 });
    const lag = threePhaseMinimumSectionMm2({ ...base, powerFactorType: "lagging", reactanceOhmPerKm: 0.1 });
    const lead = threePhaseMinimumSectionMm2({ ...base, powerFactorType: "leading", reactanceOhmPerKm: 0.1 });
    expect(lag).toBeGreaterThan(none);
    expect(lead).toBeLessThan(none);
  });
});

describe("iletken direnci", () => {
  it("özdirenç ve iletkenlik biçimleri γ = 1/ρ iken aynıdır", () => {
    const rho = 1 / 56;
    const r = conductorResistanceOhm({ resistivityOhmMm2PerM: rho, referenceTemperatureC: 20, temperatureCoefficientPerC: 0.004, temperatureC: 20, lengthM: 1000, sectionMm2: 16 });
    near(r, resistanceOhmPerKmFromConductivity({ conductivityMPerOhmMm2: 56, sectionMm2: 16 }));
  });

  it("referans noktası değiştirilince aynı direnç bulunur", () => {
    // α70 = α20/(1 + α20·50) ve ρ70 = ρ20·(1 + α20·50) doğrusal modelin eşdeğeri
    const [rho20, a20] = [0.0172, 0.00393];
    const f = 1 + a20 * 50;
    const common = { lengthM: 500, sectionMm2: 35, temperatureC: -5 };
    near(
      conductorResistanceOhm({ resistivityOhmMm2PerM: rho20, referenceTemperatureC: 20, temperatureCoefficientPerC: a20, ...common }),
      conductorResistanceOhm({ resistivityOhmMm2PerM: rho20 * f, referenceTemperatureC: 70, temperatureCoefficientPerC: a20 / f, ...common }),
    );
  });

  it("sıcaklıkla artar; uzunlukla doğru, kesitle ters orantılıdır", () => {
    const base = { resistivityOhmMm2PerM: 0.0172, referenceTemperatureC: 20, temperatureCoefficientPerC: 0.00393, lengthM: 100, sectionMm2: 10 };
    const r20 = conductorResistanceOhm({ ...base, temperatureC: 20 });
    expect(conductorResistanceOhm({ ...base, temperatureC: 90 })).toBeGreaterThan(r20);
    near(conductorResistanceOhm({ ...base, temperatureC: 20, lengthM: 200 }), 2 * r20);
    near(conductorResistanceOhm({ ...base, temperatureC: 20, sectionMm2: 20 }), r20 / 2);
  });
});

describe("trafo ve kısa devre", () => {
  it("I_n ile geri hesaplanan görünür güç anma gücüne eşittir", () => {
    for (const kva of [100, 630, 1600]) {
      const i = transformerRatedCurrentThreePhaseA({ ratedPowerKVA: kva, lineVoltageV: 400 });
      near(threePhaseApparentPowerVA({ lineVoltageV: 400, lineCurrentA: i }), kva * 1000);
    }
  });

  it("I_n·100/u_k%, Z = u_k%/100·V²/S ile bulunan akıma eşittir", () => {
    const [kva, v, uk] = [1000, 400, 6];
    const i = transformerRatedCurrentThreePhaseA({ ratedPowerKVA: kva, lineVoltageV: v });
    const z = ((uk / 100) * v * v) / (kva * 1000);
    near(transformerShortCircuitCurrentA({ ratedCurrentA: i, impedanceVoltagePercent: uk }), threePhaseShortCircuitCurrentA({ lineVoltageV: v, impedancePerPhaseOhm: z }));
  });
});
