> [!CAUTION]
> **GÜVENLİK UYARISI:** Bu yazılım yalnızca eğitim ve ön tasarım amaçlıdır. Yetkili bir mühendisin hesabının veya yürürlükteki standartların yerine geçmez. Yanlış kullanım yangın, elektrik çarpması veya maddi hasar riski doğurabilir. Hiçbir standarda uygunluk iddiası yoktur.
>
> **DÜRÜSTLÜK NOTU:** Bu araç, bir tasarım aracı olarak yetkili bir elektrik mühendisi tarafından incelenmemiştir. Bağımsız kontroller aynı yapay zekâ destekli yazar tarafından yazılmıştır. Yayımlanmış bir ders kitabının çözümlü örnekleriyle henüz doğrulanmamıştır. **Son tasarım, koruma cihazı seçimi, kesme kapasitesi veya kablo boyutlandırması için kullanmayın.**
>
> **SAFETY NOTICE:** This software is an educational and pre-design aid only. It is not a substitute for a licensed engineer's calculation or applicable standards. Wrong use may risk fire, electric shock or property damage. No standard compliance is claimed.
>
> **HONESTY NOTICE:** This tool has not been reviewed by a licensed electrical engineer as a design tool. The independent checks were written by the same AI-assisted author. It has not yet been validated against published textbook worked examples. **Do not use it for final design, protection device selection, breaking capacity or cable sizing.**

# elektrik-hesap

