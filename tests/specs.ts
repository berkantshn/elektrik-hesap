// Her hesap fonksiyonu için geçerli örnek girdiler; doğrulama ve CLI testleri ortak kullanır.

export type Fn = (input: unknown) => unknown;

export interface Spec {
  fn: string;
  valid: Record<string, number | string>;
  /** Sıfırın geçerli olduğu parametreler */
  zeroOk?: string[];
  /** Negatifin geçerli olduğu parametreler */
  negativeOk?: string[];
}

const pfType = "lagging";
export const SPECS: Spec[] = [
  { fn: "singlePhaseActivePowerW", valid: { voltageV: 230, currentA: 10, powerFactor: 0.8 } },
  { fn: "threePhaseActivePowerW", valid: { lineVoltageV: 400, lineCurrentA: 10, powerFactor: 0.8 } },
  { fn: "singlePhaseApparentPowerVA", valid: { voltageV: 230, currentA: 10 } },
  { fn: "threePhaseApparentPowerVA", valid: { lineVoltageV: 400, lineCurrentA: 10 } },
  { fn: "singlePhaseCurrentA", valid: { activePowerW: 1000, voltageV: 230, powerFactor: 0.8 } },
  { fn: "threePhaseLineCurrentA", valid: { activePowerW: 1000, lineVoltageV: 400, powerFactor: 0.8 } },
  { fn: "singlePhaseVoltageV", valid: { activePowerW: 1000, currentA: 5, powerFactor: 0.8 } },
  { fn: "threePhaseLineVoltageV", valid: { activePowerW: 1000, lineCurrentA: 5, powerFactor: 0.8 } },
  { fn: "lineToNeutralVoltageV", valid: { lineVoltageV: 400 } },
  { fn: "lineToLineVoltageV", valid: { lineToNeutralVoltageV: 230 } },
  { fn: "powerTriangleFromPQ", valid: { activePowerW: 3, reactivePowerVar: 4 }, zeroOk: ["activePowerW", "reactivePowerVar"], negativeOk: ["reactivePowerVar"] },
  { fn: "powerTriangleFromPAndPF", valid: { activePowerW: 3, powerFactor: 0.6, powerFactorType: pfType } },
  { fn: "powerTriangleFromSAndPF", valid: { apparentPowerVA: 5, powerFactor: 0.6, powerFactorType: pfType } },
  { fn: "correctionCapacitorKvar", valid: { activePowerKW: 10, initialPowerFactor: 0.7, targetPowerFactor: 0.95 } },
  { fn: "singlePhaseVoltageDropCurrentForm", valid: { currentA: 10, lengthM: 100, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0.1, powerFactor: 0.8, powerFactorType: pfType, nominalVoltageV: 230 }, zeroOk: ["reactanceOhmPerKm"] },
  { fn: "threePhaseVoltageDropCurrentForm", valid: { lineCurrentA: 10, lengthM: 100, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0.1, powerFactor: 0.8, powerFactorType: pfType, nominalLineVoltageV: 400 }, zeroOk: ["reactanceOhmPerKm"] },
  { fn: "singlePhaseVoltageDropPowerForm", valid: { activePowerW: 1000, reactivePowerVar: 200, lengthM: 100, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0.1, nominalVoltageV: 230 }, zeroOk: ["reactanceOhmPerKm", "reactivePowerVar"], negativeOk: ["reactivePowerVar"] },
  { fn: "threePhaseVoltageDropPowerForm", valid: { activePowerW: 1000, reactivePowerVar: 200, lengthM: 100, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0.1, nominalLineVoltageV: 400 }, zeroOk: ["reactanceOhmPerKm", "reactivePowerVar"], negativeOk: ["reactivePowerVar"] },
  { fn: "singlePhaseVoltageDropResistive", valid: { currentA: 10, powerFactor: 0.9, lengthM: 50, conductivityMPerOhmMm2: 56, sectionMm2: 4, nominalVoltageV: 230 } },
  { fn: "threePhaseVoltageDropResistive", valid: { lineCurrentA: 10, powerFactor: 0.9, lengthM: 50, conductivityMPerOhmMm2: 56, sectionMm2: 4, nominalLineVoltageV: 400 } },
  { fn: "conductorResistanceOhm", valid: { resistivityOhmMm2PerM: 0.0172, referenceTemperatureC: 20, temperatureCoefficientPerC: 0.00393, temperatureC: 70, lengthM: 100, sectionMm2: 10 }, zeroOk: ["referenceTemperatureC", "temperatureCoefficientPerC", "temperatureC"], negativeOk: ["referenceTemperatureC", "temperatureCoefficientPerC", "temperatureC"] },
  { fn: "resistanceOhmPerKmFromConductivity", valid: { conductivityMPerOhmMm2: 56, sectionMm2: 10 } },
  { fn: "singlePhaseMinimumSectionMm2", valid: { currentA: 10, powerFactor: 0.9, powerFactorType: pfType, lengthM: 50, conductivityMPerOhmMm2: 56, reactanceOhmPerKm: 0.08, nominalVoltageV: 230, maxVoltageDropPercent: 3 }, zeroOk: ["reactanceOhmPerKm"] },
  { fn: "threePhaseMinimumSectionMm2", valid: { lineCurrentA: 10, powerFactor: 0.9, powerFactorType: pfType, lengthM: 50, conductivityMPerOhmMm2: 56, reactanceOhmPerKm: 0.08, nominalLineVoltageV: 400, maxVoltageDropPercent: 3 }, zeroOk: ["reactanceOhmPerKm"] },
  { fn: "impedanceMagnitudeOhm", valid: { resistanceOhm: 3, reactanceOhm: 4 }, zeroOk: ["resistanceOhm", "reactanceOhm"], negativeOk: ["reactanceOhm"] },
  { fn: "threePhaseShortCircuitCurrentA", valid: { lineVoltageV: 400, impedancePerPhaseOhm: 0.05 } },
  { fn: "singlePhaseShortCircuitCurrentA", valid: { lineToNeutralVoltageV: 230, loopImpedanceOhm: 0.5 } },
  { fn: "transformerShortCircuitCurrentA", valid: { ratedCurrentA: 100, impedanceVoltagePercent: 4 } },
  { fn: "transformerRatedCurrentThreePhaseA", valid: { ratedPowerKVA: 100, lineVoltageV: 400 } },
  { fn: "transformerRatedCurrentSinglePhaseA", valid: { ratedPowerKVA: 10, voltageV: 230 } },
  { fn: "energyKWh", valid: { activePowerW: 100, durationH: 2 } },
  { fn: "energyCost", valid: { energyKWh: 10, unitPricePerKWh: 2 } },
];
