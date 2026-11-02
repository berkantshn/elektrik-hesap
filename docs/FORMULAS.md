> [!CAUTION]
> **Eğitim ve ön tasarım içindir; yetkili mühendis hesabının veya standartların yerine geçmez. Yanlış kullanım yangın, elektrik çarpması veya maddi hasar riski doğurabilir.**
> *Educational and pre-design aid only; not a substitute for a licensed engineer's calculation or applicable standards. Wrong use may risk fire, electric shock or property damage.*
>
> **Bu formüller yetkili bir elektrik mühendisi tarafından incelenmemiş ve yayımlanmış çözümlü örneklerle doğrulanmamıştır. Son tasarım, koruma cihazı seçimi, kesme kapasitesi veya kablo boyutlandırması için kullanmayın.**
> *These formulas have not been reviewed by a licensed electrical engineer or validated against published worked examples. Do not use them for final design, protection device selection, breaking capacity or cable sizing.*

# Formüller ve varsayımlar

*[English version below.](#formulas-and-assumptions)*

Buradaki bağıntılar genel fizik ve devre teorisi bilgisidir. Hiçbir standardın metni veya tablosu buraya alınmamıştır.

## Genel varsayımlar

- Gerilim ve akımlar RMS değerdir, dalga şekli sinüzoidal kabul edilir. Harmonik varsa gerçek güç katsayısı cosφ'den farklıdır ve S² = P² + Q² geçerli olmaz.
- Üç faz fonksiyonları **dengeli** sistem ve **fazlar arası** gerilim (V_LL) kullanır. Nötr akımı sıfır kabul edilir. Dengesiz yükler kapsam dışıdır.
- Güç katsayısı 0 < cosφ ≤ 1 aralığında olmalıdır. Yük karakteri (geri/ileri) gerektiğinde açıkça verilir, varsayılmaz.
- sinφ = √(1 − cos²φ). Q işareti: geri (endüktif) pozitif, ileri (kapasitif) negatif.

## Güç, akım, gerilim

V [V] gerilim, V_LL fazlar arası gerilim, V_LN faz-nötr gerilim, I [A] akım, I_L hat akımı, P [W], Q [VAr], S [VA].

| Bağıntı | Bir faz | Dengeli üç faz |
|---|---|---|
| Aktif güç | P = V·I·cosφ | P = √3·V_LL·I_L·cosφ |
| Görünür güç | S = V·I | S = √3·V_LL·I_L |
| Akım | I = P/(V·cosφ) | I_L = P/(√3·V_LL·cosφ) |
| Gerilim | V = P/(I·cosφ) | V_LL = P/(√3·I_L·cosφ) |

V_LN = V_LL/√3. Üç faz P ve Q değerleri her zaman **toplam** değerdir.

## Güç üçgeni

S = √(P² + Q²), cosφ = P/S, φ = atan2(Q, P), Q = ±S·sinφ.

`powerTriangleFromPQ` yalnızca burada P = 0 kabul eder (saf reaktif, cosφ = 0 döner). P ve Q birlikte sıfır olamaz.

## Kompanzasyon

Qc = P·(tanφ1 − tanφ2), tanφ = sinφ/cosφ. P [kW], Qc [kVAr].

Varsayımlar: P değişmez. Başlangıç ve hedef ikisi de geri cosφ'dir, hedef başlangıçtan küçük olamaz. Harmonik, rezonans, aşırı kompanzasyon ve kademe seçimi dikkate alınmaz. Kondansatör gücü gerilimin karesiyle değiştiğinden, Qc işletme geriliminde gereken güçtür; farklı anma gerilimli kondansatörde dönüşüm kullanıcıya aittir.

## Gerilim düşümü

L [m] **tek yön** hat uzunluğu, R ve X [Ω/km] iletken başına birim değerler, V_n [V] yüzde için anma gerilimi. Kodda L/1000 ile km'ye çevrilir. Formüllerde L km olarak yazılmıştır.

| Biçim | Bir faz | Dengeli üç faz (ΔV_LL) |
|---|---|---|
| Akım | ΔV ≈ 2·I·L·(R·cosφ ± X·sinφ) | ΔV ≈ √3·I_L·L·(R·cosφ ± X·sinφ) |
| Güç | ΔV ≈ 2·L·(R·P + X·Q)/V_n | ΔV ≈ L·(R·P + X·Q)/V_n |
| İletkenlik | ΔV = 2·L_m·I·cosφ/(γ·A) | ΔV = √3·L_m·I_L·cosφ/(γ·A) |

e% = 100·ΔV/V_n. Üstteki işaret (+) geri, alttaki (−) ileri yük içindir. Sonuç negatifse gerilim yükselmesi vardır. L_m metre cinsinden uzunluktur, γ [m/(Ω·mm²)] iletkenlik, A [mm²] kesittir.

Varsayımlar ve yaklaşımlar:

- **Küçük düşüm yaklaşımı.** Tam fazör çözümü V_s = V_r + I·Z'dir. Formül, kaynak ile yük gerilimi arasındaki açı farkını ihmal eder. Hata en çok |I·Z|²/(2·V) kadardır: |I·Z| gerilimin %3'ü ise en çok yaklaşık 0,05 yüzde puan, %10'u ise en çok 0,5 yüzde puan. Bu sınır doğrulama betiğinde sınanmıştır (bir faz).
- **Bir fazda 2 çarpanı**, gidiş ve dönüş iletkenlerinin aynı R ve X'e sahip olduğunu varsayar.
- **Akım biçimi ile güç biçimi aynı şey değildir.** Akım biçiminde gerçek akım girilir. Güç biçimi, yük geriliminin V_n olduğunu varsayarak akımı P ve Q'dan türetir. Gerçek yük gerilimi V_n'nin altındaysa sabit güçlü yükün akımı daha yüksek olur ve güç biçimi düşümü, yaklaşık düşüm yüzdesi kadar az hesaplar. İki biçim yalnızca I = P/(k·V_n·cosφ) iken aynı sonucu verir (test edilmiştir).
- **İletkenlik biçimi** reaktansı sıfır kabul eder; büyük kesitlerde ve OG hatlarında X etkisi ihmal edilemeyebilir.
- Yük hattın sonunda toplu kabul edilir, hat kapasitansı ihmal edilir. Uzun OG/YG hatları için uygun değildir.
- **%10 uyarısı.** |e%| kesin olarak 10'dan büyükse sonuç yine yuvarlanmadan döner, ancak yaklaşım zayıfladığı için `warnings` alanında `LARGE_DROP_APPROXIMATION` uyarısı bulunur ve CLI bunu stderr'e yazar. Tam %10 uyarı vermez. Bu eşik yazarın seçtiği bir yazılım uyarısıdır, standart limiti değildir.
- Düşüm anma gerilimine ulaşırsa (|e%| ≥ 100) yaklaşım anlamsız olduğundan hata verilir.
- İzin verilen düşüm limiti bu kütüphanede bulunmaz.

## İletken direnci

R = ρ_ref·(1 + α·(T − T_ref))·L/A. ρ_ref [Ω·mm²/m], T_ref ve T [°C], α [1/°C], L [m], A [mm²]. γ = 1/ρ.

Varsayımlar: sıcaklıkla doğrusal değişim. α ve ρ_ref **aynı referans sıcaklığına** ait olmalıdır; 20 °C'deki α başka bir referansta farklıdır. Model pozitif direnç vermiyorsa (1 + α·ΔT ≤ 0) hata verilir. Doğru akım direncidir: deri etkisi, yakınlık etkisi ve damar örgüsü uzaması dahil değildir. Malzeme değerleri kütüphanede yoktur.

## Düşüm limitine göre minimum kesit

ΔV_izin = (limit/100)·V_n olmak üzere R' = (ΔV_izin/(k·I·L) ∓ X·sinφ)/cosφ ve A = 1000/(γ·R'). k bir fazda 2, üç fazda √3; L [km]. X = 0 iken A = k·L_m·I·cosφ/(γ·ΔV_izin) olur.

