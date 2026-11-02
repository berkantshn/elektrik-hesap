#!/usr/bin/env python3
"""Bağımsız doğrulama. TypeScript koduyla formül paylaşmaz; yalnızca standart kütüphane kullanır.

Dört aşama:
  1. tests/hand-cases.test.ts içindeki elle yazılmış değerler Python'da yeniden hesaplanır
     (Decimal, 60 basamak) ve hem elle yazılan değerle hem TypeScript sonucuyla karşılaştırılır.
  2. Rastgele (sabit tohumlu) girdilerle aynı karşılaştırma tekrarlanır.
  3. İlk prensipler: zaman alanında üç faz benzetimi, fazör çözümü, kompanzasyon fazörü ve
     minimum kesit için ikiye bölme (bisection) ile formül kullanmadan kontrol.
  4. Derlenmiş komut satırı (dist/cli.js) gerçek süreç olarak çalıştırılır.

Çalıştırmadan önce `pnpm build` gerekir; `pnpm verify` ile başlatılır.
"""

import cmath
import json
import math
import random
import re
import subprocess
import sys
from decimal import Decimal, getcontext
from pathlib import Path

getcontext().prec = 60
ROOT = Path(__file__).resolve().parent.parent
D = lambda x: Decimal(str(x))  # noqa: E731
ROOT3 = Decimal(3).sqrt()
HAND_REL_TOL = 1e-5  # elle yazılan değerler 6-7 anlamlı basamaklıdır
CODE_REL_TOL = 1e-9  # TypeScript ile Python arasında beklenen uyum


class Rejected(Exception):
    """Girdi fiziksel olarak anlamsız; kütüphane de hata vermeli."""


def sin_of(pf):
    return (1 - pf * pf).sqrt()


def signed(kind):
    return Decimal(1) if kind == "lagging" else Decimal(-1)


# --- Bağımsız hesaplar. Mümkün olan yerde kütüphanedeki biçimden farklı yazılmıştır. ---

def tri(p, q, s, pf):
    kind = "lagging" if q > 0 else "leading" if q < 0 else "unity"
    return {
        "activePowerW": p, "reactivePowerVar": q, "apparentPowerVA": s, "powerFactor": pf,
        "powerFactorType": kind, "phaseAngleDeg": Decimal(math.degrees(math.atan2(float(q), float(p)))),
    }


def tri_pq(a):
    p, q = D(a["activePowerW"]), D(a["reactivePowerVar"])
    s = (p * p + q * q).sqrt()
    return tri(p, q, s, p / s)


def tri_p_pf(a):
    p, pf = D(a["activePowerW"]), D(a["powerFactor"])
    return tri(p, signed(a["powerFactorType"]) * p * sin_of(pf) / pf, p / pf, pf)


def tri_s_pf(a):
    s, pf = D(a["apparentPowerVA"]), D(a["powerFactor"])
    return tri(s * pf, signed(a["powerFactorType"]) * s * sin_of(pf), s, pf)


def capacitor(a):
    # tanφ = √(1/cos²φ − 1)
    tan = lambda pf: (1 / (pf * pf) - 1).sqrt()  # noqa: E731
    return D(a["activePowerKW"]) * (tan(D(a["initialPowerFactor"])) - tan(D(a["targetPowerFactor"])))


def drop_result(volts, nominal):
    pct = volts / nominal * 100
    if abs(pct) >= 100:
        raise Rejected
    return {"voltageDropV": volts, "voltageDropPercent": pct}


def drop_current(a, current, nominal, legs_factor):
    # Birim empedans ile akımın aktif/reaktif bileşenleri ayrı ayrı çarpılır.
    pf = D(a["powerFactor"])
    length_km = D(a["lengthM"]) / 1000
    i = D(a[current])
    i_active, i_reactive = i * pf, signed(a["powerFactorType"]) * i * sin_of(pf)
    per_conductor = length_km * (D(a["resistanceOhmPerKm"]) * i_active + D(a["reactanceOhmPerKm"]) * i_reactive)
    return drop_result(legs_factor * per_conductor, D(a[nominal]))


