// Ortak tipler.

/** Yük karakteri: "lagging" = geri/endüktif, "leading" = ileri/kapasitif. */
export type PowerFactorType = "lagging" | "leading";

/** Güç üçgeni sonucu. Q > 0 endüktif, Q < 0 kapasitif kabul edilir. */
export interface PowerTriangle {
  /** Aktif güç P [W] */
  activePowerW: number;
  /** İşaretli reaktif güç Q [VAr] */
  reactivePowerVar: number;
  /** Görünür güç S [VA] */
  apparentPowerVA: number;
  /** Güç katsayısı cosφ = P/S */
  powerFactor: number;
  /** Q > 0: "lagging", Q < 0: "leading", Q = 0: "unity" */
  powerFactorType: PowerFactorType | "unity";
  /** İşaretli faz açısı φ [derece] */
  phaseAngleDeg: number;
}

/** Hesabı durdurmayan, ancak sonucun zayıfladığını bildiren uyarı. */
export interface VoltageDropWarning {
  /** Makine tarafından okunabilir uyarı kodu */
  code: "LARGE_DROP_APPROXIMATION";
  messageTr: string;
  messageEn: string;
}

/**
 * Gerilim düşümü sonucu. Sayılar yuvarlanmadan döner.
 * Negatif değer gerilim yükselmesi anlamına gelir.
 */
export interface VoltageDropResult {
  /** Gerilim düşümü ΔV [V]; üç fazda fazlar arası değer */
  voltageDropV: number;
  /** Anma gerilimine göre yüzde gerilim düşümü [%] */
  voltageDropPercent: number;
  /** |e%| > 10 ise küçük düşüm yaklaşımı zayıflar ve burada bir uyarı döner; aksi halde boş dizi */
  warnings: VoltageDropWarning[];
}