Temel elektrik hesapları için sıfır bağımlılıklı TypeScript kütüphanesi ve komut satırı aracı.
*Zero-dependency TypeScript library and CLI for basic electrical engineering calculations. [English below.](#english)*

- **Hesaplar:** bir ve üç faz güç, akım, gerilim; P/Q/S ve güç katsayısı; kompanzasyon kVAr; gerilim düşümü; iletken direnci; düşüm limitine göre minimum kesit; basit kısa devre akımı; trafo anma akımı; enerji maliyeti.
- **Birimler adda yazılı:** `lineVoltageV`, `lengthM`, `resistanceOhmPerKm`, `ratedPowerKVA`.
- **Sessiz varsayım yok:** eksik, negatif, `NaN`, sonsuz veya aralık dışı değer hata verir. Varsayılan malzeme, gerilim veya yük karakteri yoktur.
- **Standart tablosu yok:** akım taşıma kapasitesi, düzeltme katsayısı, şalter eğrisi veya izin verilen düşüm limiti içermez. Bu tür değerleri kendi kaynağınızdan girdi olarak verirsiniz.
- **Formüller ve varsayımlar:** [docs/FORMULAS.md](docs/FORMULAS.md).

## Kurulum

npm kayıt defterinde yayımlanmamıştır ve `package.json` içindeki `"private": true` ayarı yanlışlıkla yayımlanmasını engeller. Bu yüzden kayıt defterinden kurulamaz. Node.js 22.12 veya üstü ve pnpm gerekir.

GitHub'dan klonlayarak:

```sh
git clone https://github.com/berkantshn/elektrik-hesap.git
cd elektrik-hesap
pnpm install --frozen-lockfile
pnpm build
node dist/cli.js --help
```

Başka bir projede kullanmak için, derledikten sonra yerel bir paket dosyası üretip onu kurun. `<klasör>` yerine seçtiğiniz bir klasörü yazın:

```sh
pnpm pack --pack-destination <klasör>
cd <projeniz>
npm install <klasör>/elektrik-hesap-0.1.0.tgz
```

Bu kurulumdan sonra aşağıdaki kütüphane örneği çalışır ve komut `npx elektrik-hesap` olarak kullanılabilir.

## Komut satırı örnekleri

Çıktılar gerçek çalıştırmalardan kopyalanmıştır. Sonuçlar yuvarlanmaz. Örnek bloklar stdout'u gösterir. Genel güvenlik uyarısı her hesapta stderr'e yazılır ve burada tekrarlanmaz; komuta özel uyarılar örneklerin altında ayrıca gösterilmiştir. Her komutun Türkçe takma adı vardır (`three-phase-current` = `uc-faz-akim`); liste için `--help`, parametreler için `<komut> --help`. Çıkış kodları: `0` başarılı, `1` geçersiz değer, `2` hatalı kullanım. Makinece okumak için `--json`, İngilizce mesajlar için `--lang en` eklenir.

15 kW, 400 V, cosφ = 0,85 üç faz yükün hat akımı:

```console
$ node dist/cli.js uc-faz-akim --active-power-w 15000 --line-voltage-v 400 --power-factor 0.85
lineCurrentA = 25.471335405424668
```

Güç üçgeni:

```console
$ node dist/cli.js guc-ucgeni-p-cos --active-power-w 8000 --power-factor 0.8 --power-factor-type lagging
activePowerW = 8000
reactivePowerVar = 6000
apparentPowerVA = 10000
powerFactor = 0.8
powerFactorType = lagging
phaseAngleDeg = 36.86989764584402
```

100 kW yükte cosφ değerini 0,80'den 0,95'e çıkarmak için gereken kondansatör gücü:

```console
$ node dist/cli.js kompanzasyon-kvar --active-power-kw 100 --initial-power-factor 0.8 --target-power-factor 0.95
capacitorKvar = 42.13158948211367
```

Üç faz besleme hattında gerilim düşümü. R ve X kablo üreticinizin veya kendi kaynağınızın değerleridir; buradakiler örnektir:

```console
$ node dist/cli.js uc-faz-dusum-akim --line-current-a 100 --length-m 200 --resistance-ohm-per-km 0.5 --reactance-ohm-per-km 0.08 --power-factor 0.85 --power-factor-type lagging --nominal-line-voltage-v 400
voltageDropV = 16.18229487160703
voltageDropPercent = 4.045573717901758
```

|e%| değeri %10'u aşarsa küçük düşüm yaklaşımı zayıflar. Sayısal sonuç değişmez, ancak komut stderr'e uyarı yazar. Kütüphane aynı uyarıyı `warnings` alanında döndürür:

```console
$ node dist/cli.js bir-faz-dusum-akim --current-a 40 --length-m 200 --resistance-ohm-per-km 2 --reactance-ohm-per-km 0.1 --power-factor 0.9 --power-factor-type lagging --nominal-voltage-v 230
voltageDropV = 29.497423830966508
voltageDropPercent = 12.824966883028917
```

```text
GERİLİM DÜŞÜMÜ UYARISI: |e| = %12.824966883028917, %10 sınırını aşıyor; küçük düşüm yaklaşımı zayıflar, sonuç güvenilir olmayabilir.
```

%3 düşüm limiti için teorik minimum kesit. Limit ve iletkenlik sizin girdinizdir. Sonuç, standart kesit seçimi veya akım taşıma kontrolü **değildir**:

```console
$ node dist/cli.js uc-faz-min-kesit --line-current-a 32 --power-factor 1 --power-factor-type lagging --length-m 50 --conductivity-m-per-ohm-mm2 56 --reactance-ohm-per-km 0 --nominal-line-voltage-v 400 --max-voltage-drop-percent 3
sectionMm2 = 4.123930494211613
```

Komut stderr'e şunu da yazar:

```text
KESİT UYARISI: Teorik alt sınırdır; akım taşıma kapasitesi ve standart kesit kontrolü yapılmamıştır.
```

70 °C'de iletken direnci. Malzeme değerleri örnektir:

```console
$ node dist/cli.js iletken-direnci --resistivity-ohm-mm2-per-m 0.0172 --reference-temperature-c 20 --temperature-coefficient-per-c 0.00393 --temperature-c 70 --length-m 100 --section-mm2 2.5
resistanceOhm = 0.8231919999999999
```

**Kısa devre değerleri basitleştirilmiştir.** Gerilim faktörü, motor katkısı, tepe akımı ve DC bileşen dahil değildir. Bu değerler **şalter veya koruma seçiminde kullanılmamalıdır**. Kısa devre komutları stderr'e her seferinde şu satırı da yazar:

```text
KISA DEVRE UYARISI: Basitleştirilmiş değerdir; gerilim faktörü, motor katkısı, tepe akımı ve DC bileşen dahil değildir. Şalter veya koruma seçiminde KULLANILMAMALIDIR.
```

1000 kVA trafonun anma akımı ve u_k = %6 için uçlarındaki kısa devre akımı:

```console
$ node dist/cli.js trafo-akim-uc-faz --rated-power-kva 1000 --line-voltage-v 400
ratedCurrentA = 1443.3756729740644
$ node dist/cli.js trafo-kisa-devre --rated-current-a 1443.376 --impedance-voltage-percent 6
shortCircuitCurrentA = 24056.266666666666
```

Empedanstan üç faz kısa devre akımı ve enerji maliyeti:

```console
$ node dist/cli.js uc-faz-kisa-devre --line-voltage-v 400 --impedance-per-phase-ohm 0.05
shortCircuitCurrentA = 4618.802153517006
$ node dist/cli.js enerji-maliyeti --energy-kwh 100 --unit-price-per-kwh 2.5
cost = 250
```

Hatalı girdiler:

```console
$ node dist/cli.js uc-faz-akim --active-power-w 15000 --line-voltage-v 400 --power-factor 1.2
'powerFactor' 0'dan büyük ve en fazla 1 olmalı (verilen: 1.2)
$ node dist/cli.js enerji --active-power-w 0,5 --duration-h 1
--active-power-w için geçersiz sayı: "0,5" (ondalık ayırıcı nokta olmalı, örn. 0.85)
```

## Kütüphane örneği

Yalnızca ESM olarak sunulur, tip tanımları pakete dahildir. Örnek, yukarıda anlatılan yerel paket dosyasıyla kurulmuş bir projede çalıştırılmıştır. Kütüphane sayıları yuvarlamadan döndürür.

```ts
import {
  ElectricalInputError,
  threePhaseLineCurrentA,
  threePhaseVoltageDropCurrentForm,
} from "elektrik-hesap";

const lineCurrentA = threePhaseLineCurrentA({
  activePowerW: 15000,
  lineVoltageV: 400,
  powerFactor: 0.85,
});
console.log(lineCurrentA);

const drop = threePhaseVoltageDropCurrentForm({
  lineCurrentA,
  lengthM: 120,
  resistanceOhmPerKm: 1.15,
  reactanceOhmPerKm: 0.08,
  powerFactor: 0.85,
  powerFactorType: "lagging",
  nominalLineVoltageV: 400,
});
console.log(drop);

try {
  threePhaseLineCurrentA({ activePowerW: 15000, lineVoltageV: 400, powerFactor: 0 });
} catch (error) {
  if (error instanceof ElectricalInputError) {
    console.log(error.code, error.parameter);
    console.log(error.messageTr);
    console.log(error.messageEn);
  }
}
```

Gerçek çıktı:

```text
25.471335405424668
{
  voltageDropV: 5.398107961825116,
  voltageDropPercent: 1.349526990456279,
  warnings: []
}
OUT_OF_RANGE powerFactor
'powerFactor' 0'dan büyük ve en fazla 1 olmalı (verilen: 0)
'powerFactor' must be greater than 0 and at most 1 (got: 0)
```

## API

Tüm fonksiyonlar tek bir adlandırılmış parametre nesnesi alır. Hatalı girdide `ElectricalInputError` fırlatır (`code`, `parameter`, `messageTr`, `messageEn`).

| Fonksiyon | Girdiler | Sonuç |
|---|---|---|
| `singlePhaseActivePowerW` | `voltageV`, `currentA`, `powerFactor` | W |
| `threePhaseActivePowerW` | `lineVoltageV`, `lineCurrentA`, `powerFactor` | W |
| `singlePhaseApparentPowerVA` | `voltageV`, `currentA` | VA |
| `threePhaseApparentPowerVA` | `lineVoltageV`, `lineCurrentA` | VA |
| `singlePhaseCurrentA` | `activePowerW`, `voltageV`, `powerFactor` | A |
| `threePhaseLineCurrentA` | `activePowerW`, `lineVoltageV`, `powerFactor` | A |
| `singlePhaseVoltageV` | `activePowerW`, `currentA`, `powerFactor` | V |
| `threePhaseLineVoltageV` | `activePowerW`, `lineCurrentA`, `powerFactor` | V |
| `lineToNeutralVoltageV` | `lineVoltageV` | V |
| `lineToLineVoltageV` | `lineToNeutralVoltageV` | V |
| `powerTriangleFromPQ` | `activePowerW`, `reactivePowerVar` (işaretli) | `PowerTriangle` |
| `powerTriangleFromPAndPF` | `activePowerW`, `powerFactor`, `powerFactorType` | `PowerTriangle` |
| `powerTriangleFromSAndPF` | `apparentPowerVA`, `powerFactor`, `powerFactorType` | `PowerTriangle` |
| `correctionCapacitorKvar` | `activePowerKW`, `initialPowerFactor`, `targetPowerFactor` | kVAr |
| `singlePhaseVoltageDropCurrentForm` | `currentA`, `lengthM`, `resistanceOhmPerKm`, `reactanceOhmPerKm`, `powerFactor`, `powerFactorType`, `nominalVoltageV` | `VoltageDropResult` |
| `threePhaseVoltageDropCurrentForm` | `lineCurrentA`, `lengthM`, `resistanceOhmPerKm`, `reactanceOhmPerKm`, `powerFactor`, `powerFactorType`, `nominalLineVoltageV` | `VoltageDropResult` |
| `singlePhaseVoltageDropPowerForm` | `activePowerW`, `reactivePowerVar`, `lengthM`, `resistanceOhmPerKm`, `reactanceOhmPerKm`, `nominalVoltageV` | `VoltageDropResult` |
| `threePhaseVoltageDropPowerForm` | `activePowerW`, `reactivePowerVar`, `lengthM`, `resistanceOhmPerKm`, `reactanceOhmPerKm`, `nominalLineVoltageV` | `VoltageDropResult` |
| `singlePhaseVoltageDropResistive` | `currentA`, `powerFactor`, `lengthM`, `conductivityMPerOhmMm2`, `sectionMm2`, `nominalVoltageV` | `VoltageDropResult` |
| `threePhaseVoltageDropResistive` | `lineCurrentA`, `powerFactor`, `lengthM`, `conductivityMPerOhmMm2`, `sectionMm2`, `nominalLineVoltageV` | `VoltageDropResult` |
| `conductorResistanceOhm` | `resistivityOhmMm2PerM`, `referenceTemperatureC`, `temperatureCoefficientPerC`, `temperatureC`, `lengthM`, `sectionMm2` | Ω |
| `resistanceOhmPerKmFromConductivity` | `conductivityMPerOhmMm2`, `sectionMm2` | Ω/km |
| `singlePhaseMinimumSectionMm2` | `currentA`, `powerFactor`, `powerFactorType`, `lengthM`, `conductivityMPerOhmMm2`, `reactanceOhmPerKm`, `nominalVoltageV`, `maxVoltageDropPercent` | mm² |
| `threePhaseMinimumSectionMm2` | `lineCurrentA`, `powerFactor`, `powerFactorType`, `lengthM`, `conductivityMPerOhmMm2`, `reactanceOhmPerKm`, `nominalLineVoltageV`, `maxVoltageDropPercent` | mm² |
| `impedanceMagnitudeOhm` | `resistanceOhm`, `reactanceOhm` | Ω |
| `threePhaseShortCircuitCurrentA` | `lineVoltageV`, `impedancePerPhaseOhm` | A |
| `singlePhaseShortCircuitCurrentA` | `lineToNeutralVoltageV`, `loopImpedanceOhm` | A |
| `transformerShortCircuitCurrentA` | `ratedCurrentA`, `impedanceVoltagePercent` | A |
| `transformerRatedCurrentThreePhaseA` | `ratedPowerKVA`, `lineVoltageV` | A |
| `transformerRatedCurrentSinglePhaseA` | `ratedPowerKVA`, `voltageV` | A |
| `energyKWh` | `activePowerW`, `durationH` | kWh |
| `energyCost` | `energyKWh`, `unitPricePerKWh` | birim fiyatın para birimi |

`powerFactorType` değeri `"lagging"` (geri/endüktif) veya `"leading"` (ileri/kapasitif) olur. `reactivePowerVar` işaretlidir: endüktif yükte pozitif, kapasitif yükte negatif. Negatif `voltageDropV` gerilim yükselmesi anlamına gelir.

- **`VoltageDropResult`:** `{ voltageDropV, voltageDropPercent, warnings }`. Sayılar yuvarlanmaz. `warnings` normalde boş dizidir. |e%| kesin olarak 10'dan büyükse (`LARGE_DROP_WARNING_PERCENT`) `{ code: "LARGE_DROP_APPROXIMATION", messageTr, messageEn }` içerir. Tam %10 uyarı vermez. |e%| ≥ 100 ise sonuç yerine hata fırlatılır.
- **Minimum kesit fonksiyonları:** Sonuç teorik alt sınırdır. Akım taşıma kapasitesi veya standart kesit kontrolü yapılmaz.
- **Kısa devre fonksiyonları:** Sonuç basitleştirilmiştir. Gerilim faktörü, motor katkısı, tepe akımı ve DC bileşen dahil değildir. Şalter veya koruma seçiminde kullanılmamalıdır.

## Türkçe terimler

| İngilizce (kodda) | Türkçe | Simge |
|---|---|---|
| active power | aktif (etkin) güç | P |
| reactive power | reaktif (kör) güç | Q |
| apparent power | görünür güç | S |
| power factor | güç katsayısı | cosφ |
| lagging / leading | geri (endüktif) / ileri (kapasitif) | |
| line-to-line voltage | fazlar arası (hat) gerilim | V_LL |
| line-to-neutral voltage | faz-nötr gerilim | V_LN |
| line current | hat akımı | I_L |
| voltage drop | gerilim düşümü | ΔV |
| feeder | besleme hattı | |
| resistance / reactance / impedance | direnç / reaktans / empedans | R / X / Z |
| resistivity / conductivity | özdirenç / iletkenlik | ρ / γ |
| cross-section | iletken kesiti | A |
| temperature coefficient | sıcaklık katsayısı | α |
| correction capacitor | kompanzasyon kondansatörü | Qc |
| short-circuit current | kısa devre akımı | I_k |
| loop impedance | çevrim empedansı | Z_çevrim |
| transformer rated current | trafo anma akımı | I_n |
| impedance voltage | kısa devre gerilimi (yüzde) | u_k% |
| energy / unit price | enerji / birim fiyat | E |

## Doğrulama

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm verify
```

- `pnpm test`: 97 elle türetilmiş değer (her birinin aritmetiği yorumda yazılıdır), çapraz kontroller, doğrulama ve CLI testleri.
- `pnpm verify`: TypeScript ile kod paylaşmayan bir Python betiği. Elle yazılan değerleri 60 basamaklı aritmetikle yeniden hesaplar, rastgele girdileri karşılaştırır, üç fazı zaman alanında ve gerilim düşümünü fazörle çözer.

Bu kontroller formüllerin kodlanışını sınar. Elle türetilen değerleri ve Python betiğini aynı yapay zekâ destekli yazar hazırlamıştır, dolayısıyla formülün yanlış anlaşılması gibi ortak bir hata bu kontrollerden kaçabilir. Bir hesabın sizin tesisinize veya bir standarda uygun olduğunu göstermezler.

<a id="english"></a>

# elektrik-hesap (English)

A zero-dependency TypeScript library and CLI for basic electrical engineering calculations.

- **Scope:** single- and three-phase power, current and voltage; P/Q/S and power factor; correction capacitor kVAr; voltage drop; conductor resistance; minimum section for a drop limit; simple short-circuit current; transformer rated current; energy cost.
- **Units in names:** `lineVoltageV`, `lengthM`, `resistanceOhmPerKm`, `ratedPowerKVA`.
- **No silent assumptions:** missing, negative, `NaN`, infinite or out-of-range values raise an error. There is no default material, voltage or load character.
- **No standard tables:** no ampacity, correction factors, breaker curves or allowable drop limits are included. You supply such values from your own source.
- **Formulas and assumptions:** [docs/FORMULAS.md](docs/FORMULAS.md).

## Installation

Not published on the npm registry, so it cannot be installed from there. `"private": true` in `package.json` prevents accidental publishing. Requires Node.js 22.12 or later and pnpm.

From a GitHub clone:

```sh
git clone https://github.com/berkantshn/elektrik-hesap.git
cd elektrik-hesap
pnpm install --frozen-lockfile
pnpm build
node dist/cli.js --help --lang en
```

To use it in another project, build it, create a local package file and install that file. Replace `<folder>` with a folder of your choice:

```sh
pnpm pack --pack-destination <folder>
cd <your-project>
npm install <folder>/elektrik-hesap-0.1.0.tgz
```

The library example then works, and the command is available as `npx elektrik-hesap`.

## CLI

Outputs are copied from real runs and are not rounded. The example blocks show stdout. The general safety notice goes to stderr on every calculation and is not repeated here; command-specific warnings are shown below their examples. Commands have English names and Turkish aliases. Use `--help` for the list and `<command> --help` for parameters. Exit codes: `0` success, `1` invalid value, `2` incorrect usage. Add `--json` for machine-readable output and `--lang en` for English messages.

Line current of a 15 kW, 400 V, power factor 0.85 three-phase load:

```console
$ node dist/cli.js three-phase-current --active-power-w 15000 --line-voltage-v 400 --power-factor 0.85
lineCurrentA = 25.471335405424668
```

Capacitor needed to raise a 100 kW load from power factor 0.80 to 0.95:

```console
$ node dist/cli.js capacitor-kvar --active-power-kw 100 --initial-power-factor 0.8 --target-power-factor 0.95
capacitorKvar = 42.13158948211367
```

Three-phase feeder voltage drop. R and X are illustrative; use your cable data:

```console
$ node dist/cli.js three-phase-drop-current --line-current-a 100 --length-m 200 --resistance-ohm-per-km 0.5 --reactance-ohm-per-km 0.08 --power-factor 0.85 --power-factor-type lagging --nominal-line-voltage-v 400
voltageDropV = 16.18229487160703
voltageDropPercent = 4.045573717901758
```

Above 10% |e%|, the small-drop approximation weakens. The numbers do not change, but the command writes a warning to stderr, and the library returns it in the `warnings` field:

```console
$ node dist/cli.js single-phase-drop-current --current-a 40 --length-m 200 --resistance-ohm-per-km 2 --reactance-ohm-per-km 0.1 --power-factor 0.9 --power-factor-type lagging --nominal-voltage-v 230 --lang en
voltageDropV = 29.497423830966508
voltageDropPercent = 12.824966883028917
```

```text
VOLTAGE DROP WARNING: |e| = 12.824966883028917% exceeds the 10% limit; the small-drop approximation weakens and the result may be unreliable.
```

Theoretical minimum section for a 3% limit. The limit and conductivity are your inputs. The result is **not** a standard size selection or an ampacity check:

```console
$ node dist/cli.js three-phase-min-section --line-current-a 32 --power-factor 1 --power-factor-type lagging --length-m 50 --conductivity-m-per-ohm-mm2 56 --reactance-ohm-per-km 0 --nominal-line-voltage-v 400 --max-voltage-drop-percent 3 --lang en
sectionMm2 = 4.123930494211613
```

The command also writes this to stderr:

```text
SECTION WARNING: This is a theoretical lower bound; no ampacity or standard-size check was made.
```

**Short-circuit values are simplified.** They exclude voltage factor, motor contribution, peak current and DC component, and **must not be used to select breakers or protection**. With `--lang en`, short-circuit commands also write this line to stderr every time:

```text
SHORT-CIRCUIT WARNING: Simplified value; excludes voltage factor, motor contribution, peak current and DC component. It must NOT be used to select breakers or protection.
```

Transformer rated current and terminal short-circuit current at 6% impedance voltage:

```console
$ node dist/cli.js transformer-current-three-phase --rated-power-kva 1000 --line-voltage-v 400
ratedCurrentA = 1443.3756729740644
$ node dist/cli.js transformer-short-circuit --rated-current-a 1443.376 --impedance-voltage-percent 6
shortCircuitCurrentA = 24056.266666666666
```

Invalid input:

```console
$ node dist/cli.js three-phase-current --active-power-w 15000 --line-voltage-v 400 --power-factor 1.2 --lang en
'powerFactor' must be greater than 0 and at most 1 (got: 1.2)
```

## Library and API

ESM only, with bundled types. See the [library example](#kütüphane-örneği) and the [API table](#api) above; code and output are language-neutral. Every function takes one object of named parameters and throws `ElectricalInputError` (`code`, `parameter`, `messageTr`, `messageEn`) on invalid input.

`powerFactorType` is `"lagging"` or `"leading"`. `reactivePowerVar` is signed: positive for inductive and negative for capacitive loads. A negative `voltageDropV` means a voltage rise.

- **`VoltageDropResult`:** `{ voltageDropV, voltageDropPercent, warnings }`. Numbers are not rounded. `warnings` is normally empty. When |e%| is strictly above 10 (`LARGE_DROP_WARNING_PERCENT`), it holds `{ code: "LARGE_DROP_APPROXIMATION", messageTr, messageEn }`. Exactly 10% gives no warning. At |e%| ≥ 100, an error is thrown instead of a result.
- **Minimum section functions:** The result is a theoretical lower bound. No ampacity or standard-size check is made.
- **Short-circuit functions:** The result is simplified. It excludes voltage factor, motor contribution, peak current and DC component, and must not be used to select breakers or protection.

## Verification

Run `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` and `pnpm verify`.

- `pnpm test`: 97 hand-derived values (each with its arithmetic in a comment), cross-checks, validation and CLI tests.
- `pnpm verify`: a Python script that shares no code with the TypeScript. It recomputes the hand values in 60-digit arithmetic, compares random inputs, and solves three-phase power in the time domain and voltage drop with phasors.

These checks test how the formulas are coded. The hand-derived values and the Python script come from the same AI-assisted author, so a shared error, such as misunderstanding a formula, could escape them. They do not show that a calculation suits your installation or meets a standard.

## ⭐ Support this project

If this project helped you, please give it a ⭐ and [follow me on GitHub](https://github.com/berkantshn) for more.

İşine yaradıysa projeye ⭐ verip [beni GitHub'da takip edebilirsin](https://github.com/berkantshn).

---

Made By FALCREB