def drop_power(a, nominal, single_phase):
    # Güç, anma gerilimiyle akım bileşenlerine çevrilir, sonra iletken başına düşüm bulunur.
    v = D(a[nominal])
    length_km = D(a["lengthM"]) / 1000
    if single_phase:
        i_a, i_r = D(a["activePowerW"]) / v, D(a["reactivePowerVar"]) / v
        k = Decimal(2)
    else:
        v_ph = v / ROOT3
        i_a, i_r = D(a["activePowerW"]) / (3 * v_ph), D(a["reactivePowerVar"]) / (3 * v_ph)
        k = ROOT3
    return drop_result(k * length_km * (D(a["resistanceOhmPerKm"]) * i_a + D(a["reactanceOhmPerKm"]) * i_r), v)


def drop_resistive(a, current, nominal, k):
    # ρ = 1/γ, tek iletken direnci R = ρ·L/A
    r = (1 / D(a["conductivityMPerOhmMm2"])) * D(a["lengthM"]) / D(a["sectionMm2"])
    return drop_result(k * r * D(a[current]) * D(a["powerFactor"]), D(a[nominal]))


def resistance(a):
    delta_t = D(a["temperatureC"]) - D(a["referenceTemperatureC"])
    rho_t = D(a["resistivityOhmMm2PerM"]) + D(a["resistivityOhmMm2PerM"]) * D(a["temperatureCoefficientPerC"]) * delta_t
    return rho_t * D(a["lengthM"]) / D(a["sectionMm2"])


def min_section_by_bisection(a, current, nominal, k):
    """Kapalı formül kullanmaz: düşüm(A) = limit denklemini sayısal çözer."""
    pf = float(a["powerFactor"])
    sin = math.sqrt(1 - pf * pf)
    sign = 1 if a["powerFactorType"] == "lagging" else -1
    limit = a["maxVoltageDropPercent"] / 100 * a[nominal]
    i, km, gamma, x = a[current], a["lengthM"] / 1000, a["conductivityMPerOhmMm2"], a["reactanceOhmPerKm"]

    def drop(area):
        return k * i * km * (1000 / (gamma * area) * pf + sign * x * sin)

    if k * i * km * sign * x * sin >= limit:  # A → ∞ iken bile limit aşılıyor
        raise Rejected
    lo, hi = 1e-12, 1.0
    while drop(hi) > limit:
        hi *= 2
    for _ in range(300):
        mid = math.sqrt(lo * hi)
        if drop(mid) > limit:
            lo = mid
        else:
            hi = mid
    return Decimal(hi)


def impedance(a):
    r, x = D(a["resistanceOhm"]), D(a["reactanceOhm"])
    return (r * r + x * x).sqrt()


