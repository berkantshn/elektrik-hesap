// Python doğrulama betiğinin kullandığı köprü: stdin'den vaka listesi okur, derlenmiş
// kütüphaneyi çağırır, sonuçları JSON olarak yazar. Formül içermez.
import process from "node:process";
import * as api from "../dist/index.js";

// Linux'ta stdin borusu bloklamasız olabilir, readFileSync(0) EAGAIN verir; akış olarak okunur.
let inputText = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) inputText += chunk;

const cases = JSON.parse(inputText);
const results = cases.map(({ fn, input }) => {
  try {
    return { ok: true, value: api[fn](input) };
  } catch (error) {
    if (error instanceof api.ElectricalInputError) return { ok: false, code: error.code };
    throw error;
  }
});
process.stdout.write(JSON.stringify(results));
