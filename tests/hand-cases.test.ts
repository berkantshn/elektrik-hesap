// Elle türetilmiş değer testleri. Beklenen değerler kod çalıştırılarak değil, her satırın
// üstündeki yorumdaki aritmetikle yazılmıştır (√3 ≈ 1,7320508 alınmıştır).
// BİÇİM KURALI: verify/verify_independent.py bu dosyadaki `hand(...)` satırlarını okur;
// her çağrı tek satırda kalmalı ve girdi/beklenen değer JSON benzeri olmalıdır.

import { describe, expect, it } from "vitest";
import * as api from "../src/index.js";

const functions = api as unknown as Record<string, (input: unknown) => unknown>;

// Elle hesap 6-7 anlamlı basamakla yazıldığı için göreli tolerans 1e-5'tir.
const REL_TOL = 1e-5;
const ABS_TOL = 1e-9;

function close(actual: unknown, expected: number, label: string): void {
  expect(typeof actual, label).toBe("number");
  const error = Math.abs((actual as number) - expected);
  expect(error, `${label}: bulunan ${String(actual)}, beklenen ${expected}`).toBeLessThanOrEqual(REL_TOL * Math.abs(expected) + ABS_TOL);
}

function hand(id: string, fn: string, input: object, expected: number | Record<string, number | string>): void {
  it(`${id} ${fn}`, () => {
    const f = functions[fn];
    if (!f) throw new Error(`fonksiyon yok: ${fn}`);
    const actual = f(input);
    if (typeof expected === "number") {
      close(actual, expected, id);
      return;
    }
    for (const [key, value] of Object.entries(expected)) {
      const field = (actual as Record<string, unknown>)[key];
      if (typeof value === "number") close(field, value, `${id}.${key}`);
      else expect(field, `${id}.${key}`).toBe(value);
    }
  });
}

describe("bir faz aktif güç: P = V·I·cosφ", () => {
  // 230·10·1 = 2300 W
  hand("P01", "singlePhaseActivePowerW", { voltageV: 230, currentA: 10, powerFactor: 1 }, 2300);
  // 230·10·0,8 = 1840 W
  hand("P02", "singlePhaseActivePowerW", { voltageV: 230, currentA: 10, powerFactor: 0.8 }, 1840);
  // 120·5·0,5 = 300 W
  hand("P03", "singlePhaseActivePowerW", { voltageV: 120, currentA: 5, powerFactor: 0.5 }, 300);
  // 1·1·1 = 1 W
  hand("P04", "singlePhaseActivePowerW", { voltageV: 1, currentA: 1, powerFactor: 1 }, 1);
  // Küçük akım: 230·0,001·0,9 = 0,207 W
  hand("P05", "singlePhaseActivePowerW", { voltageV: 230, currentA: 0.001, powerFactor: 0.9 }, 0.207);
});

describe("üç faz aktif güç: P = √3·V·I·cosφ", () => {
  // 1,7320508·400·10 = 6928,203 W
  hand("T01", "threePhaseActivePowerW", { lineVoltageV: 400, lineCurrentA: 10, powerFactor: 1 }, 6928.203);
  // 6928,203·0,8 = 5542,563 W
  hand("T02", "threePhaseActivePowerW", { lineVoltageV: 400, lineCurrentA: 10, powerFactor: 0.8 }, 5542.563);
  // 1,7320508·380 = 658,1793; ·100 = 65817,93; ·0,85 = 55945,24 W
  hand("T03", "threePhaseActivePowerW", { lineVoltageV: 380, lineCurrentA: 100, powerFactor: 0.85 }, 55945.24);
  // 17320,508·50 = 866025,4; ·0,9 = 779422,9 W
  hand("T04", "threePhaseActivePowerW", { lineVoltageV: 10000, lineCurrentA: 50, powerFactor: 0.9 }, 779422.9);
  // 1732,0508·690 = 1195115 W
  hand("T05", "threePhaseActivePowerW", { lineVoltageV: 690, lineCurrentA: 1000, powerFactor: 1 }, 1195115);
});