INDEPENDENT = {
    "singlePhaseActivePowerW": lambda a: D(a["voltageV"]) * D(a["currentA"]) * D(a["powerFactor"]),
    # Üç faz değerleri faz-nötr gerilim üzerinden, faz başına güç ×3 olarak hesaplanır.
    "threePhaseActivePowerW": lambda a: 3 * (D(a["lineVoltageV"]) / ROOT3) * D(a["lineCurrentA"]) * D(a["powerFactor"]),
    "singlePhaseApparentPowerVA": lambda a: D(a["voltageV"]) * D(a["currentA"]),
    "threePhaseApparentPowerVA": lambda a: 3 * (D(a["lineVoltageV"]) / ROOT3) * D(a["lineCurrentA"]),
    "singlePhaseCurrentA": lambda a: D(a["activePowerW"]) / D(a["powerFactor"]) / D(a["voltageV"]),
    "threePhaseLineCurrentA": lambda a: (D(a["activePowerW"]) / 3) / D(a["powerFactor"]) / (D(a["lineVoltageV"]) / ROOT3),
    "singlePhaseVoltageV": lambda a: D(a["activePowerW"]) / D(a["powerFactor"]) / D(a["currentA"]),
    "threePhaseLineVoltageV": lambda a: ROOT3 * (D(a["activePowerW"]) / 3) / D(a["powerFactor"]) / D(a["lineCurrentA"]),
    "lineToNeutralVoltageV": lambda a: D(a["lineVoltageV"]) * ROOT3 / 3,
    "lineToLineVoltageV": lambda a: 3 * D(a["lineToNeutralVoltageV"]) / ROOT3,
    "powerTriangleFromPQ": tri_pq,
    "powerTriangleFromPAndPF": tri_p_pf,
    "powerTriangleFromSAndPF": tri_s_pf,
    "correctionCapacitorKvar": capacitor,
    "singlePhaseVoltageDropCurrentForm": lambda a: drop_current(a, "currentA", "nominalVoltageV", Decimal(2)),
    "threePhaseVoltageDropCurrentForm": lambda a: drop_current(a, "lineCurrentA", "nominalLineVoltageV", ROOT3),
    "singlePhaseVoltageDropPowerForm": lambda a: drop_power(a, "nominalVoltageV", True),
    "threePhaseVoltageDropPowerForm": lambda a: drop_power(a, "nominalLineVoltageV", False),
    "singlePhaseVoltageDropResistive": lambda a: drop_resistive(a, "currentA", "nominalVoltageV", Decimal(2)),
    "threePhaseVoltageDropResistive": lambda a: drop_resistive(a, "lineCurrentA", "nominalLineVoltageV", ROOT3),
    "conductorResistanceOhm": resistance,
    "resistanceOhmPerKmFromConductivity": lambda a: Decimal(1000) / D(a["conductivityMPerOhmMm2"]) / D(a["sectionMm2"]),
    "singlePhaseMinimumSectionMm2": lambda a: min_section_by_bisection(a, "currentA", "nominalVoltageV", 2.0),
    "threePhaseMinimumSectionMm2": lambda a: min_section_by_bisection(a, "lineCurrentA", "nominalLineVoltageV", math.sqrt(3)),
    "impedanceMagnitudeOhm": impedance,
    "threePhaseShortCircuitCurrentA": lambda a: (D(a["lineVoltageV"]) / ROOT3) / D(a["impedancePerPhaseOhm"]),
    "singlePhaseShortCircuitCurrentA": lambda a: D(a["lineToNeutralVoltageV"]) / D(a["loopImpedanceOhm"]),
    "transformerShortCircuitCurrentA": lambda a: D(a["ratedCurrentA"]) / (D(a["impedanceVoltagePercent"]) / 100),
    "transformerRatedCurrentThreePhaseA": lambda a: (D(a["ratedPowerKVA"]) * 1000 / 3) / (D(a["lineVoltageV"]) / ROOT3),
    "transformerRatedCurrentSinglePhaseA": lambda a: D(a["ratedPowerKVA"]) * 1000 / D(a["voltageV"]),
    "energyKWh": lambda a: D(a["activePowerW"]) / 1000 * D(a["durationH"]),
    "energyCost": lambda a: D(a["energyKWh"]) * D(a["unitPricePerKWh"]),
}


# --- Köprü ve karşılaştırma ---

def run_ts(cases):
    done = subprocess.run(
        ["node", str(ROOT / "verify" / "run-cases.mjs")],
        input=json.dumps(cases), capture_output=True, text=True, encoding="utf-8", check=False,
    )
    if done.returncode != 0:
        sys.exit(f"Köprü hatası (önce `pnpm build` çalıştırın):\n{done.stderr}")
    return json.loads(done.stdout)


def differs(a, b, rel, abs_tol=1e-9):
    return abs(float(a) - float(b)) > rel * abs(float(b)) + abs_tol


def compare(py, ts, rel):
    """Eşleşmeyen alanların listesini döndürür."""
    if isinstance(py, dict):
        bad = []
        for key, value in py.items():
            if isinstance(value, str):
                if ts[key] != value:
                    bad.append((key, value, ts[key]))
            elif differs(ts[key], value, rel):
                bad.append((key, float(value), ts[key]))
        return bad
    return [("value", float(py), ts)] if differs(ts, py, rel) else []


def parse_hand_cases():
    text = (ROOT / "tests" / "hand-cases.test.ts").read_text(encoding="utf-8")
    cases = []
    pattern = re.compile(r'^\s*hand\("(\w+)", "(\w+)", (\{.*?\}), (\{.*\}|-?[\d.eE+-]+)\);\s*$', re.M)
    for case_id, fn, raw_input, raw_expected in pattern.findall(text):
        to_json = lambda s: re.sub(r"(\w+):", r'"\1":', s)  # noqa: E731
        cases.append((case_id, fn, json.loads(to_json(raw_input)), json.loads(to_json(raw_expected))))
    declared = len(re.findall(r'^\s*hand\("', text, re.M))
    if declared != len(cases):
        sys.exit(f"Ayrıştırma hatası: {declared} hand() satırından {len(cases)} tanesi okunabildi")
    return cases


