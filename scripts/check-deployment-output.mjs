import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const outputDir = resolve(rootDir, 'apps/pwa/dist/pwa');
const maximumStaticBytes = 10 * 1024 * 1024;
const forbiddenExtensions = new Set(['.mp3', '.wasm']);

const files = walk(outputDir);
const totalBytes = files.reduce((total, file) => total + statSync(file).size, 0);
const forbiddenFiles = files.filter((file) => forbiddenExtensions.has(extname(file)));

if (forbiddenFiles.length > 0) {
  throw new Error(`Deployment output contains externally hosted assets:\n${forbiddenFiles.map(formatPath).join('\n')}`);
}

if (totalBytes > maximumStaticBytes) {
  throw new Error(`Static deployment output is ${formatBytes(totalBytes)}; budget is ${formatBytes(maximumStaticBytes)}.`);
}

console.log(`Deployment output verified: ${files.length} files, ${formatBytes(totalBytes)}, no bundled MP3 or WASM.`);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function formatPath(path) {
  return relative(rootDir, path);
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}