describe("görünür güç", () => {
  // 230·16 = 3680 VA
  hand("A01", "singlePhaseApparentPowerVA", { voltageV: 230, currentA: 16 }, 3680);
  // 1,7320508·400·10 = 6928,203 VA
  hand("A02", "threePhaseApparentPowerVA", { lineVoltageV: 400, lineCurrentA: 10 }, 6928.203);
  // 1,7320508·1000·1 = 1732,0508 VA
  hand("A03", "threePhaseApparentPowerVA", { lineVoltageV: 1000, lineCurrentA: 1 }, 1732.0508);
});

describe("akım", () => {
  // 2300/(230·1) = 10 A
  hand("C01", "singlePhaseCurrentA", { activePowerW: 2300, voltageV: 230, powerFactor: 1 }, 10);
  // 1840/(230·0,8) = 1840/184 = 10 A
  hand("C02", "singlePhaseCurrentA", { activePowerW: 1840, voltageV: 230, powerFactor: 0.8 }, 10);
  // 1000/(230·0,9) = 1000/207 = 4,830918 A
  hand("C03", "singlePhaseCurrentA", { activePowerW: 1000, voltageV: 230, powerFactor: 0.9 }, 4.830918);
  // √3·400·0,85 = 588,8973; 15000/588,8973 = 25,4713 A
  hand("C04", "threePhaseLineCurrentA", { activePowerW: 15000, lineVoltageV: 400, powerFactor: 0.85 }, 25.4713);
  // 6928,203/(√3·400) = 10 A
  hand("C05", "threePhaseLineCurrentA", { activePowerW: 6928.203, lineVoltageV: 400, powerFactor: 1 }, 10);
  // √3·400·0,8 = 554,2563; 75000/554,2563 = 135,3165 A
  hand("C06", "threePhaseLineCurrentA", { activePowerW: 75000, lineVoltageV: 400, powerFactor: 0.8 }, 135.3165);
});

describe("gerilim", () => {
  // 2300/(10·1) = 230 V
  hand("V01", "singlePhaseVoltageV", { activePowerW: 2300, currentA: 10, powerFactor: 1 }, 230);
  // 1840/(10·0,8) = 230 V
  hand("V02", "singlePhaseVoltageV", { activePowerW: 1840, currentA: 10, powerFactor: 0.8 }, 230);
  // 5542,563/(√3·10·0,8) = 5542,563/13,85641 = 400 V
  hand("V03", "threePhaseLineVoltageV", { activePowerW: 5542.563, lineCurrentA: 10, powerFactor: 0.8 }, 400);
  // 17320,508/(√3·25) = 17320,508/43,30127 = 400 V
  hand("V04", "threePhaseLineVoltageV", { activePowerW: 17320.508, lineCurrentA: 25, powerFactor: 1 }, 400);
  // 400/1,7320508 = 230,9401 V
  hand("L01", "lineToNeutralVoltageV", { lineVoltageV: 400 }, 230.9401);
  // 34500/1,7320508 = 19918,58 V
  hand("L02", "lineToNeutralVoltageV", { lineVoltageV: 34500 }, 19918.58);
  // 230·1,7320508 = 398,3717 V
  hand("L03", "lineToLineVoltageV", { lineToNeutralVoltageV: 230 }, 398.3717);
  // 127·1,7320508 = 219,9705 V
  hand("L04", "lineToLineVoltageV", { lineToNeutralVoltageV: 127 }, 219.9705);
});