def stage_hand():
    cases = parse_hand_cases()
    ts_results = run_ts([{"fn": fn, "input": i} for _, fn, i, _ in cases])
    failures = 0
    for (case_id, fn, input_, expected), ts in zip(cases, ts_results):
        py = INDEPENDENT[fn](input_)
        # Python ↔ elle yazılan değer
        if isinstance(expected, dict):
            hand_bad = compare({k: py[k] for k in expected}, expected, HAND_REL_TOL)
        else:
            hand_bad = compare(py, expected, HAND_REL_TOL)
        # Python ↔ TypeScript
        code_bad = compare(py, ts["value"], CODE_REL_TOL) if ts["ok"] else [("error", ts["code"])]
        if hand_bad or code_bad:
            failures += 1
            print(f"  FARK {case_id} {fn}: el={hand_bad} ts={code_bad}")
    missing = set(INDEPENDENT) - {fn for _, fn, _, _ in cases}
    if missing:
        print(f"  EL VAKASI OLMAYAN FONKSİYONLAR: {sorted(missing)}")
        failures += 1
    print(f"[1] Elle yazılan vakalar: {len(cases)} vaka, {len({c[1] for c in cases})} fonksiyon, {failures} fark")
    return failures


def log_uniform(rng, lo, hi):
    return math.exp(rng.uniform(math.log(lo), math.log(hi)))


