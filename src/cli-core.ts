// Komut satırı mantığı: argüman ayrıştırma, doğrulama ve çıktı biçimlendirme.

import { ElectricalInputError } from "./errors.js";
import * as api from "./index.js";

export const VERSION = "0.1.0";

type Lang = "tr" | "en";
type Kind = "number" | "pfType";
type ParamSpec = readonly [string, Kind];

interface CommandDef {
  name: string;
  aliasTr: string;
  fn: (params: never) => unknown;
  params: readonly ParamSpec[];
  resultName: string;
  descTr: string;
  descEn: string;
  /** Bu komutun her başarılı hesabında stderr'e yazılan ek tek satırlık uyarı */
  note: Note | undefined;
}

interface Note {
  tr: string;
  en: string;
}

const NOTICE = {
  tr: "UYARI: Eğitim/ön tasarım aracıdır; yetkili mühendis hesabının ve standartların yerine geçmez. Yanlış kullanım yangın, elektrik çarpması veya maddi hasar riski doğurabilir.",
  en: "WARNING: Educational/pre-design aid; not a substitute for a licensed engineer's calculation or applicable standards. Wrong use may risk fire, electric shock or property damage.",
} as const;

const SHORT_CIRCUIT_NOTE: Note = {
  tr: "KISA DEVRE UYARISI: Basitleştirilmiş değerdir; gerilim faktörü, motor katkısı, tepe akımı ve DC bileşen dahil değildir. Şalter veya koruma seçiminde KULLANILMAMALIDIR.",
  en: "SHORT-CIRCUIT WARNING: Simplified value; excludes voltage factor, motor contribution, peak current and DC component. It must NOT be used to select breakers or protection.",
};

const MINIMUM_SECTION_NOTE: Note = {
  tr: "KESİT UYARISI: Teorik alt sınırdır; akım taşıma kapasitesi ve standart kesit kontrolü yapılmamıştır.",
  en: "SECTION WARNING: This is a theoretical lower bound; no ampacity or standard-size check was made.",
};

const n = (name: string): ParamSpec => [name, "number"];
const PF_TYPE: ParamSpec = ["powerFactorType", "pfType"];
const PF = n("powerFactor");

function cmd(
  name: string,
  aliasTr: string,
  fn: (params: never) => unknown,
  params: readonly ParamSpec[],
  resultName: string,
  descTr: string,
  descEn: string,
  note?: Note,
): CommandDef {
  return { name, aliasTr, fn, params, resultName, descTr, descEn, note };
}

