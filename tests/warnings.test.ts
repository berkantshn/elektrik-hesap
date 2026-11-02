// Uyarı testleri: %10 gerilim düşümü sınırı ve CLI'ın stderr'e yazdığı tek satırlık uyarılar.
// Beklenen düşümler satır üstündeki yorumlarda elle hesaplanmıştır.

import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli-core.js";
import {
  LARGE_DROP_WARNING_PERCENT,
  singlePhaseVoltageDropCurrentForm,
  singlePhaseVoltageDropPowerForm,
  singlePhaseVoltageDropResistive,
  threePhaseVoltageDropCurrentForm,
  threePhaseVoltageDropPowerForm,
  threePhaseVoltageDropResistive,
} from "../src/index.js";

const singleCurrent = (currentA: number) =>
  singlePhaseVoltageDropCurrentForm({ currentA, lengthM: 1000, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0, powerFactor: 1, powerFactorType: "lagging", nominalVoltageV: 100 });

describe("gerilim düşümü %10 sınırı", () => {
  it("sınır değeri 10'dur", () => {
    expect(LARGE_DROP_WARNING_PERCENT).toBe(10);
  });

  it("tam %10 uyarı vermez: 2·5 A·1 km·1 Ω/km = 10 V; 10/100 = %10", () => {
    const r = singleCurrent(5);
    expect(r.voltageDropPercent).toBe(10);
    expect(r.warnings).toEqual([]);
  });

  it("sınırın hemen altı uyarı vermez: 2·4,99·1·1 = 9,98 V = %9,98", () => {
    const r = singleCurrent(4.99);
    expect(r.voltageDropPercent).toBeCloseTo(9.98, 10);
    expect(r.warnings).toEqual([]);
  });

  it("sınırın hemen üstü uyarı verir: 2·5,01·1·1 = 10,02 V = %10,02", () => {
    const r = singleCurrent(5.01);
    expect(r.voltageDropPercent).toBeCloseTo(10.02, 10);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]?.code).toBe("LARGE_DROP_APPROXIMATION");
    expect(r.warnings[0]?.messageTr).toContain("%10");
    expect(r.warnings[0]?.messageEn).toContain("10%");
  });

  it("uyarı sayısal sonucu değiştirmez", () => {
    expect(singleCurrent(5.01).voltageDropV).toBe(2 * 5.01 * (1000 / 1000) * 1);
  });

  it("gerilim yükselmesinde mutlak değer kullanılır: 2·1·(1 − 501)/100 = −10 V; 2·1·(1 − 502)/100 = −10,02 V", () => {
    const line = { activePowerW: 1, lengthM: 1000, resistanceOhmPerKm: 1, reactanceOhmPerKm: 1, nominalVoltageV: 100 };
    const atLimit = singlePhaseVoltageDropPowerForm({ ...line, reactivePowerVar: -501 });
    expect(atLimit.voltageDropPercent).toBe(-10);
    expect(atLimit.warnings).toEqual([]);
    const over = singlePhaseVoltageDropPowerForm({ ...line, reactivePowerVar: -502 });
    expect(over.voltageDropPercent).toBeCloseTo(-10.02, 10);
    expect(over.warnings).toHaveLength(1);
  });

  it("üç faz güç biçimi: 1 km·1 Ω/km·1000 W/100 V = 10 V; 1001 W ile 10,01 V", () => {
    const line = { reactivePowerVar: 0, lengthM: 1000, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0, nominalLineVoltageV: 100 };
    expect(threePhaseVoltageDropPowerForm({ ...line, activePowerW: 1000 }).warnings).toEqual([]);
    expect(threePhaseVoltageDropPowerForm({ ...line, activePowerW: 1001 }).warnings).toHaveLength(1);
  });

  it("dirençli biçim: 2·100·10/(50·4) = 10 V; A = 3,9 mm² ile 10,26 V", () => {
    const line = { currentA: 10, powerFactor: 1, lengthM: 100, conductivityMPerOhmMm2: 50, nominalVoltageV: 100 };
    expect(singlePhaseVoltageDropResistive({ ...line, sectionMm2: 4 }).warnings).toEqual([]);
    expect(singlePhaseVoltageDropResistive({ ...line, sectionMm2: 3.9 }).warnings).toHaveLength(1);
  });

  it("üç faz akım ve dirençli biçimler: √3·10 A·1 km·1 Ω/km = 17,32 V; 400 V'ta %4,33, 100 V'ta %17,32", () => {
    const line = { lineCurrentA: 10, lengthM: 1000, resistanceOhmPerKm: 1, reactanceOhmPerKm: 0, powerFactor: 1, powerFactorType: "lagging" as const };
    expect(threePhaseVoltageDropCurrentForm({ ...line, nominalLineVoltageV: 400 }).warnings).toEqual([]);
    expect(threePhaseVoltageDropCurrentForm({ ...line, nominalLineVoltageV: 100 }).warnings).toHaveLength(1);
    const res = { lineCurrentA: 10, powerFactor: 1, lengthM: 1000, conductivityMPerOhmMm2: 50, sectionMm2: 20 };
    expect(threePhaseVoltageDropResistive({ ...res, nominalLineVoltageV: 400 }).warnings).toEqual([]);
    expect(threePhaseVoltageDropResistive({ ...res, nominalLineVoltageV: 100 }).warnings).toHaveLength(1);
  });
});