def random_input(fn, rng):
    pf = rng.uniform(0.05, 1.0)
    kind = rng.choice(["lagging", "leading"])
    v, i = log_uniform(rng, 12, 40000), log_uniform(rng, 0.1, 5000)
    p = log_uniform(rng, 1, 5e6)
    length, r, x = log_uniform(rng, 1, 5000), log_uniform(rng, 0.01, 10), rng.choice([0.0, log_uniform(rng, 0.01, 0.5)])
    q = rng.uniform(-3e6, 3e6)
    gamma, area = rng.uniform(20, 60), log_uniform(rng, 0.5, 630)
    limit = rng.uniform(0.1, 20)
    return {
        "singlePhaseActivePowerW": {"voltageV": v, "currentA": i, "powerFactor": pf},
        "threePhaseActivePowerW": {"lineVoltageV": v, "lineCurrentA": i, "powerFactor": pf},
        "singlePhaseApparentPowerVA": {"voltageV": v, "currentA": i},
        "threePhaseApparentPowerVA": {"lineVoltageV": v, "lineCurrentA": i},
        "singlePhaseCurrentA": {"activePowerW": p, "voltageV": v, "powerFactor": pf},
        "threePhaseLineCurrentA": {"activePowerW": p, "lineVoltageV": v, "powerFactor": pf},
        "singlePhaseVoltageV": {"activePowerW": p, "currentA": i, "powerFactor": pf},
        "threePhaseLineVoltageV": {"activePowerW": p, "lineCurrentA": i, "powerFactor": pf},
        "lineToNeutralVoltageV": {"lineVoltageV": v},
        "lineToLineVoltageV": {"lineToNeutralVoltageV": v},
        "powerTriangleFromPQ": {"activePowerW": p, "reactivePowerVar": q},
        "powerTriangleFromPAndPF": {"activePowerW": p, "powerFactor": pf, "powerFactorType": kind},
        "powerTriangleFromSAndPF": {"apparentPowerVA": p, "powerFactor": pf, "powerFactorType": kind},
        "correctionCapacitorKvar": {"activePowerKW": p / 1000, "initialPowerFactor": pf, "targetPowerFactor": rng.uniform(pf, 1.0)},
        "singlePhaseVoltageDropCurrentForm": {"currentA": i, "lengthM": length, "resistanceOhmPerKm": r, "reactanceOhmPerKm": x, "powerFactor": pf, "powerFactorType": kind, "nominalVoltageV": v},
        "threePhaseVoltageDropCurrentForm": {"lineCurrentA": i, "lengthM": length, "resistanceOhmPerKm": r, "reactanceOhmPerKm": x, "powerFactor": pf, "powerFactorType": kind, "nominalLineVoltageV": v},
        "singlePhaseVoltageDropPowerForm": {"activePowerW": p, "reactivePowerVar": q, "lengthM": length, "resistanceOhmPerKm": r, "reactanceOhmPerKm": x, "nominalVoltageV": v},
        "threePhaseVoltageDropPowerForm": {"activePowerW": p, "reactivePowerVar": q, "lengthM": length, "resistanceOhmPerKm": r, "reactanceOhmPerKm": x, "nominalLineVoltageV": v},
        "singlePhaseVoltageDropResistive": {"currentA": i, "powerFactor": pf, "lengthM": length, "conductivityMPerOhmMm2": gamma, "sectionMm2": area, "nominalVoltageV": v},
        "threePhaseVoltageDropResistive": {"lineCurrentA": i, "powerFactor": pf, "lengthM": length, "conductivityMPerOhmMm2": gamma, "sectionMm2": area, "nominalLineVoltageV": v},
        "conductorResistanceOhm": {"resistivityOhmMm2PerM": rng.uniform(0.015, 0.04), "referenceTemperatureC": rng.uniform(0, 80), "temperatureCoefficientPerC": rng.uniform(0, 0.005), "temperatureC": rng.uniform(-40, 160), "lengthM": length, "sectionMm2": area},
        "resistanceOhmPerKmFromConductivity": {"conductivityMPerOhmMm2": gamma, "sectionMm2": area},
        "singlePhaseMinimumSectionMm2": {"currentA": i, "powerFactor": pf, "powerFactorType": kind, "lengthM": length, "conductivityMPerOhmMm2": gamma, "reactanceOhmPerKm": x, "nominalVoltageV": v, "maxVoltageDropPercent": limit},
        "threePhaseMinimumSectionMm2": {"lineCurrentA": i, "powerFactor": pf, "powerFactorType": kind, "lengthM": length, "conductivityMPerOhmMm2": gamma, "reactanceOhmPerKm": x, "nominalLineVoltageV": v, "maxVoltageDropPercent": limit},
        "impedanceMagnitudeOhm": {"resistanceOhm": r, "reactanceOhm": x},
        "threePhaseShortCircuitCurrentA": {"lineVoltageV": v, "impedancePerPhaseOhm": r},
        "singlePhaseShortCircuitCurrentA": {"lineToNeutralVoltageV": v, "loopImpedanceOhm": r},
        "transformerShortCircuitCurrentA": {"ratedCurrentA": i, "impedanceVoltagePercent": rng.uniform(1, 20)},
        "transformerRatedCurrentThreePhaseA": {"ratedPowerKVA": p / 1000, "lineVoltageV": v},
        "transformerRatedCurrentSinglePhaseA": {"ratedPowerKVA": p / 1000, "voltageV": v},
        "energyKWh": {"activePowerW": p, "durationH": log_uniform(rng, 0.01, 10000)},
        "energyCost": {"energyKWh": p / 1000, "unitPricePerKWh": log_uniform(rng, 0.01, 50)},
    }[fn]


def stage_random(per_function=500):
    rng = random.Random(20261102)
    cases = [{"fn": fn, "input": random_input(fn, rng)} for fn in INDEPENDENT for _ in range(per_function)]
    results = run_ts(cases)
    failures = rejected_agree = warned_cases = 0
    for case, ts in zip(cases, results):
        fn, input_ = case["fn"], case["input"]
        rel = 1e-7 if "MinimumSection" in fn else CODE_REL_TOL
        try:
            py = INDEPENDENT[fn](input_)
        except Rejected:
            if ts["ok"]:
                failures += 1
                print(f"  FARK {fn}: Python reddetti, TS {ts['value']} döndürdü: {input_}")
            else:
                rejected_agree += 1
            continue
        if not ts["ok"]:
            failures += 1
            print(f"  FARK {fn}: TS {ts['code']} ile reddetti, Python {py}: {input_}")
            continue
        bad = compare(py, ts["value"], rel)
        if bad:
            failures += 1
            print(f"  FARK {fn}: {bad} girdi={input_}")
        if "VoltageDrop" in fn:
            # %10 sınırı Python'daki 60 basamaklı yüzdeye göre bağımsız olarak denetlenir.
            should_warn = abs(py["voltageDropPercent"]) > 10
            warned_cases += 1 if should_warn else 0
            if should_warn != (len(ts["value"]["warnings"]) == 1):
                failures += 1
                print(f"  FARK {fn} uyarı: beklenen {should_warn}, TS {ts['value']['warnings']}")
    print(f"[2] Rastgele vakalar: {len(cases)} vaka ({per_function}/fonksiyon), {rejected_agree} ortak ret, {warned_cases} %10 uyarısı, {failures} fark")
    return failures


