// Doğrulama testleri: her fonksiyonun her parametresi hatalı değerlerle denenir.

import { describe, expect, it } from "vitest";
import * as api from "../src/index.js";
import { ElectricalInputError, type ErrorCode } from "../src/index.js";
import { SPECS, type Fn } from "./specs.js";

const functions = api as unknown as Record<string, Fn>;

function codeOf(call: () => unknown): ErrorCode | "NO_ERROR" | "OTHER_ERROR" {
  try {
    call();
    return "NO_ERROR";
  } catch (error) {
    return error instanceof ElectricalInputError ? error.code : "OTHER_ERROR";
  }
}

describe("kapsam", () => {
  it("dışa aktarılan her hesap fonksiyonu tabloda vardır", () => {
    const exported = Object.keys(api).filter((name) => name !== "ElectricalInputError" && name !== "LARGE_DROP_WARNING_PERCENT").sort();
    expect(SPECS.map((s) => s.fn).sort()).toEqual(exported);
  });
});

describe.each(SPECS)("$fn", ({ fn, valid, zeroOk = [], negativeOk = [] }) => {
  const f = functions[fn] as Fn;

  it("geçerli girdi kabul edilir", () => {
    expect(codeOf(() => f(valid))).toBe("NO_ERROR");
  });

  it("nesne olmayan parametre reddedilir", () => {
    for (const bad of [undefined, null, 5, "x", []]) {
      expect(codeOf(() => f(bad))).toBe("INVALID_ARGUMENTS");
    }
  });

  for (const key of Object.keys(valid)) {
    if (key === "powerFactorType") {
      it("yük karakteri zorunlu ve sınırlıdır", () => {
        for (const bad of [undefined, null, "", "inductive", "LAGGING", 1]) {
          expect(codeOf(() => f({ ...valid, [key]: bad }))).toBe("INVALID_CHOICE");
        }
      });
      continue;
    }

    it(`${key}: NaN, ±Infinity, metin ve eksik değer reddedilir`, () => {
      for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "10", undefined, null, true]) {
        expect(codeOf(() => f({ ...valid, [key]: bad }))).toBe("NOT_A_FINITE_NUMBER");
      }
    });

    if (!zeroOk.includes(key)) {
      it(`${key}: sıfır reddedilir`, () => {
        expect(["MUST_BE_POSITIVE", "OUT_OF_RANGE"]).toContain(codeOf(() => f({ ...valid, [key]: 0 })));
      });
    }

    if (!negativeOk.includes(key)) {
      it(`${key}: negatif reddedilir`, () => {
        expect(["MUST_BE_POSITIVE", "MUST_BE_NON_NEGATIVE", "OUT_OF_RANGE"]).toContain(codeOf(() => f({ ...valid, [key]: -1 })));
      });
    }
  }
});

