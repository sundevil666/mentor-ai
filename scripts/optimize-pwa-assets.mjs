import { readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outputAssetsDir = resolve('apps/pwa/dist/pwa/assets');
const wasmFilePattern = /^ort-wasm-simd-threaded\.asyncify-[A-Za-z0-9_-]+\.wasm$/;
const bundledWasmReferencePattern = /\/assets\/ort-wasm-simd-threaded\.asyncify-[A-Za-z0-9_-]+\.wasm/g;
const wasmCdnUrl = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/ort-wasm-simd-threaded.asyncify.wasm';

const outputFiles = readdirSync(outputAssetsDir);
const wasmFiles = outputFiles.filter((file) => wasmFilePattern.test(file));
let replacedReferences = 0;

for (const file of outputFiles.filter((name) => name.endsWith('.js'))) {
  const path = join(outputAssetsDir, file);
  const source = readFileSync(path, 'utf8');
  const optimized = source.replace(bundledWasmReferencePattern, () => {
    replacedReferences += 1;
    return wasmCdnUrl;
  });
  if (optimized !== source) writeFileSync(path, optimized);
}

for (const file of wasmFiles) unlinkSync(join(outputAssetsDir, file));

if (wasmFiles.length !== 1 || replacedReferences === 0) {
  throw new Error(`Unexpected ONNX Runtime output: ${wasmFiles.length} WASM assets and ${replacedReferences} references.`);
}

console.log(`Replaced ${replacedReferences} bundled ONNX Runtime fallback references with the pinned CDN URL; removed the WASM asset.`);