describe("güç üçgeni", () => {
  // 3-4-5 üçgeni: S = 5000, cosφ = 3000/5000 = 0,6, φ = atan(4/3) = 53,1301°
  hand("G01", "powerTriangleFromPQ", { activePowerW: 3000, reactivePowerVar: 4000 }, { apparentPowerVA: 5000, powerFactor: 0.6, phaseAngleDeg: 53.1301, powerFactorType: "lagging" });
  // Q < 0: S = 5000, cosφ = 0,8, φ = −atan(3/4) = −36,8699°
  hand("G02", "powerTriangleFromPQ", { activePowerW: 4000, reactivePowerVar: -3000 }, { apparentPowerVA: 5000, powerFactor: 0.8, phaseAngleDeg: -36.8699, powerFactorType: "leading" });
  // Q = 0: S = P, cosφ = 1, φ = 0
  hand("G03", "powerTriangleFromPQ", { activePowerW: 5000, reactivePowerVar: 0 }, { apparentPowerVA: 5000, powerFactor: 1, phaseAngleDeg: 0, powerFactorType: "unity" });
  // Saf reaktif: P = 0, S = 1000, cosφ = 0, φ = 90°
  hand("G04", "powerTriangleFromPQ", { activePowerW: 0, reactivePowerVar: 1000 }, { apparentPowerVA: 1000, powerFactor: 0, phaseAngleDeg: 90, powerFactorType: "lagging" });
  // 5-12-13 üçgeni: cosφ = 5/13 = 0,384615, φ = atan(12/5) = 67,3801°
  hand("G05", "powerTriangleFromPQ", { activePowerW: 5, reactivePowerVar: 12 }, { apparentPowerVA: 13, powerFactor: 0.384615, phaseAngleDeg: 67.3801, powerFactorType: "lagging" });
  // S = 8000/0,8 = 10000; sinφ = 0,6; Q = 6000
  hand("G06", "powerTriangleFromPAndPF", { activePowerW: 8000, powerFactor: 0.8, powerFactorType: "lagging" }, { apparentPowerVA: 10000, reactivePowerVar: 6000, phaseAngleDeg: 36.8699, powerFactorType: "lagging" });
  // Aynı yük ileri: Q = −6000
  hand("G07", "powerTriangleFromPAndPF", { activePowerW: 8000, powerFactor: 0.8, powerFactorType: "leading" }, { apparentPowerVA: 10000, reactivePowerVar: -6000, phaseAngleDeg: -36.8699, powerFactorType: "leading" });
  // cosφ = 1: S = P, Q = 0
  hand("G08", "powerTriangleFromPAndPF", { activePowerW: 1000, powerFactor: 1, powerFactorType: "lagging" }, { apparentPowerVA: 1000, reactivePowerVar: 0, phaseAngleDeg: 0, powerFactorType: "unity" });
  // P = 10000·0,6 = 6000; sinφ = 0,8; Q = 8000; φ = 53,1301°
  hand("G09", "powerTriangleFromSAndPF", { apparentPowerVA: 10000, powerFactor: 0.6, powerFactorType: "lagging" }, { activePowerW: 6000, reactivePowerVar: 8000, phaseAngleDeg: 53.1301 });
  // P = 5000·0,8 = 4000; Q = −5000·0,6 = −3000
  hand("G10", "powerTriangleFromSAndPF", { apparentPowerVA: 5000, powerFactor: 0.8, powerFactorType: "leading" }, { activePowerW: 4000, reactivePowerVar: -3000, phaseAngleDeg: -36.8699 });
  // 7-24-25 üçgeni: P = 2500·0,28 = 700; sinφ = 0,96; Q = 2400; φ = atan(24/7) = 73,7398°
  hand("G11", "powerTriangleFromSAndPF", { apparentPowerVA: 2500, powerFactor: 0.28, powerFactorType: "lagging" }, { activePowerW: 700, reactivePowerVar: 2400, phaseAngleDeg: 73.7398 });
});

