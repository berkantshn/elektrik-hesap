// Komut satırı testleri: ayrıştırma, dil seçimi, çıkış kodları ve çıktı biçimi.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMMANDS, VERSION, flagFor, runCli } from "../src/cli-core.js";
import * as api from "../src/index.js";
import { SPECS, type Fn } from "./specs.js";

describe("bayrak adları", () => {
  it.each([
    ["activePowerW", "--active-power-w"],
    ["ratedPowerKVA", "--rated-power-kva"],
    ["activePowerKW", "--active-power-kw"],
    ["energyKWh", "--energy-kwh"],
    ["unitPricePerKWh", "--unit-price-per-kwh"],
    ["conductivityMPerOhmMm2", "--conductivity-m-per-ohm-mm2"],
    ["resistivityOhmMm2PerM", "--resistivity-ohm-mm2-per-m"],
    ["apparentPowerVA", "--apparent-power-va"],
  ])("%s → %s", (param, flag) => {
    expect(flagFor(param)).toBe(flag);
  });
});

describe("hesaplama", () => {
  it("üç faz akım: 15000/(√3·400·0,85) = 25,4713 A", () => {
    const r = runCli(["three-phase-current", "--active-power-w", "15000", "--line-voltage-v", "400", "--power-factor", "0.85"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/^lineCurrentA = 25\.471/);
    expect(r.stderr).toContain("UYARI");
  });

  it("Türkçe takma ad aynı komutu çalıştırır", () => {
    const r = runCli(["uc-faz-akim", "--active-power-w", "15000", "--line-voltage-v", "400", "--power-factor", "0.85"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/^lineCurrentA = 25\.471/);
  });

  it("--json makinece okunur çıktı verir: 3000 W, 4000 VAr → 5000 VA", () => {
    const r = runCli(["power-triangle-pq", "--active-power-w", "3000", "--reactive-power-var", "4000", "--json"]);
    const parsed = JSON.parse(r.stdout) as { result: { apparentPowerVA: number; powerFactorType: string } };
    expect(parsed.result.apparentPowerVA).toBe(5000);
    expect(parsed.result.powerFactorType).toBe("lagging");
  });

  it("negatif değer bayrak sanılmaz: Q = −3000 VAr", () => {
    const r = runCli(["power-triangle-pq", "--active-power-w", "4000", "--reactive-power-var", "-3000"]);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("powerFactorType = leading");
  });

  it("bilimsel gösterim kabul edilir: 1e3 W, 1 h → 1 kWh", () => {
    const r = runCli(["energy", "--active-power-w", "1e3", "--duration-h", "1"]);
    expect(r.stdout).toBe("energyKWh = 1");
  });

  it("birden çok alanlı sonuç satır satır yazılır: 2 V, %0,869…", () => {
    const r = runCli(["single-phase-drop-current", "--current-a", "10", "--length-m", "100", "--resistance-ohm-per-km", "1", "--reactance-ohm-per-km", "0", "--power-factor", "1", "--power-factor-type", "lagging", "--nominal-voltage-v", "230"]);
    expect(r.stdout.split("\n")[0]).toBe("voltageDropV = 2");
    expect(r.stdout.split("\n")[1]).toMatch(/^voltageDropPercent = 0\.8695/);
  });
});

describe("hata durumları", () => {
  const ok = ["energy", "--active-power-w", "100", "--duration-h", "1"];

  it("geçersiz değer: çıkış kodu 1, seçilen dilde mesaj", () => {
    const tr = runCli(["energy", "--active-power-w", "-5", "--duration-h", "1"]);
    expect(tr.exitCode).toBe(1);
    expect(tr.stdout).toBe("");
    expect(tr.stderr).toContain("sıfırdan büyük");
    const en = runCli(["energy", "--active-power-w", "-5", "--duration-h", "1", "--lang", "en"]);
    expect(en.exitCode).toBe(1);
    expect(en.stderr).toContain("greater than zero");
  });

  it.each([
    ["0,85"], ["12abc"], [""], ["Infinity"], ["NaN"], ["0x10"], ["1 000"],
  ])("sayı olmayan %j reddedilir", (raw) => {
    const r = runCli(["energy", "--active-power-w", raw, "--duration-h", "1"]);
    expect(r.exitCode).toBe(2);
    expect(r.stderr).toContain("geçersiz sayı");
  });

  it("eksik, bilinmeyen ve tekrarlı parametre reddedilir", () => {
    expect(runCli(["energy", "--active-power-w", "100"]).stderr).toContain("--duration-h");
    expect(runCli(["energy", "--active-power-w", "100"]).exitCode).toBe(2);
    expect(runCli([...ok, "--foo", "1"]).exitCode).toBe(2);
    expect(runCli([...ok, "--duration-h", "2"]).exitCode).toBe(2);
    expect(runCli(["energy", "--active-power-w"]).stderr).toContain("eksik");
  });

  it("bilinmeyen komut ve geçersiz dil reddedilir", () => {
    expect(runCli(["bilinmeyen"]).exitCode).toBe(2);
    expect(runCli(["bilinmeyen", "--lang", "en"]).stderr).toContain("Unknown command");
    expect(runCli([...ok, "--lang", "de"]).exitCode).toBe(2);
  });

  it("yardım çıktıları güvenlik uyarısını içerir", () => {
    expect(runCli(["--help"]).stdout).toContain("UYARI");
    expect(runCli(["--help"]).exitCode).toBe(0);
    expect(runCli(["--help", "--lang", "en"]).stdout).toContain("WARNING");
    expect(runCli([]).exitCode).toBe(2);
    expect(runCli(["energy", "--help"]).stdout).toContain("--duration-h");
  });
});

describe("tutarlılık", () => {
  it("sürüm package.json ile aynıdır", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
    expect(runCli(["--version"]).stdout).toBe(pkg.version);
    expect(VERSION).toBe(pkg.version);
  });

  it("komut ve takma adlar benzersizdir", () => {
    const names = COMMANDS.flatMap((c) => [c.name, c.aliasTr]);
    expect(new Set(names).size).toBe(names.length);
  });

  const functions = api as unknown as Record<string, Fn>;

  it("her dışa aktarılan fonksiyonun tam bir komutu vardır", () => {
    expect(COMMANDS.length).toBe(SPECS.length);
    for (const spec of SPECS) {
      expect(COMMANDS.filter((c) => (c.fn as unknown) === functions[spec.fn]).length, spec.fn).toBe(1);
    }
  });

  it.each(SPECS)("$fn: komut (ve Türkçe takma ad) doğrudan çağrıyla aynı sonucu verir", ({ fn, valid }) => {
    const direct = (functions[fn] as Fn)(valid);
    const command = COMMANDS.find((c) => (c.fn as unknown) === functions[fn]);
    if (!command) throw new Error(`komut yok: ${fn}`);
    expect(command.params.map(([name]) => name).sort()).toEqual(Object.keys(valid).sort());
    const flags = Object.entries(valid).flatMap(([key, value]) => [flagFor(key), String(value)]);
    for (const name of [command.name, command.aliasTr]) {
      const r = runCli([name, ...flags, "--json"]);
      expect(r.exitCode).toBe(0);
      const { result } = JSON.parse(r.stdout) as { result: Record<string, unknown> };
      if (typeof direct === "number") expect(result).toEqual({ [command.resultName]: direct });
      else expect(result).toEqual(direct);
    }
  });
});
