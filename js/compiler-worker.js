import { compile } from 'https://cdn.jsdelivr.net/npm/browsercc@0.1.1/dist/index.js';

self.onmessage = async (event) => {
  const { source } = event.data || {};
  try {
    self.postMessage({ type: 'status', message: 'Memuat Clang WebAssembly…' });
    const result = await compile({
      source,
      fileName: 'main.cpp',
      flags: ['-O0', '-Wall', '-Wextra', '-std=c++17', '-fdiagnostics-color=never'],
    });
    if (!result.module) {
      self.postMessage({ ok: false, error: result.compileOutput || 'Kompilasi gagal. Periksa sintaks C++.' });
      return;
    }
    self.postMessage({ ok: true, module: result.module, compileOutput: result.compileOutput || '' });
  } catch (error) {
    self.postMessage({ ok: false, error: error?.stack || error?.message || String(error) });
  }
};