describe("kompanzasyon: Qc = P·(tanφ1 − tanφ2)", () => {
  // tanφ1 = 0,6/0,8 = 0,75; tanφ2 = 0; 100·0,75 = 75 kVAr
  hand("Q01", "correctionCapacitorKvar", { activePowerKW: 100, initialPowerFactor: 0.8, targetPowerFactor: 1 }, 75);
  // tan = 0,8/0,6 = 1,333333 ve 0,75; 100·0,583333 = 58,3333 kVAr
  hand("Q02", "correctionCapacitorKvar", { activePowerKW: 100, initialPowerFactor: 0.6, targetPowerFactor: 0.8 }, 58.3333);
  // tanφ2 = √0,0975/0,95 = 0,3122499/0,95 = 0,3286842; 0,75 − 0,3286842 = 0,4213158; ·100 = 42,13158
  hand("Q03", "correctionCapacitorKvar", { activePowerKW: 100, initialPowerFactor: 0.8, targetPowerFactor: 0.95 }, 42.13158);
  // tan = √0,51/0,7 = 1,0202041 ve √0,19/0,9 = 0,4843221; fark 0,5358820; ·50 = 26,7941
  hand("Q04", "correctionCapacitorKvar", { activePowerKW: 50, initialPowerFactor: 0.7, targetPowerFactor: 0.9 }, 26.7941);
  // Başlangıç = hedef: 0 kVAr
  hand("Q05", "correctionCapacitorKvar", { activePowerKW: 250, initialPowerFactor: 0.9, targetPowerFactor: 0.9 }, 0);
  // tan(60°) = √3: 1·1,7320508 kVAr
  hand("Q06", "correctionCapacitorKvar", { activePowerKW: 1, initialPowerFactor: 0.5, targetPowerFactor: 1 }, 1.7320508);
});

describe("gerilim düşümü, akım biçimi", () => {
  // 2·10·0,1 km·(1·1) = 2 V; 2/230 = %0,869565
  hand("D01", "singlePhaseVoltageDropCurrentForm", { currentA: 10, lengthM: 100, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0, powerFactor: 1, powerFactorType: "lagging", nominalVoltageV: 230 }, { voltageDropV: 2, voltageDropPercent: 0.869565 });
  // 2·20·0,05·(2·0,8 + 0,1·0,6) = 2·1,66 = 3,32 V; 3,32/230 = %1,443478
  hand("D02", "singlePhaseVoltageDropCurrentForm", { currentA: 20, lengthM: 50, resistanceOhmPerKm: 2, reactanceOhmPerKm: 0.1, powerFactor: 0.8, powerFactorType: "lagging", nominalVoltageV: 230 }, { voltageDropV: 3.32, voltageDropPercent: 1.443478 });
  // İleri: 2·(1,6 − 0,06) = 3,08 V; 3,08/230 = %1,339130
  hand("D03", "singlePhaseVoltageDropCurrentForm", { currentA: 20, lengthM: 50, resistanceOhmPerKm: 2, reactanceOhmPerKm: 0.1, powerFactor: 0.8, powerFactorType: "leading", nominalVoltageV: 230 }, { voltageDropV: 3.08, voltageDropPercent: 1.33913 });
  // Gerilim yükselmesi: 2·100·1·(0,1·0,6 − 0,4·0,8) = 200·(−0,26) = −52 V; −52/400 = %−13
  hand("D04", "singlePhaseVoltageDropCurrentForm", { currentA: 100, lengthM: 1000, resistanceOhmPerKm: 0.1, reactanceOhmPerKm: 0.4, powerFactor: 0.6, powerFactorType: "leading", nominalVoltageV: 400 }, { voltageDropV: -52, voltageDropPercent: -13 });
  // sinφ = √0,2775 = 0,5267827; 0,425 + 0,0421426 = 0,4671426; √3·100·0,2 = 34,64102; çarpım 16,1823 V; /400 = %4,04557
  hand("D05", "threePhaseVoltageDropCurrentForm", { lineCurrentA: 100, lengthM: 200, resistanceOhmPerKm: 0.5, reactanceOhmPerKm: 0.08, powerFactor: 0.85, powerFactorType: "lagging", nominalLineVoltageV: 400 }, { voltageDropV: 16.1823, voltageDropPercent: 4.04557 });
  // √3·10·1·1 = 17,32051 V; /400 = %4,330127
  hand("D06", "threePhaseVoltageDropCurrentForm", { lineCurrentA: 10, lengthM: 1000, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0, powerFactor: 1, powerFactorType: "lagging", nominalLineVoltageV: 400 }, { voltageDropV: 17.32051, voltageDropPercent: 4.330127 });
  // 0,4·0,6 + 0,3·0,8 = 0,48; √3·50·0,1 = 8,660254; çarpım 4,156922 V; /400 = %1,03923
  hand("D07", "threePhaseVoltageDropCurrentForm", { lineCurrentA: 50, lengthM: 100, resistanceOhmPerKm: 0.4, reactanceOhmPerKm: 0.3, powerFactor: 0.6, powerFactorType: "lagging", nominalLineVoltageV: 400 }, { voltageDropV: 4.156922, voltageDropPercent: 1.03923 });
  // Sınır durumu: 0,4·0,6 − 0,3·0,8 = 0, düşüm sıfır
  hand("D08", "threePhaseVoltageDropCurrentForm", { lineCurrentA: 50, lengthM: 100, resistanceOhmPerKm: 0.4, reactanceOhmPerKm: 0.3, powerFactor: 0.6, powerFactorType: "leading", nominalLineVoltageV: 400 }, { voltageDropV: 0, voltageDropPercent: 0 });
});