Varsayımlar: akım biçimi yaklaşımı geçerlidir, X kesitle değişmez, γ işletme sıcaklığına aittir. R' ≤ 0 ise kesit artırmak limiti sağlayamaz ve `DROP_LIMIT_UNREACHABLE` hatası verilir.

**Sonuç yalnızca teorik bir alt sınırdır; akım taşıma kapasitesi veya standart kesit kontrolü yapılmaz.** Üretilebilir kesite yuvarlama, akım taşıma kapasitesi, kısa devre dayanımı, koruma koordinasyonu ve mekanik dayanım ayrıca kontrol edilmelidir. CLI bu uyarıyı stderr'e yazar.

## Kısa devre

|Z| = √(R² + X²). R ve X ayrı ayrı toplanır, sonra büyüklük alınır; empedans büyüklükleri doğrudan toplanmaz.

- Üç faz dengeli: I_k = V_LL/(√3·|Z|). Z faz başına toplam empedanstır.
- Faz-nötr çevrim: I_k = V_LN/|Z_çevrim|. Z_çevrim gidiş ve dönüşü içerir.
- Trafo uçları: I_k = I_n·100/u_k%. Üst şebeke empedansı sıfır kabul edilir.

Varsayımlar: empedansı ihmal edilen (metalik) arıza, arıza öncesi gerilim girilen değerdir (gerilim faktörü yoktur), sürekli hal simetrik RMS değeridir. Tepe akımı, DC bileşen, motor katkısı, ark direnci ve iletkenin ısınması dahil değildir. Standart hesap yöntemlerinin yerine geçmez. Değer basitleştirilmiştir ve **şalter, koruma veya kesme kapasitesi seçiminde kullanılmamalıdır**. CLI bu uyarıyı her kısa devre komutunda stderr'e yazar. Maksimum ve minimum arıza akımları için farklı gerilim ve direnç değerleri gerekir.