export const COMMANDS: readonly CommandDef[] = [
  cmd("single-phase-active-power", "bir-faz-aktif-guc", api.singlePhaseActivePowerW, [n("voltageV"), n("currentA"), PF], "activePowerW", "Bir faz aktif güç", "Single-phase active power"),
  cmd("three-phase-active-power", "uc-faz-aktif-guc", api.threePhaseActivePowerW, [n("lineVoltageV"), n("lineCurrentA"), PF], "activePowerW", "Üç faz aktif güç", "Three-phase active power"),
  cmd("single-phase-apparent-power", "bir-faz-gorunur-guc", api.singlePhaseApparentPowerVA, [n("voltageV"), n("currentA")], "apparentPowerVA", "Bir faz görünür güç", "Single-phase apparent power"),
  cmd("three-phase-apparent-power", "uc-faz-gorunur-guc", api.threePhaseApparentPowerVA, [n("lineVoltageV"), n("lineCurrentA")], "apparentPowerVA", "Üç faz görünür güç", "Three-phase apparent power"),
  cmd("single-phase-current", "bir-faz-akim", api.singlePhaseCurrentA, [n("activePowerW"), n("voltageV"), PF], "currentA", "Bir faz akım", "Single-phase current"),
  cmd("three-phase-current", "uc-faz-akim", api.threePhaseLineCurrentA, [n("activePowerW"), n("lineVoltageV"), PF], "lineCurrentA", "Üç faz hat akımı", "Three-phase line current"),
  cmd("single-phase-voltage", "bir-faz-gerilim", api.singlePhaseVoltageV, [n("activePowerW"), n("currentA"), PF], "voltageV", "Bir faz gerilim", "Single-phase voltage"),
  cmd("three-phase-voltage", "uc-faz-gerilim", api.threePhaseLineVoltageV, [n("activePowerW"), n("lineCurrentA"), PF], "lineVoltageV", "Üç faz fazlar arası gerilim", "Three-phase line-to-line voltage"),
  cmd("line-to-neutral-voltage", "faz-notr-gerilim", api.lineToNeutralVoltageV, [n("lineVoltageV")], "lineToNeutralVoltageV", "Fazlar arasından faz-nötr gerilim", "Line-to-neutral from line-to-line voltage"),
  cmd("line-to-line-voltage", "fazlar-arasi-gerilim", api.lineToLineVoltageV, [n("lineToNeutralVoltageV")], "lineVoltageV", "Faz-nötrden fazlar arası gerilim", "Line-to-line from line-to-neutral voltage"),
  cmd("power-triangle-pq", "guc-ucgeni-pq", api.powerTriangleFromPQ, [n("activePowerW"), n("reactivePowerVar")], "", "P ve işaretli Q'dan güç üçgeni", "Power triangle from P and signed Q"),
  cmd("power-triangle-p-pf", "guc-ucgeni-p-cos", api.powerTriangleFromPAndPF, [n("activePowerW"), PF, PF_TYPE], "", "P ve cosφ'den güç üçgeni", "Power triangle from P and power factor"),
  cmd("power-triangle-s-pf", "guc-ucgeni-s-cos", api.powerTriangleFromSAndPF, [n("apparentPowerVA"), PF, PF_TYPE], "", "S ve cosφ'den güç üçgeni", "Power triangle from S and power factor"),
  cmd("capacitor-kvar", "kompanzasyon-kvar", api.correctionCapacitorKvar, [n("activePowerKW"), n("initialPowerFactor"), n("targetPowerFactor")], "capacitorKvar", "Kompanzasyon kondansatör gücü", "Power factor correction capacitor"),
  cmd("single-phase-drop-current", "bir-faz-dusum-akim", api.singlePhaseVoltageDropCurrentForm, [n("currentA"), n("lengthM"), n("resistanceOhmPerKm"), n("reactanceOhmPerKm"), PF, PF_TYPE, n("nominalVoltageV")], "", "Bir faz gerilim düşümü, akım biçimi", "Single-phase voltage drop, current form"),
  cmd("three-phase-drop-current", "uc-faz-dusum-akim", api.threePhaseVoltageDropCurrentForm, [n("lineCurrentA"), n("lengthM"), n("resistanceOhmPerKm"), n("reactanceOhmPerKm"), PF, PF_TYPE, n("nominalLineVoltageV")], "", "Üç faz gerilim düşümü, akım biçimi", "Three-phase voltage drop, current form"),
  cmd("single-phase-drop-power", "bir-faz-dusum-guc", api.singlePhaseVoltageDropPowerForm, [n("activePowerW"), n("reactivePowerVar"), n("lengthM"), n("resistanceOhmPerKm"), n("reactanceOhmPerKm"), n("nominalVoltageV")], "", "Bir faz gerilim düşümü, güç biçimi", "Single-phase voltage drop, power form"),
  cmd("three-phase-drop-power", "uc-faz-dusum-guc", api.threePhaseVoltageDropPowerForm, [n("activePowerW"), n("reactivePowerVar"), n("lengthM"), n("resistanceOhmPerKm"), n("reactanceOhmPerKm"), n("nominalLineVoltageV")], "", "Üç faz gerilim düşümü, güç biçimi", "Three-phase voltage drop, power form"),
  cmd("single-phase-drop-resistive", "bir-faz-dusum-direncli", api.singlePhaseVoltageDropResistive, [n("currentA"), PF, n("lengthM"), n("conductivityMPerOhmMm2"), n("sectionMm2"), n("nominalVoltageV")], "", "Bir faz gerilim düşümü, iletkenlik ile", "Single-phase voltage drop from conductivity"),
  cmd("three-phase-drop-resistive", "uc-faz-dusum-direncli", api.threePhaseVoltageDropResistive, [n("lineCurrentA"), PF, n("lengthM"), n("conductivityMPerOhmMm2"), n("sectionMm2"), n("nominalLineVoltageV")], "", "Üç faz gerilim düşümü, iletkenlik ile", "Three-phase voltage drop from conductivity"),
  cmd("conductor-resistance", "iletken-direnci", api.conductorResistanceOhm, [n("resistivityOhmMm2PerM"), n("referenceTemperatureC"), n("temperatureCoefficientPerC"), n("temperatureC"), n("lengthM"), n("sectionMm2")], "resistanceOhm", "Sıcaklığa bağlı iletken direnci", "Conductor resistance with temperature"),
  cmd("resistance-per-km", "birim-direnc", api.resistanceOhmPerKmFromConductivity, [n("conductivityMPerOhmMm2"), n("sectionMm2")], "resistanceOhmPerKm", "İletkenlikten birim direnç", "Resistance per km from conductivity"),
  cmd("single-phase-min-section", "bir-faz-min-kesit", api.singlePhaseMinimumSectionMm2, [n("currentA"), PF, PF_TYPE, n("lengthM"), n("conductivityMPerOhmMm2"), n("reactanceOhmPerKm"), n("nominalVoltageV"), n("maxVoltageDropPercent")], "sectionMm2", "Düşüm limitine göre bir faz minimum kesit", "Single-phase minimum section for a drop limit", MINIMUM_SECTION_NOTE),
  cmd("three-phase-min-section", "uc-faz-min-kesit", api.threePhaseMinimumSectionMm2, [n("lineCurrentA"), PF, PF_TYPE, n("lengthM"), n("conductivityMPerOhmMm2"), n("reactanceOhmPerKm"), n("nominalLineVoltageV"), n("maxVoltageDropPercent")], "sectionMm2", "Düşüm limitine göre üç faz minimum kesit", "Three-phase minimum section for a drop limit", MINIMUM_SECTION_NOTE),
  cmd("impedance", "empedans", api.impedanceMagnitudeOhm, [n("resistanceOhm"), n("reactanceOhm")], "impedanceOhm", "Empedans büyüklüğü", "Impedance magnitude"),
  cmd("three-phase-short-circuit", "uc-faz-kisa-devre", api.threePhaseShortCircuitCurrentA, [n("lineVoltageV"), n("impedancePerPhaseOhm")], "shortCircuitCurrentA", "Üç faz kısa devre akımı", "Three-phase short-circuit current", SHORT_CIRCUIT_NOTE),
  cmd("single-phase-short-circuit", "bir-faz-kisa-devre", api.singlePhaseShortCircuitCurrentA, [n("lineToNeutralVoltageV"), n("loopImpedanceOhm")], "shortCircuitCurrentA", "Faz-nötr çevrim kısa devre akımı", "Line-to-neutral loop short-circuit current", SHORT_CIRCUIT_NOTE),
  cmd("transformer-short-circuit", "trafo-kisa-devre", api.transformerShortCircuitCurrentA, [n("ratedCurrentA"), n("impedanceVoltagePercent")], "shortCircuitCurrentA", "Trafo uçlarında kısa devre akımı", "Short-circuit current at transformer terminals", SHORT_CIRCUIT_NOTE),
  cmd("transformer-current-three-phase", "trafo-akim-uc-faz", api.transformerRatedCurrentThreePhaseA, [n("ratedPowerKVA"), n("lineVoltageV")], "ratedCurrentA", "Üç faz trafo anma akımı", "Three-phase transformer rated current"),
  cmd("transformer-current-single-phase", "trafo-akim-bir-faz", api.transformerRatedCurrentSinglePhaseA, [n("ratedPowerKVA"), n("voltageV")], "ratedCurrentA", "Bir faz trafo anma akımı", "Single-phase transformer rated current"),
  cmd("energy", "enerji", api.energyKWh, [n("activePowerW"), n("durationH")], "energyKWh", "Enerji", "Energy"),
  cmd("energy-cost", "enerji-maliyeti", api.energyCost, [n("energyKWh"), n("unitPricePerKWh")], "cost", "Enerji maliyeti", "Energy cost"),
];