describe("gerilim düşümü, güç biçimi", () => {
  // 2·0,1·(1·2000)/230 = 400/230 = 1,739130 V; /230 = %0,756144
  hand("D09", "singlePhaseVoltageDropPowerForm", { activePowerW: 2000, reactivePowerVar: 0, lengthM: 100, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0, nominalVoltageV: 230 }, { voltageDropV: 1.73913, voltageDropPercent: 0.756144 });
  // 2·0,05·(2·1840 + 0,1·1380)/230 = 0,1·3818/230 = 1,66 V; /230 = %0,721739
  hand("D10", "singlePhaseVoltageDropPowerForm", { activePowerW: 1840, reactivePowerVar: 1380, lengthM: 50, resistanceOhmPerKm: 2, reactanceOhmPerKm: 0.1, nominalVoltageV: 230 }, { voltageDropV: 1.66, voltageDropPercent: 0.721739 });
  // 0,1·(0,2·100000)/400 = 5 V; %1,25
  hand("D11", "threePhaseVoltageDropPowerForm", { activePowerW: 100000, reactivePowerVar: 0, lengthM: 100, resistanceOhmPerKm: 0.2, reactanceOhmPerKm: 0, nominalLineVoltageV: 400 }, { voltageDropV: 5, voltageDropPercent: 1.25 });
  // 0,2·(15000 + 2400)/400 = 8,7 V; %2,175
  hand("D12", "threePhaseVoltageDropPowerForm", { activePowerW: 50000, reactivePowerVar: 30000, lengthM: 200, resistanceOhmPerKm: 0.3, reactanceOhmPerKm: 0.08, nominalLineVoltageV: 400 }, { voltageDropV: 8.7, voltageDropPercent: 2.175 });
  // Q < 0: 0,2·(15000 − 2400)/400 = 6,3 V; %1,575
  hand("D13", "threePhaseVoltageDropPowerForm", { activePowerW: 50000, reactivePowerVar: -30000, lengthM: 200, resistanceOhmPerKm: 0.3, reactanceOhmPerKm: 0.08, nominalLineVoltageV: 400 }, { voltageDropV: 6.3, voltageDropPercent: 1.575 });
  // OG: 5·(200000 + 175000)/34500 = 54,3478 V; /34500 = %0,157530
  hand("D14", "threePhaseVoltageDropPowerForm", { activePowerW: 1000000, reactivePowerVar: 500000, lengthM: 5000, resistanceOhmPerKm: 0.2, reactanceOhmPerKm: 0.35, nominalLineVoltageV: 34500 }, { voltageDropV: 54.3478, voltageDropPercent: 0.15753 });
});