## Trafo anma akımı

Üç faz: I_n = S_n·1000/(√3·V_LL). Bir faz: I_n = S_n·1000/V. S_n [kVA]. Hangi sargının gerilimi girilirse o tarafın akımı bulunur.

## Enerji ve maliyet

E = P·t/1000 [kWh], maliyet = E·birim fiyat. P [W] t [saat] boyunca sabit kabul edilir. Vergi, kademeli tarife, güç bedeli ve dağıtım bedeli yoktur. Para birimi birim fiyatınkidir.

---

<a id="formulas-and-assumptions"></a>

# Formulas and assumptions

These relationships are general physics and circuit theory. No standard's text or table is reproduced here.

## General assumptions

- Voltages and currents are RMS, with sinusoidal waveforms. With harmonics, true power factor differs from cosφ and S² = P² + Q² does not hold.
- Three-phase functions assume a **balanced** system and **line-to-line** voltage (V_LL). Neutral current is taken as zero. Unbalanced loads are out of scope.
- Power factor must satisfy 0 < cosφ ≤ 1. Load character (lagging/leading) is given explicitly where needed.
- sinφ = √(1 − cos²φ). Sign of Q: lagging (inductive) positive, leading (capacitive) negative.

## Power, current, voltage

| Relation | Single-phase | Balanced three-phase |
|---|---|---|
| Active power | P = V·I·cosφ | P = √3·V_LL·I_L·cosφ |
| Apparent power | S = V·I | S = √3·V_LL·I_L |
| Current | I = P/(V·cosφ) | I_L = P/(√3·V_LL·cosφ) |
| Voltage | V = P/(I·cosφ) | V_LL = P/(√3·I_L·cosφ) |

V_LN = V_LL/√3. Three-phase P and Q are always **totals**.

## Power triangle

S = √(P² + Q²), cosφ = P/S, φ = atan2(Q, P), Q = ±S·sinφ. Only `powerTriangleFromPQ` accepts P = 0 (purely reactive, returns cosφ = 0). P and Q cannot both be zero.

## Power factor correction

Qc = P·(tanφ1 − tanφ2), with P in kW and Qc in kVAr.

Assumes constant P and that both power factors are lagging, with the target not below the initial value. Harmonics, resonance, overcorrection and step selection are not considered. Capacitor output varies with voltage squared, so Qc is the power needed at the operating voltage.

## Voltage drop

L is the **one-way** length. R and X are per-conductor values in Ω/km. V_n is the nominal voltage used for the percentage. In these formulas L is in km; L_m is the same length in metres.