/** Parametre adını bayrağa çevirir: activePowerW -> --active-power-w */
export function flagFor(param: string): string {
  const kebab = param
    .replace(/KWh/g, "Kwh")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
  return `--${kebab}`;
}

// Sayı biçimi katıdır: "0,85", "12abc", "", "Infinity" ve "0x10" reddedilir.
const NUMBER_PATTERN = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function mainHelp(lang: Lang): string {
  const title =
    lang === "tr"
      ? "Kullanım: elektrik-hesap <komut> --parametre deger ... [--json] [--lang tr|en]\nParametreler için: elektrik-hesap <komut> --help\n\nKomutlar (Türkçe takma ad parantez içinde):"
      : "Usage: elektrik-hesap <command> --parameter value ... [--json] [--lang tr|en]\nFor parameters: elektrik-hesap <command> --help\n\nCommands (Turkish alias in parentheses):";
  const lines = COMMANDS.map((c) => `  ${c.name} (${c.aliasTr}): ${lang === "tr" ? c.descTr : c.descEn}`);
  return [NOTICE[lang], "", title, ...lines].join("\n");
}

function commandHelp(c: CommandDef, lang: Lang): string {
  const lines = c.params.map(([name, kind]) => `  ${flagFor(name)} ${kind === "pfType" ? "lagging|leading" : "<sayi|number>"}`);
  const note = c.note ? [c.note[lang]] : [];
  return [NOTICE[lang], ...note, "", `${c.name} (${c.aliasTr}): ${lang === "tr" ? c.descTr : c.descEn}`, ...lines].join("\n");
}