describe("gerilim düşümü, iletkenlik ile", () => {
  // 2·30·16/(56·2,5) = 960/140 = 6,857143 V; /230 = %2,981366
  hand("D15", "singlePhaseVoltageDropResistive", { currentA: 16, powerFactor: 1, lengthM: 30, conductivityMPerOhmMm2: 56, sectionMm2: 2.5, nominalVoltageV: 230 }, { voltageDropV: 6.857143, voltageDropPercent: 2.981366 });
  // √3·50·32/(56·6) = 2771,281/336 = 8,247860 V; /400 = %2,061965
  hand("D16", "threePhaseVoltageDropResistive", { lineCurrentA: 32, powerFactor: 1, lengthM: 50, conductivityMPerOhmMm2: 56, sectionMm2: 6, nominalLineVoltageV: 400 }, { voltageDropV: 8.24786, voltageDropPercent: 2.061965 });
  // √3·100·100·0,8/(35·50) = 13856,406/1750 = 7,917947 V; /400 = %1,979487
  hand("D17", "threePhaseVoltageDropResistive", { lineCurrentA: 100, powerFactor: 0.8, lengthM: 100, conductivityMPerOhmMm2: 35, sectionMm2: 50, nominalLineVoltageV: 400 }, { voltageDropV: 7.917947, voltageDropPercent: 1.979487 });
  // 2·100·10·0,9/(56·4) = 1800/224 = 8,035714 V; /230 = %3,493789
  hand("D18", "singlePhaseVoltageDropResistive", { currentA: 10, powerFactor: 0.9, lengthM: 100, conductivityMPerOhmMm2: 56, sectionMm2: 4, nominalVoltageV: 230 }, { voltageDropV: 8.035714, voltageDropPercent: 3.493789 });
});

describe("iletken direnci", () => {
  // Referansta: 0,0172·100/2,5 = 0,688 Ω
  hand("R01", "conductorResistanceOhm", { resistivityOhmMm2PerM: 0.0172, referenceTemperatureC: 20, temperatureCoefficientPerC: 0.00393, temperatureC: 20, lengthM: 100, sectionMm2: 2.5 }, 0.688);
  // 1 + 0,00393·50 = 1,1965; 0,688·1,1965 = 0,823192 Ω
  hand("R02", "conductorResistanceOhm", { resistivityOhmMm2PerM: 0.0172, referenceTemperatureC: 20, temperatureCoefficientPerC: 0.00393, temperatureC: 70, lengthM: 100, sectionMm2: 2.5 }, 0.823192);
  // 1 − 0,00393·20 = 0,9214; 0,688·0,9214 = 0,6339232 Ω
  hand("R03", "conductorResistanceOhm", { resistivityOhmMm2PerM: 0.0172, referenceTemperatureC: 20, temperatureCoefficientPerC: 0.00393, temperatureC: 0, lengthM: 100, sectionMm2: 2.5 }, 0.6339232);
  // 28,2/95 = 0,2968421; 1 + 0,00403·70 = 1,2821; çarpım 0,3805813 Ω
  hand("R04", "conductorResistanceOhm", { resistivityOhmMm2PerM: 0.0282, referenceTemperatureC: 20, temperatureCoefficientPerC: 0.00403, temperatureC: 90, lengthM: 1000, sectionMm2: 95 }, 0.3805813);
  // α = 0: sıcaklık etkisiz; 0,5·10/1 = 5 Ω
  hand("R05", "conductorResistanceOhm", { resistivityOhmMm2PerM: 0.5, referenceTemperatureC: 20, temperatureCoefficientPerC: 0, temperatureC: 200, lengthM: 10, sectionMm2: 1 }, 5);
  // Referans başka sıcaklıkta: T = T_ref; 0,02·1000/10 = 2 Ω
  hand("R06", "conductorResistanceOhm", { resistivityOhmMm2PerM: 0.02, referenceTemperatureC: 75, temperatureCoefficientPerC: 0.004, temperatureC: 75, lengthM: 1000, sectionMm2: 10 }, 2);
  // 1000/(56·10) = 1,785714 Ω/km
  hand("R07", "resistanceOhmPerKmFromConductivity", { conductivityMPerOhmMm2: 56, sectionMm2: 10 }, 1.785714);
  // 1000/(35·95) = 1000/3325 = 0,3007519 Ω/km
  hand("R08", "resistanceOhmPerKmFromConductivity", { conductivityMPerOhmMm2: 35, sectionMm2: 95 }, 0.3007519);
});