| Form | Single-phase | Balanced three-phase (ΔV_LL) |
|---|---|---|
| Current | ΔV ≈ 2·I·L·(R·cosφ ± X·sinφ) | ΔV ≈ √3·I_L·L·(R·cosφ ± X·sinφ) |
| Power | ΔV ≈ 2·L·(R·P + X·Q)/V_n | ΔV ≈ L·(R·P + X·Q)/V_n |
| Conductivity | ΔV = 2·L_m·I·cosφ/(γ·A) | ΔV = √3·L_m·I_L·cosφ/(γ·A) |

e% = 100·ΔV/V_n. The upper sign (+) is for lagging loads and the lower sign (−) for leading loads. A negative result is a voltage rise. γ is conductivity in m/(Ω·mm²) and A is the section in mm².

- **Small-drop approximation.** The exact phasor solution is V_s = V_r + I·Z. The formula ignores the angle between source and load voltage. The error is at most |I·Z|²/(2·V): about 0.05 percentage points when |I·Z| is 3% of the voltage and 0.5 points at 10%. The verification script tests this bound (single-phase).
- **The factor of 2** assumes go and return conductors have the same R and X.
- **Current and power forms differ.** The current form takes the real current. The power form derives current from P and Q assuming the load voltage equals V_n. If the real load voltage is lower, a constant-power load draws more current, and the power form under-estimates the drop by roughly the drop percentage. They match only when I = P/(k·V_n·cosφ), which is tested.
- **The conductivity form** takes reactance as zero, which may not be negligible for large sections or MV lines.
- The load is lumped at the line end and line capacitance is ignored. Not suitable for long MV/HV lines.
- **10% warning.** When |e%| is strictly above 10, the result is still returned unrounded, but because the approximation weakens, `warnings` holds `LARGE_DROP_APPROXIMATION` and the CLI writes it to stderr. Exactly 10% gives no warning. This threshold is a software warning chosen by the author, not a standard limit.
- If the drop reaches the nominal voltage (|e%| ≥ 100), an error is raised.
- No allowable drop limit is included in this library.

## Conductor resistance

R = ρ_ref·(1 + α·(T − T_ref))·L/A, with ρ_ref in Ω·mm²/m, T in °C, α in 1/°C, L in m and A in mm². γ = 1/ρ.

Assumes linear temperature dependence. α and ρ_ref must belong to the **same reference temperature**. An error is raised if 1 + α·ΔT ≤ 0. This is DC resistance: skin effect, proximity effect and stranding are excluded. No material values are included.

## Minimum section for a drop limit

With ΔV_allowed = (limit/100)·V_n: R' = (ΔV_allowed/(k·I·L) ∓ X·sinφ)/cosφ and A = 1000/(γ·R'), where k is 2 for single-phase and √3 for three-phase, and L is in km.

Assumes the current-form approximation, X independent of section, and γ at operating temperature. If R' ≤ 0, no section can meet the limit and `DROP_LIMIT_UNREACHABLE` is raised.

**The result is only a theoretical lower bound; no ampacity or standard-size check is made.** Rounding to a manufactured size, ampacity, short-circuit withstand, protection coordination and mechanical strength must be checked separately. The CLI writes this warning to stderr.

## Short circuit

|Z| = √(R² + X²). Add R and X separately, then take the magnitude; do not add impedance magnitudes.

- Balanced three-phase: I_k = V_LL/(√3·|Z|), where Z is the total per-phase impedance.
- Line-to-neutral loop: I_k = V_LN/|Z_loop|, where Z_loop includes go and return.
- Transformer terminals: I_k = I_n·100/u_k%, with zero upstream impedance.

Assumes a bolted fault, pre-fault voltage equal to the input (no voltage factor) and symmetrical steady-state RMS. Peak current, DC component, motor contribution, arc resistance and conductor heating are excluded. It does not replace standard calculation methods. The value is simplified and **must not be used to select breakers, protection or breaking capacity**. The CLI writes this warning to stderr on every short-circuit command. Maximum and minimum fault currents need different voltage and resistance values.

## Transformer rated current

Three-phase: I_n = S_n·1000/(√3·V_LL). Single-phase: I_n = S_n·1000/V, with S_n in kVA. The result is for the winding whose voltage is entered.

## Energy and cost

E = P·t/1000 in kWh, cost = E·unit price. P in W is constant over t in hours. No taxes, tiered tariffs, demand or distribution charges. The currency is that of the unit price.
