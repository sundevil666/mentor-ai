import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

const [bundleDirectory, modelDirectory, outputDirectory] = process.argv.slice(2);
if (!bundleDirectory || !modelDirectory || !outputDirectory) {
  throw new Error('Usage: node scripts/build-sherpa-reader-assets.mjs <wasm-bundle> <model-directory> <output-directory>');
}

await mkdir(outputDirectory, { recursive: true });

const files = [
  ['decoder.onnx', 'decoder-epoch-99-avg-1.int8.onnx'],
  ['encoder.onnx', 'encoder-epoch-99-avg-1.int8.onnx'],
  ['joiner.onnx', 'joiner-epoch-99-avg-1.int8.onnx'],
  ['tokens.txt', 'tokens.txt'],
];

const packageParts = [];
const metadata = [];
let offset = 0;
for (const [virtualName, sourceName] of files) {
  const contents = await readFile(path.join(modelDirectory, sourceName));
  packageParts.push(contents);
  metadata.push({ filename: `/${virtualName}`, start: offset, end: offset + contents.byteLength });
  offset += contents.byteLength;
}

await writeFile(path.join(outputDirectory, 'sherpa-onnx-wasm-main-asr.data'), Buffer.concat(packageParts));
await copyFile(path.join(bundleDirectory, 'sherpa-onnx-asr.js'), path.join(outputDirectory, 'sherpa-onnx-asr.js'));
await copyFile(path.join(bundleDirectory, 'sherpa-onnx-wasm-main-asr.wasm'), path.join(outputDirectory, 'sherpa-onnx-wasm-main-asr.wasm'));

const runtimeSource = await readFile(path.join(bundleDirectory, 'sherpa-onnx-wasm-main-asr.js'), 'utf8');
const packageStart = runtimeSource.indexOf('loadPackage({files:');
const packageEndMarker = '})();var arguments_';
const packageEnd = runtimeSource.indexOf(packageEndMarker, packageStart);
if (packageStart < 0 || packageEnd < 0) throw new Error('Could not locate the Emscripten package metadata.');
const packageCall = `loadPackage(${JSON.stringify({ files: metadata, remote_package_size: offset })})`;
const patchedRuntime = runtimeSource.slice(0, packageStart) + packageCall + runtimeSource.slice(packageEnd);
await writeFile(path.join(outputDirectory, 'sherpa-onnx-wasm-main-asr.js'), patchedRuntime);

console.log(`Built sherpa reader assets: ${(offset / 1024 / 1024).toFixed(1)} MiB model package.`);
