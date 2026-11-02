#!/usr/bin/env node
// Komut satırı giriş noktası; asıl mantık test edilebilmesi için cli-core.ts içindedir.

import { runCli } from "./cli-core.js";

const result = runCli(process.argv.slice(2));
if (result.stdout) process.stdout.write(`${result.stdout}\n`);
if (result.stderr) process.stderr.write(`${result.stderr}\n`);
process.exitCode = result.exitCode;