def stage_first_principles():
    failures = 0
    rng = random.Random(7)

    # 3a. Zaman alanı: üç fazlı anlık v(t)·i(t) ortalaması; hiçbir √3 formülü kullanılmaz.
    inputs = []
    numeric = []
    samples = 720
    for _ in range(200):
        v_ph, i_rms, pf = rng.uniform(50, 20000), rng.uniform(1, 2000), rng.uniform(0.05, 1)
        phi = math.acos(pf)
        p_sum = 0.0
        ll_square = 0.0
        for n in range(samples):
            wt = 2 * math.pi * n / samples
            va, vb = [math.sqrt(2) * v_ph * math.cos(wt - k * 2 * math.pi / 3) for k in range(2)]
            vc = math.sqrt(2) * v_ph * math.cos(wt - 2 * 2 * math.pi / 3)
            ia, ib, ic = [math.sqrt(2) * i_rms * math.cos(wt - k * 2 * math.pi / 3 - phi) for k in range(3)]
            p_sum += va * ia + vb * ib + vc * ic
            ll_square += (va - vb) ** 2
        v_ll = math.sqrt(ll_square / samples)
        inputs.append({"fn": "threePhaseActivePowerW", "input": {"lineVoltageV": v_ll, "lineCurrentA": i_rms, "powerFactor": pf}})
        numeric.append(p_sum / samples)
    for ts, p in zip(run_ts(inputs), numeric):
        if differs(ts["value"], p, 1e-9):
            failures += 1
            print(f"  FARK zaman alanı P: {ts['value']} vs {p}")
    print(f"[3a] Zaman alanı üç faz benzetimi: {len(inputs)} vaka, birikimli fark {failures}")

    # 3b. Fazör: V_s = V_r + I·Z; yaklaşım ile tam çözüm arasındaki fark ölçülür.
    cases, truth = [], []
    for _ in range(500):
        v_r = rng.uniform(100, 700)
        pf, kind = rng.uniform(0.5, 1), rng.choice(["lagging", "leading"])
        length, r, x = rng.uniform(10, 500), rng.uniform(0.05, 2), rng.uniform(0, 0.2)
        i = 0.03 * v_r / max(2 * length / 1000 * math.hypot(r, x), 1e-9) * rng.uniform(0.1, 1)  # küçük düşüm bölgesi
        phi = math.acos(pf) * (1 if kind == "lagging" else -1)
        current = cmath.rect(i, -phi)
        z = 2 * length / 1000 * complex(r, x)
        v_s = v_r + current * z
        cases.append({"fn": "singlePhaseVoltageDropCurrentForm", "input": {"currentA": i, "lengthM": length, "resistanceOhmPerKm": r, "reactanceOhmPerKm": x, "powerFactor": pf, "powerFactorType": kind, "nominalVoltageV": v_r}})
        truth.append((abs(v_s) - v_r, v_r, abs(current * z)))
    worst_points = 0.0
    worst_ratio = 0.0
    for ts, (exact, v_r, drop_mag) in zip(run_ts(cases), truth):
        gap = abs(ts["value"]["voltageDropV"] - exact)
        worst_points = max(worst_points, gap / v_r * 100)
        # Teori: fark en fazla |I·Z|²/(2·V_r) kadar (Taylor ikinci mertebe sınırı).
        ratio = gap / (drop_mag**2 / (2 * v_r))
        worst_ratio = max(worst_ratio, ratio)
        if ratio > 1.01:
            failures += 1
            print(f"  FARK fazör sınırı aşıldı: oran {ratio}")
    print(f"[3b] Fazör ↔ yaklaşık düşüm (|IZ| ≤ %3 V): {len(cases)} vaka, en kötü fark {worst_points:.4f} yüzde puan, sınır oranı {worst_ratio:.3f}")

    # 3c. Kompanzasyon: kondansatör akımı fazör olarak eklenince cosφ hedefe ulaşmalı.
    cases, params = [], []
    for _ in range(300):
        p_kw, pf1 = rng.uniform(1, 1000), rng.uniform(0.3, 0.95)
        pf2 = rng.uniform(pf1, 1)
        cases.append({"fn": "correctionCapacitorKvar", "input": {"activePowerKW": p_kw, "initialPowerFactor": pf1, "targetPowerFactor": pf2}})
        params.append((p_kw, pf1, pf2))
    bad = 0
    for ts, (p_kw, pf1, pf2) in zip(run_ts(cases), params):
        v = 400.0
        load_current = cmath.rect(p_kw / (v * pf1), -math.acos(pf1))  # V = 400∠0 bir fazlı eşdeğer
        cap_current = complex(0, ts["value"] / v)
        total = load_current + cap_current
        if abs(math.cos(cmath.phase(total)) - pf2) > 1e-9:
            bad += 1
    failures += bad
    print(f"[3c] Kompanzasyon fazörü: {len(cases)} vaka, {bad} fark")

    # 3d. Kısa devre: faz başına devre V_ph/(R+jX); empedans fonksiyonu ile zincirlenir.
    cases, expected = [], []
    for _ in range(300):
        v_ll, r, x = rng.uniform(100, 40000), rng.uniform(0.001, 5), rng.uniform(0.001, 5)
        va = cmath.rect(v_ll / abs(1 - cmath.rect(1, -2 * math.pi / 3)), 0)  # |Va − Vb| = v_ll geometriden
        cases.append({"fn": "threePhaseShortCircuitCurrentA", "input": {"lineVoltageV": v_ll, "impedancePerPhaseOhm": abs(complex(r, x))}})
        expected.append(abs(va / complex(r, x)))
    bad = sum(1 for ts, e in zip(run_ts(cases), expected) if differs(ts["value"], e, 1e-9))
    failures += bad
    print(f"[3d] Kısa devre fazörü: {len(cases)} vaka, {bad} fark")
    return failures