describe("CLI gerilim düşümü uyarısı", () => {
  const args = (currentA: string, lang: string[] = []) => ["single-phase-drop-current", "--current-a", currentA, "--length-m", "1000", "--resistance-ohm-per-km", "1", "--reactance-ohm-per-km", "0", "--power-factor", "1", "--power-factor-type", "lagging", "--nominal-voltage-v", "100", ...lang];

  it("tam %10'da stderr'de düşüm uyarısı yoktur", () => {
    const r = runCli(args("5"));
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe("voltageDropV = 10\nvoltageDropPercent = 10");
    expect(r.stderr).not.toContain("GERİLİM DÜŞÜMÜ UYARISI");
  });

  it("%10'un üstünde stderr'e seçilen dilde yazılır, stdout yalnız sayı içerir", () => {
    const tr = runCli(args("5.01"));
    expect(tr.exitCode).toBe(0);
    expect(tr.stderr).toContain("GERİLİM DÜŞÜMÜ UYARISI");
    expect(tr.stdout.split("\n")).toHaveLength(2);
    expect(tr.stdout).not.toContain("warnings");
    const en = runCli(args("5.01", ["--lang", "en"]));
    expect(en.stderr).toContain("VOLTAGE DROP WARNING");
    expect(en.stderr).not.toContain("GERİLİM");
    expect(en.stdout).toBe(tr.stdout);
  });

  it("--json çıktısı uyarıları makinece okunur alanda taşır", () => {
    const parsed = JSON.parse(runCli([...args("5.01"), "--json"]).stdout) as { result: { warnings: { code: string }[] } };
    expect(parsed.result.warnings[0]?.code).toBe("LARGE_DROP_APPROXIMATION");
  });
});

describe("CLI kısa devre ve kesit uyarıları", () => {
  const shortCircuit: [string, string][] = [
    ["three-phase-short-circuit --line-voltage-v 400 --impedance-per-phase-ohm 0.05", "shortCircuitCurrentA = 4618.802153517006"],
    ["single-phase-short-circuit --line-to-neutral-voltage-v 230 --loop-impedance-ohm 0.5", "shortCircuitCurrentA = 460"],
    ["transformer-short-circuit --rated-current-a 100 --impedance-voltage-percent 4", "shortCircuitCurrentA = 2500"],
  ];

  it.each(shortCircuit)("%s: uyarı stderr'de tek satır, stdout değişmez", (command, stdout) => {
    const tr = runCli(command.split(" "));
    expect(tr.exitCode).toBe(0);
    expect(tr.stdout).toBe(stdout);
    const lineTr = tr.stderr.split("\n").filter((line) => line.startsWith("KISA DEVRE UYARISI"));
    expect(lineTr).toHaveLength(1);
    for (const word of ["gerilim faktörü", "motor katkısı", "tepe akımı", "DC bileşen", "KULLANILMAMALIDIR"]) {
      expect(lineTr[0]).toContain(word);
    }
    const en = runCli([...command.split(" "), "--lang", "en"]);
    expect(en.stdout).toBe(stdout);
    const lineEn = en.stderr.split("\n").filter((line) => line.startsWith("SHORT-CIRCUIT WARNING"));
    expect(lineEn).toHaveLength(1);
    for (const word of ["voltage factor", "motor contribution", "peak current", "DC component", "must NOT"]) {
      expect(lineEn[0]).toContain(word);
    }
  });

  it("kesit komutları teorik alt sınır uyarısı yazar, stdout değişmez", () => {
    const base = ["--power-factor", "1", "--power-factor-type", "lagging", "--length-m", "50", "--conductivity-m-per-ohm-mm2", "56", "--reactance-ohm-per-km", "0", "--max-voltage-drop-percent", "3"];
    const three = runCli(["three-phase-min-section", "--line-current-a", "32", "--nominal-line-voltage-v", "400", ...base]);
    expect(three.stdout).toBe("sectionMm2 = 4.123930494211613");
    expect(three.stderr).toContain("KESİT UYARISI");
    expect(three.stderr).toContain("Teorik alt sınır");
    const one = runCli(["single-phase-min-section", "--current-a", "16", "--nominal-voltage-v", "230", ...base, "--lang", "en"]);
    expect(one.stderr).toContain("theoretical lower bound");
    expect(one.stderr).toContain("ampacity");
    expect(one.stderr).toContain("standard-size");
  });

  it("uyarısı olmayan komut yalnız genel uyarıyı yazar; hatalı girdide hesap uyarısı yazılmaz", () => {
    expect(runCli(["energy", "--active-power-w", "100", "--duration-h", "1"]).stderr.split("\n")).toHaveLength(1);
    const bad = runCli(["three-phase-short-circuit", "--line-voltage-v", "-1", "--impedance-per-phase-ohm", "0.05"]);
    expect(bad.exitCode).toBe(1);
    expect(bad.stderr).not.toContain("KISA DEVRE UYARISI");
  });

  it("komut yardımı da uyarıyı gösterir", () => {
    expect(runCli(["three-phase-short-circuit", "--help"]).stdout).toContain("KISA DEVRE UYARISI");
    expect(runCli(["three-phase-min-section", "--help"]).stdout).toContain("KESİT UYARISI");
  });
});