describe("minimum kesit", () => {
  // ΔV = 6,9 V; 2·30·16/(56·6,9) = 960/386,4 = 2,484472 mm²
  hand("M01", "singlePhaseMinimumSectionMm2", { currentA: 16, powerFactor: 1, powerFactorType: "lagging", lengthM: 30, conductivityMPerOhmMm2: 56, reactanceOhmPerKm: 0, nominalVoltageV: 230, maxVoltageDropPercent: 3 }, 2.484472);
  // ΔV = 12 V; √3·50·32/(56·12) = 2771,281/672 = 4,123930 mm²
  hand("M02", "threePhaseMinimumSectionMm2", { lineCurrentA: 32, powerFactor: 1, powerFactorType: "lagging", lengthM: 50, conductivityMPerOhmMm2: 56, reactanceOhmPerKm: 0, nominalLineVoltageV: 400, maxVoltageDropPercent: 3 }, 4.12393);
  // ΔV = 20 V; 13856,406/(35·20) = 19,79487 mm²
  hand("M03", "threePhaseMinimumSectionMm2", { lineCurrentA: 100, powerFactor: 0.8, powerFactorType: "lagging", lengthM: 100, conductivityMPerOhmMm2: 35, reactanceOhmPerKm: 0, nominalLineVoltageV: 400, maxVoltageDropPercent: 5 }, 19.79487);
  // 12/(√3·100·0,1) = 0,6928203; −0,1·0,6 = 0,6328203; /0,8 = 0,7910254 Ω/km; 1000/(56·0,7910254) = 22,5747 mm²
  hand("M04", "threePhaseMinimumSectionMm2", { lineCurrentA: 100, powerFactor: 0.8, powerFactorType: "lagging", lengthM: 100, conductivityMPerOhmMm2: 56, reactanceOhmPerKm: 0.1, nominalLineVoltageV: 400, maxVoltageDropPercent: 3 }, 22.5747);
  // ΔV = 4,6 V; 4,6/(2·10·0,1) = 2,3; +0,1·0,6 = 2,36; /0,8 = 2,95 Ω/km; 1000/(56·2,95) = 6,053269 mm²
  hand("M05", "singlePhaseMinimumSectionMm2", { currentA: 10, powerFactor: 0.8, powerFactorType: "leading", lengthM: 100, conductivityMPerOhmMm2: 56, reactanceOhmPerKm: 0.1, nominalVoltageV: 230, maxVoltageDropPercent: 2 }, 6.053269);
  // ΔV = 2,3 V; 2·100·10·0,9/(56·2,3) = 1800/128,8 = 13,97516 mm²
  hand("M06", "singlePhaseMinimumSectionMm2", { currentA: 10, powerFactor: 0.9, powerFactorType: "lagging", lengthM: 100, conductivityMPerOhmMm2: 56, reactanceOhmPerKm: 0, nominalVoltageV: 230, maxVoltageDropPercent: 1 }, 13.97516);
});

