const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');
const bridge=fs.readFileSync('native-bridge-src.js','utf8');
const prepare=fs.readFileSync('scripts/prepare-android.mjs','utf8');
const java=fs.readFileSync('scripts/android/EduviaFileExportPlugin.java','utf8');
const studio=fs.readFileSync('study-studio.js','utf8');

test('Android exports stream the generated Blob to public Downloads/Eduvia',()=>{
  assert.ok(bridge.includes("registerPlugin('EduviaFileExport')"));
  assert.ok(bridge.includes('EduviaFileExportPlugin.beginSave'));
  assert.ok(bridge.includes('EduviaFileExportPlugin.writeChunk'));
  assert.ok(bridge.includes('EduviaFileExportPlugin.finishSave'));
  assert.ok(bridge.includes('blob.slice(offset, offset + chunkSize)'));
  assert.ok(java.includes('MediaStore.Downloads.EXTERNAL_CONTENT_URI'));
  assert.ok(java.includes('Environment.DIRECTORY_DOWNLOADS + "/Eduvia"'));
  assert.ok(java.includes('MediaStore.MediaColumns.IS_PENDING'));
});

test('Android preparation installs and registers the custom file exporter',()=>{
  assert.ok(prepare.includes("scripts/android/EduviaFileExportPlugin.java"));
  assert.ok(prepare.includes('registerPlugin(EduviaFileExportPlugin.class)'));
  assert.ok(prepare.includes('MainActivity.java'));
});

test('Eduvia waits for native file save and only reports native success after completion',()=>{
  assert.ok(app.includes('await window.EduviaNative.saveFile(blob,name)'));
  assert.ok(studio.includes('const result=await download(bundle,'));
  assert.ok(studio.includes("result?.directory?'Portable backup saved to '+result.directory"));
});

test('browser downloads attach the anchor and do not revoke the Blob URL immediately',()=>{
  assert.ok(app.includes('document.body.appendChild(a)'));
  assert.ok(app.includes('URL.revokeObjectURL(url)},120000)'));
  assert.ok(!app.includes('setTimeout(()=>URL.revokeObjectURL(a.href),1000)'));
});