function usageError(lang: Lang, tr: string, en: string): CliResult {
  return { exitCode: 2, stdout: "", stderr: lang === "tr" ? tr : en };
}

/** Komut satırını çalıştırır; süreç durumuna dokunmaz, sonucu döndürür. */
export function runCli(argv: readonly string[]): CliResult {
  const args = [...argv];

  // --lang önce ayrıştırılır ki sonraki bütün mesajlar seçilen dilde olsun.
  let lang: Lang = "tr";
  const langIndex = args.indexOf("--lang");
  if (langIndex !== -1) {
    const value = args[langIndex + 1];
    if (value !== "tr" && value !== "en") {
      return usageError(lang, "--lang yalnızca tr veya en olabilir", "--lang must be tr or en");
    }
    lang = value;
    args.splice(langIndex, 2);
  }

  if (args.includes("--version")) return { exitCode: 0, stdout: VERSION, stderr: "" };

  const name = args[0];
  if (name === undefined || name === "--help" || name === "-h") {
    return { exitCode: name === undefined ? 2 : 0, stdout: mainHelp(lang), stderr: "" };
  }

  const command = COMMANDS.find((c) => c.name === name || c.aliasTr === name);
  if (!command) {
    return usageError(
      lang,
      `Bilinmeyen komut: ${name}. Liste için --help kullanın.`,
      `Unknown command: ${name}. Use --help for the list.`,
    );
  }

  const rest = args.slice(1);
  if (rest.includes("--help") || rest.includes("-h")) {
    return { exitCode: 0, stdout: commandHelp(command, lang), stderr: "" };
  }

  let asJson = false;
  const byFlag = new Map(command.params.map(([param, kind]) => [flagFor(param), { param, kind }]));
  const values: Record<string, number | string> = {};

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i] as string;
    if (token === "--json") {
      asJson = true;
      continue;
    }
    const spec = byFlag.get(token);
    if (!spec) {
      return usageError(lang, `Bilinmeyen parametre: ${token}`, `Unknown parameter: ${token}`);
    }
    if (spec.param in values) {
      return usageError(lang, `Parametre iki kez verildi: ${token}`, `Parameter given twice: ${token}`);
    }
    const raw = rest[++i];
    if (raw === undefined) {
      return usageError(lang, `${token} için değer eksik`, `Missing value for ${token}`);
    }
    if (spec.kind === "number") {
      if (!NUMBER_PATTERN.test(raw)) {
        return usageError(
          lang,
          `${token} için geçersiz sayı: "${raw}" (ondalık ayırıcı nokta olmalı, örn. 0.85)`,
          `Invalid number for ${token}: "${raw}" (use a dot as the decimal separator, e.g. 0.85)`,
        );
      }
      values[spec.param] = Number(raw);
    } else {
      values[spec.param] = raw;
    }
  }

  const missing = command.params.map(([param]) => param).filter((param) => !(param in values));
  if (missing.length > 0) {
    const flags = missing.map(flagFor).join(", ");
    return usageError(lang, `Eksik parametre: ${flags}`, `Missing parameter: ${flags}`);
  }

  try {
    const result = (command.fn as unknown as (p: Record<string, unknown>) => unknown)(values);
    const fields: Record<string, unknown> =
      typeof result === "number" ? { [command.resultName]: result } : (result as Record<string, unknown>);
    const stdout = asJson
      ? JSON.stringify({ command: command.name, input: values, result: fields })
      : Object.entries(fields)
          // Uyarılar sayısal çıktıya karışmaz; aşağıda stderr'e yazılır.
          .filter(([key]) => key !== "warnings")
          .map(([key, value]) => `${key} = ${String(value)}`)
          .join("\n");
    const resultWarnings = (fields["warnings"] ?? []) as api.VoltageDropWarning[];
    const stderr = [
      NOTICE[lang],
      ...(command.note ? [command.note[lang]] : []),
      ...resultWarnings.map((w) => (lang === "tr" ? w.messageTr : w.messageEn)),
    ].join("\n");
    return { exitCode: 0, stdout, stderr };
  } catch (error) {
    if (error instanceof ElectricalInputError) {
      return { exitCode: 1, stdout: "", stderr: lang === "tr" ? error.messageTr : error.messageEn };
    }
    throw error;
  }
}
