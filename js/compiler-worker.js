import { compile } from "https://cdn.jsdelivr.net/npm/browsercc@0.1.1/dist/index.js";
import { WASI, File, OpenFile, ConsoleStdout } from "https://esm.sh/@bjorn3/browser_wasi_shim@0.4.2";

async function executeModule(module, input) {
  const encoder = new TextEncoder();
  const inputText = String(input ?? '');
  const stdoutParts = [];
  const stderrParts = [];
  const stdoutDecoder = new TextDecoder('utf-8');
  const stderrDecoder = new TextDecoder('utf-8');
  const fds = [
    new OpenFile(new File(encoder.encode(inputText))),
    new ConsoleStdout(bytes => stdoutParts.push(stdoutDecoder.decode(bytes, { stream: true }))),
    new ConsoleStdout(bytes => stderrParts.push(stderrDecoder.decode(bytes, { stream: true })))
  ];
  const wasi = new WASI([], [], fds);
  let runtimeError = '';

  try {
    const instance = await WebAssembly.instantiate(module, {
      wasi_snapshot_preview1: wasi.wasiImport
    });
    try {
      wasi.start(instance);
    } catch (error) {
      if (!(error?.name === 'WASIExitError' && error?.exitCode === 0)) throw error;
    }
  } catch (error) {
    runtimeError = error?.message || String(error);
  }

  stdoutParts.push(stdoutDecoder.decode());
  stderrParts.push(stderrDecoder.decode());

  return {
    stdout: stdoutParts.join(''),
    stderr: stderrParts.join(''),
    runtimeError
  };
}

self.onmessage = async event => {
  const {
    source,
    testCases = [],
    standard = 'c++17',
    runMode = 'stdin',
    stdin = ''
  } = event.data || {};

  let compileOutput = '';

  try {
    self.postMessage({ type: 'status', message: 'Memuat Clang WebAssembly...' });

    const result = await compile({
      source,
      fileName: 'main.cpp',
      flags: [
        '-O0',
        '-Wall',
        '-Wextra',
        '-std=' + standard,
        '-fdiagnostics-color=never',
        '-fno-exceptions'
      ]
    });

    compileOutput = result.compileOutput || '';

    if (!result.module) {
      self.postMessage({
        type: 'result',
        ok: false,
        compileOutput: compileOutput || 'Kompilasi gagal. Tidak ada modul WebAssembly yang dihasilkan.',
        tests: []
      });
      return;
    }

    self.postMessage({ type: 'compile-success', compileOutput });

    if (runMode === 'stdin') {
      const execution = await executeModule(result.module, stdin);
      self.postMessage({
        type: 'stdin-result',
        ok: !execution.runtimeError,
        compileOutput,
        stdout: execution.stdout,
        stderr: execution.stderr,
        runtimeError: execution.runtimeError
      });
      return;
    }

    const tests = [];

    for (let index = 0; index < testCases.length; index++) {
      const testCase = testCases[index] || {};
      self.postMessage({
        type: 'test-case-start',
        index,
        total: testCases.length,
        message: 'Menjalankan test case ' + (index + 1) + ' dari ' + testCases.length + '...'
      });

      const inputText = testCase.input && !testCase.input.endsWith('\n')
        ? testCase.input + '\n'
        : (testCase.input || '');
      const execution = await executeModule(result.module, inputText);

      tests.push({
        index,
        label: testCase.label || ('Test ' + (index + 1)),
        hidden: testCase.hidden === true,
        input: testCase.input || '',
        stdout: execution.stdout,
        stderr: execution.stderr,
        runtimeError: execution.runtimeError
      });
    }

    self.postMessage({ type: 'mission-tests-result', ok: true, compileOutput, tests });
  } catch (error) {
    self.postMessage({
      type: 'result',
      ok: false,
      compileOutput,
      tests: [],
      error: error?.stack || error?.message || String(error)
    });
  }
};
