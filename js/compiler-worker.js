import { compile } from "https://cdn.jsdelivr.net/npm/browsercc@0.1.1/dist/index.js";
import { WASI, File, OpenFile, ConsoleStdout } from "https://esm.sh/@bjorn3/browser_wasi_shim@0.4.2";

const INPUT_QUEUE_CAPACITY = 65536;

class SharedQueueStdin extends OpenFile {
  constructor(sharedBuffer) {
    super(new File(new Uint8Array(0)));
    this.header = new Int32Array(sharedBuffer, 0, 4);
    this.queue = new Uint8Array(sharedBuffer, 16);
  }

  fd_read(size) {
    if (size <= 0) return { ret: 0, data: new Uint8Array(0) };
    while (true) {
      const write = Atomics.load(this.header, 0);
      const read = Atomics.load(this.header, 1);
      const available = write - read;

      if (available > 0) {
        const count = Math.min(size, available);
        const result = new Uint8Array(count);
        for (let i = 0; i < count; i++) {
          result[i] = this.queue[(read + i) & (INPUT_QUEUE_CAPACITY - 1)];
        }
        Atomics.store(this.header, 1, read + count);
        Atomics.notify(this.header, 1);
        self.postMessage({ type: 'input-consumed', bytes: count });
        return { ret: 0, data: result };
      }

      if (Atomics.load(this.header, 2) !== 0) {
        return { ret: 0, data: new Uint8Array(0) };
      }

      self.postMessage({ type: 'waiting-input' });
      Atomics.wait(this.header, 0, write);
    }
  }
}

async function executeModule(module, input, sharedInput = null, onOutput = null) {
  const encoder = new TextEncoder();
  const inputText = String(input ?? '');
  const stdoutParts = [];
  const stderrParts = [];
  const stdoutDecoder = new TextDecoder('utf-8');
  const stderrDecoder = new TextDecoder('utf-8');
  const emit = (decoder, parts, bytes, stream) => {
    const text = decoder.decode(bytes, { stream: true });
    if (!text) return;
    parts.push(text);
    if (onOutput) onOutput(text, stream);
  };
  const stdin = sharedInput
    ? new SharedQueueStdin(sharedInput)
    : new OpenFile(new File(encoder.encode(inputText)));
  const fds = [
    stdin,
    new ConsoleStdout(bytes => emit(stdoutDecoder, stdoutParts, bytes, 'stdout')),
    new ConsoleStdout(bytes => emit(stderrDecoder, stderrParts, bytes, 'stderr'))
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

  const stdoutTail = stdoutDecoder.decode();
  const stderrTail = stderrDecoder.decode();
  if (stdoutTail) {
    stdoutParts.push(stdoutTail);
    if (onOutput) onOutput(stdoutTail, 'stdout');
  }
  if (stderrTail) {
    stderrParts.push(stderrTail);
    if (onOutput) onOutput(stderrTail, 'stderr');
  }

  if (sharedInput) {
    const header = new Int32Array(sharedInput, 0, 4);
    Atomics.store(header, 2, 1);
    Atomics.notify(header, 0);
  }

  return {
    stdout: stdoutParts.join(''),
    stderr: stderrParts.join(''),
    runtimeError
  };
}

self.onmessage = async event => {
  const {
    source,
    extraFiles = {},
    testCases = [],
    standard = 'c++20',
    runMode = 'stdin',
    stdin = '',
    sharedInput = null
  } = event.data || {};

  let compileOutput = '';

  try {
    self.postMessage({ type: 'status', message: 'Memuat Clang WebAssembly...' });

    const result = await compile({
      source,
      fileName: 'main.cpp',
      extraFiles,
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
      const execution = await executeModule(
        result.module,
        stdin,
        sharedInput,
        (text, stream) => self.postMessage({ type: 'output', text, stream })
      );
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
