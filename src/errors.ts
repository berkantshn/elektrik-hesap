// Hata türü: her hata hem Türkçe hem İngilizce mesaj taşır.

/** Makine tarafından okunabilir hata kodları. */
export type ErrorCode =
  | "INVALID_ARGUMENTS"
  | "NOT_A_FINITE_NUMBER"
  | "MUST_BE_POSITIVE"
  | "MUST_BE_NON_NEGATIVE"
  | "OUT_OF_RANGE"
  | "INVALID_CHOICE"
  | "INCONSISTENT_INPUT"
  | "RESULT_OUT_OF_RANGE"
  | "DROP_LIMIT_UNREACHABLE";

/**
 * Geçersiz girdi veya anlamsız sonuç durumunda fırlatılır.
 * `message` iki dili birlikte içerir; tek dil için `messageTr` / `messageEn` kullanılır.
 */
export class ElectricalInputError extends Error {
  readonly code: ErrorCode;
  readonly parameter: string;
  readonly messageTr: string;
  readonly messageEn: string;

  constructor(code: ErrorCode, parameter: string, messageTr: string, messageEn: string) {
    super(`${messageTr} | ${messageEn}`);
    this.name = "ElectricalInputError";
    this.code = code;
    this.parameter = parameter;
    this.messageTr = messageTr;
    this.messageEn = messageEn;
  }
}
