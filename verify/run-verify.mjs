// `pnpm verify` için platformdan bağımsız başlatıcı: çalışan ilk Python yorumlayıcısını bulur.
// Windows'taki sahte "python3" kısayolu --version denemesinde başarısız olduğu için atlanır.
import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(import.meta.resolve("./verify_independent.py"));
const python = ["python3", "python"].find((name) => spawnSync(name, ["--version"]).status === 0);

if (!python) {
  process.stderr.write("Python bulunamadı (python3 veya python) / Python not found (python3 or python)\n");
  process.exit(1);
}

const run = spawnSync(python, [script], { stdio: "inherit" });
process.exit(run.status ?? 1);
