// Made By FALCREB
//
// elektrik-hesap: temel elektrik hesapları için bağımlılıksız TypeScript kütüphanesi.
// Eğitim ve ön tasarım amaçlıdır; yetkili mühendis hesabının ve yürürlükteki
// standartların yerine geçmez. Yanlış kullanım yangın, elektrik çarpması veya
// maddi hasar riski doğurabilir.

export { ElectricalInputError } from "./errors.js";
export type { ErrorCode } from "./errors.js";
export type { PowerFactorType, PowerTriangle, VoltageDropResult, VoltageDropWarning } from "./types.js";
export {
  lineToLineVoltageV,
  lineToNeutralVoltageV,
  singlePhaseActivePowerW,
  singlePhaseApparentPowerVA,
  singlePhaseCurrentA,
  singlePhaseVoltageV,
  threePhaseActivePowerW,
  threePhaseApparentPowerVA,
  threePhaseLineCurrentA,
  threePhaseLineVoltageV,
} from "./power.js";
export {
  correctionCapacitorKvar,
  powerTriangleFromPAndPF,
  powerTriangleFromPQ,
  powerTriangleFromSAndPF,
} from "./power-factor.js";
export {
  LARGE_DROP_WARNING_PERCENT,
  singlePhaseMinimumSectionMm2,
  singlePhaseVoltageDropCurrentForm,
  singlePhaseVoltageDropPowerForm,
  singlePhaseVoltageDropResistive,
  threePhaseMinimumSectionMm2,
  threePhaseVoltageDropCurrentForm,
  threePhaseVoltageDropPowerForm,
  threePhaseVoltageDropResistive,
} from "./voltage-drop.js";
export { conductorResistanceOhm, resistanceOhmPerKmFromConductivity } from "./conductor.js";
export {
  impedanceMagnitudeOhm,
  singlePhaseShortCircuitCurrentA,
  threePhaseShortCircuitCurrentA,
  transformerShortCircuitCurrentA,
} from "./short-circuit.js";
export { transformerRatedCurrentSinglePhaseA, transformerRatedCurrentThreePhaseA } from "./transformer.js";
export { energyCost, energyKWh } from "./energy.js";
