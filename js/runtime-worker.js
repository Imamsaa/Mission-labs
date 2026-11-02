import { WASI, File, OpenFile, ConsoleStdout } from 'https://esm.sh/@bjorn3/browser_wasi_shim@0.4.2';

self.onmessage = async (event) => {
  const { module, input = '' } = event.data || {};
  const encoder = new TextEncoder();
  const outParts = [];
  const errParts = [];
  const outDecoder = new TextDecoder('utf-8');
  const errDecoder = new TextDecoder('utf-8');
  try {
    const inputText = String(input);
    const normalizedInput = inputText && !inputText.endsWith('\n') ? inputText + '\n' : inputText;
    const fds = [
      new OpenFile(new File(encoder.encode(normalizedInput))),
      new ConsoleStdout(bytes => outParts.push(outDecoder.decode(bytes, { stream: true }))),
      new ConsoleStdout(bytes => errParts.push(errDecoder.decode(bytes, { stream: true }))),
    ];
    const wasi = new WASI([], [], fds);
    const instance = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.wasiImport });
    try {
      wasi.start(instance);
    } catch (error) {
      if (!(error?.name === 'WASIExitError' && error?.exitCode === 0)) throw error;
    }
    outParts.push(outDecoder.decode()); errParts.push(errDecoder.decode());
    self.postMessage({ ok: true, stdout: outParts.join(''), stderr: errParts.join('') });
  } catch (error) {
    outParts.push(outDecoder.decode()); errParts.push(errDecoder.decode());
    self.postMessage({ ok: false, stdout: outParts.join(''), stderr: errParts.join(''), error: error?.message || String(error) });
  }
};
