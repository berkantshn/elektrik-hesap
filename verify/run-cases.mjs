// Python doğrulama betiğinin kullandığı köprü: stdin'den vaka listesi okur, derlenmiş
// kütüphaneyi çağırır, sonuçları JSON olarak yazar. Formül içermez.
import { readFileSync } from "node:fs";
import process from "node:process";
import * as api from "../dist/index.js";

const cases = JSON.parse(readFileSync(0, "utf8"));
const results = cases.map(({ fn, input }) => {
  try {
    return { ok: true, value: api[fn](input) };
  } catch (error) {
    if (error instanceof api.ElectricalInputError) return { ok: false, code: error.code };
    throw error;
  }
});
process.stdout.write(JSON.stringify(results));