describe("özel sınırlar", () => {
  const voltageDrop = { lineCurrentA: 10, lengthM: 100, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0, powerFactorType: "lagging", nominalLineVoltageV: 400 } as const;

  it("güç katsayısı 1'i aşamaz, 1 ve çok küçük değerler kabul edilir", () => {
    const f = functions["threePhaseActivePowerW"] as Fn;
    const base = { lineVoltageV: 400, lineCurrentA: 10 };
    expect(codeOf(() => f({ ...base, powerFactor: 1.0000001 }))).toBe("OUT_OF_RANGE");
    expect(codeOf(() => f({ ...base, powerFactor: 1 }))).toBe("NO_ERROR");
    expect(codeOf(() => f({ ...base, powerFactor: 1e-6 }))).toBe("NO_ERROR");
  });

  it("hedef cosφ başlangıçtan küçük olamaz", () => {
    expect(codeOf(() => api.correctionCapacitorKvar({ activePowerKW: 1, initialPowerFactor: 0.9, targetPowerFactor: 0.8 }))).toBe("INCONSISTENT_INPUT");
  });

  it("P ve Q birlikte sıfır, R ve X birlikte sıfır olamaz", () => {
    expect(codeOf(() => api.powerTriangleFromPQ({ activePowerW: 0, reactivePowerVar: 0 }))).toBe("INCONSISTENT_INPUT");
    expect(codeOf(() => api.impedanceMagnitudeOhm({ resistanceOhm: 0, reactanceOhm: 0 }))).toBe("INCONSISTENT_INPUT");
  });

  it("yüzde limitleri 0 ile 100 arasında olmalıdır", () => {
    const base = { lineCurrentA: 10, powerFactor: 1, powerFactorType: "lagging", lengthM: 10, conductivityMPerOhmMm2: 56, reactanceOhmPerKm: 0, nominalLineVoltageV: 400 } as const;
    for (const bad of [0, 100, 150, -3]) {
      expect(codeOf(() => api.threePhaseMinimumSectionMm2({ ...base, maxVoltageDropPercent: bad }))).toBe("OUT_OF_RANGE");
      expect(codeOf(() => api.transformerShortCircuitCurrentA({ ratedCurrentA: 10, impedanceVoltagePercent: bad }))).toBe("OUT_OF_RANGE");
    }
  });

  it("reaktans limiti tek başına aşıyorsa kesit döndürülmez", () => {
    // ΔV = 400 V·%1 = 4 V; √3·100·1 km·0,1 Ω/km·0,6 = 10,39 V > 4 V
    expect(codeOf(() => api.threePhaseMinimumSectionMm2({ lineCurrentA: 100, powerFactor: 0.8, powerFactorType: "lagging", lengthM: 1000, conductivityMPerOhmMm2: 56, reactanceOhmPerKm: 0.1, nominalLineVoltageV: 400, maxVoltageDropPercent: 1 }))).toBe("DROP_LIMIT_UNREACHABLE");
  });

  it("düşüm anma gerilimine ulaşırsa yaklaşık sonuç döndürülmez", () => {
    // 2·10 A·10 km·(2 Ω/km) = 400 V ≥ 230 V
    expect(codeOf(() => api.singlePhaseVoltageDropCurrentForm({ currentA: 10, lengthM: 10000, resistanceOhmPerKm: 2, reactanceOhmPerKm: 0, powerFactor: 1, powerFactorType: "lagging", nominalVoltageV: 230 }))).toBe("RESULT_OUT_OF_RANGE");
    expect(codeOf(() => api.threePhaseVoltageDropCurrentForm({ ...voltageDrop, lengthM: 100000, powerFactor: 1 }))).toBe("RESULT_OUT_OF_RANGE");
  });

  it("sıcaklık mutlak sıfırın altına inemez; doğrusal model pozitif kalmalıdır", () => {
    const base = { resistivityOhmMm2PerM: 0.0172, referenceTemperatureC: 20, temperatureCoefficientPerC: 0.00393, lengthM: 1, sectionMm2: 1 };
    expect(codeOf(() => api.conductorResistanceOhm({ ...base, temperatureC: -274 }))).toBe("OUT_OF_RANGE");
    // Sınır değer kabul edilir: 1 + 0,001·(−293,15) = 0,70685 > 0
    expect(codeOf(() => api.conductorResistanceOhm({ ...base, temperatureCoefficientPerC: 0.001, temperatureC: -273.15 }))).toBe("NO_ERROR");
    // Gerçekçi katsayıda model mutlak sıfıra varmadan bozulur: 1 + 0,00393·(−293,15) = −0,152
    expect(codeOf(() => api.conductorResistanceOhm({ ...base, temperatureC: -273.15 }))).toBe("INCONSISTENT_INPUT");
    // 1 + 0,01·(−120) = −0,2
    expect(codeOf(() => api.conductorResistanceOhm({ ...base, temperatureCoefficientPerC: 0.01, temperatureC: -100 }))).toBe("INCONSISTENT_INPUT");
    // Negatif katsayı bu modelde kabul edilir ve direnci düşürür: 1 − 0,0005·80 = 0,96
    expect(api.conductorResistanceOhm({ ...base, resistivityOhmMm2PerM: 1, temperatureCoefficientPerC: -0.0005, temperatureC: 100 })).toBeCloseTo(0.96, 10);
  });

  it("taşma ve alttan taşma sessizce Infinity veya 0 döndürmez", () => {
    expect(codeOf(() => api.singlePhaseApparentPowerVA({ voltageV: 1e308, currentA: 1e308 }))).toBe("RESULT_OUT_OF_RANGE");
    expect(codeOf(() => api.singlePhaseApparentPowerVA({ voltageV: 1e-200, currentA: 1e-200 }))).toBe("RESULT_OUT_OF_RANGE");
    expect(codeOf(() => api.energyKWh({ activePowerW: 1e308, durationH: 1e308 }))).toBe("RESULT_OUT_OF_RANGE");
    // En küçük pozitif sayının yarısı 0'a yuvarlanır; P = 0 sessizce dönmez
    expect(codeOf(() => api.powerTriangleFromSAndPF({ apparentPowerVA: 5e-324, powerFactor: 0.5, powerFactorType: "lagging" }))).toBe("RESULT_OUT_OF_RANGE");
  });

  it("uç büyüklükler doğru hesaplanır", () => {
    // 1 mV·1 mA·1 = 1 µW
    expect(api.singlePhaseActivePowerW({ voltageV: 1e-3, currentA: 1e-3, powerFactor: 1 })).toBeCloseTo(1e-6, 15);
    // 1 MV·1 kA·√3 = 1,7320508 GVA
    expect(api.threePhaseApparentPowerVA({ lineVoltageV: 1e6, lineCurrentA: 1e3 })).toBeCloseTo(1.7320508e9, -2);
  });

  it("hata nesnesi iki dilli mesaj ve parametre adı taşır", () => {
    let caught: unknown;
    try {
      api.threePhaseLineCurrentA({ activePowerW: -5, lineVoltageV: 400, powerFactor: 0.8 });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ElectricalInputError);
    const e = caught as ElectricalInputError;
    expect(e.code).toBe("MUST_BE_POSITIVE");
    expect(e.parameter).toBe("activePowerW");
    expect(e.messageTr).toContain("sıfırdan büyük");
    expect(e.messageEn).toContain("greater than zero");
    expect(e.message).toContain(e.messageTr);
    expect(e.message).toContain(e.messageEn);
  });
});