describe("empedans ve kısa devre", () => {
  // √(9 + 16) = 5 Ω
  hand("Z01", "impedanceMagnitudeOhm", { resistanceOhm: 3, reactanceOhm: 4 }, 5);
  // R = 0: |Z| = 0,05 Ω
  hand("Z02", "impedanceMagnitudeOhm", { resistanceOhm: 0, reactanceOhm: 0.05 }, 0.05);
  // X = 0: |Z| = 0,1 Ω
  hand("Z03", "impedanceMagnitudeOhm", { resistanceOhm: 0.1, reactanceOhm: 0 }, 0.1);
  // √(0,0004 + 0,0009) = √0,0013 = 0,03605551 Ω
  hand("Z04", "impedanceMagnitudeOhm", { resistanceOhm: 0.02, reactanceOhm: 0.03 }, 0.03605551);
  // 400/√3 = 230,9401 V; /0,05 = 4618,802 A
  hand("S01", "threePhaseShortCircuitCurrentA", { lineVoltageV: 400, impedancePerPhaseOhm: 0.05 }, 4618.802);
  // 34500/√3 = 19918,58 V; /2 = 9959,29 A
  hand("S02", "threePhaseShortCircuitCurrentA", { lineVoltageV: 34500, impedancePerPhaseOhm: 2 }, 9959.29);
  // 230/0,5 = 460 A
  hand("S03", "singlePhaseShortCircuitCurrentA", { lineToNeutralVoltageV: 230, loopImpedanceOhm: 0.5 }, 460);
  // 230/1,15 = 200 A
  hand("S04", "singlePhaseShortCircuitCurrentA", { lineToNeutralVoltageV: 230, loopImpedanceOhm: 1.15 }, 200);
  // 1443,376·100/6 = 24056,27 A
  hand("S05", "transformerShortCircuitCurrentA", { ratedCurrentA: 1443.376, impedanceVoltagePercent: 6 }, 24056.27);
  // 100·100/4 = 2500 A
  hand("S06", "transformerShortCircuitCurrentA", { ratedCurrentA: 100, impedanceVoltagePercent: 4 }, 2500);
});

describe("trafo anma akımı", () => {
  // 1000000/(√3·400) = 1000000/692,8203 = 1443,376 A
  hand("X01", "transformerRatedCurrentThreePhaseA", { ratedPowerKVA: 1000, lineVoltageV: 400 }, 1443.376);
  // 630000/692,8203 = 909,3266 A
  hand("X02", "transformerRatedCurrentThreePhaseA", { ratedPowerKVA: 630, lineVoltageV: 400 }, 909.3266);
  // 1000000/(√3·34500) = 1000000/59755,75 = 16,73479 A
  hand("X03", "transformerRatedCurrentThreePhaseA", { ratedPowerKVA: 1000, lineVoltageV: 34500 }, 16.73479);
  // 10000/230 = 43,47826 A
  hand("X04", "transformerRatedCurrentSinglePhaseA", { ratedPowerKVA: 10, voltageV: 230 }, 43.47826);
  // 50000/7200 = 6,944444 A
  hand("X05", "transformerRatedCurrentSinglePhaseA", { ratedPowerKVA: 50, voltageV: 7200 }, 6.944444);
});

describe("enerji ve maliyet", () => {
  // 1000 W·1 h = 1 kWh
  hand("E01", "energyKWh", { activePowerW: 1000, durationH: 1 }, 1);
  // 2500·8/1000 = 20 kWh
  hand("E02", "energyKWh", { activePowerW: 2500, durationH: 8 }, 20);
  // 60·0,5/1000 = 0,03 kWh
  hand("E03", "energyKWh", { activePowerW: 60, durationH: 0.5 }, 0.03);
  // 1500·720/1000 = 1080 kWh
  hand("E04", "energyKWh", { activePowerW: 1500, durationH: 720 }, 1080);
  // 100·2,5 = 250
  hand("E05", "energyCost", { energyKWh: 100, unitPricePerKWh: 2.5 }, 250);
  // 0,5·3,2 = 1,6
  hand("E06", "energyCost", { energyKWh: 0.5, unitPricePerKWh: 3.2 }, 1.6);
});