def stage_cli():
    failures = 0
    checks = [
        (["three-phase-current", "--active-power-w", "15000", "--line-voltage-v", "400", "--power-factor", "0.85"], "lineCurrentA", 15000 / (math.sqrt(3) * 400 * 0.85)),
        (["uc-faz-kisa-devre", "--line-voltage-v", "400", "--impedance-per-phase-ohm", "0.05"], "shortCircuitCurrentA", 400 / math.sqrt(3) / 0.05),
        (["kompanzasyon-kvar", "--active-power-kw", "100", "--initial-power-factor", "0.8", "--target-power-factor", "1"], "capacitorKvar", 75.0),
        (["energy-cost", "--energy-kwh", "100", "--unit-price-per-kwh", "2.5"], "cost", 250.0),
        (["conductor-resistance", "--resistivity-ohm-mm2-per-m", "0.0172", "--reference-temperature-c", "20", "--temperature-coefficient-per-c", "0.00393", "--temperature-c", "-10", "--length-m", "100", "--section-mm2", "2.5"], "resistanceOhm", 0.0172 * (1 + 0.00393 * -30) * 100 / 2.5),
    ]
    for args, key, expected in checks:
        done = subprocess.run(["node", str(ROOT / "dist" / "cli.js"), *args, "--json"], capture_output=True, text=True, encoding="utf-8", check=False)
        if done.returncode != 0 or differs(json.loads(done.stdout)["result"][key], expected, 1e-12):
            failures += 1
            print(f"  FARK CLI {args}: {done.stdout} {done.stderr}")
    negative = subprocess.run(["node", str(ROOT / "dist" / "cli.js"), "energy", "--active-power-w", "-1", "--duration-h", "1"], capture_output=True, text=True, encoding="utf-8", check=False)
    if negative.returncode != 1:
        failures += 1
        print(f"  FARK CLI çıkış kodu: {negative.returncode}")
    print(f"[4] Gerçek CLI süreci: {len(checks) + 1} çağrı, {failures} fark")
    return failures


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    total = stage_hand() + stage_random() + stage_first_principles() + stage_cli()
    print(f"SONUÇ: {'BAŞARILI' if total == 0 else f'{total} FARK BULUNDU'}")
    return 0 if total == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
