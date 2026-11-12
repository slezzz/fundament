/**
 * MAIN world, registered with chrome.scripting only while "Fingerprint shield" is on.
 * Classic script: no imports, no Chrome APIs.
 *
 * Read-backs of canvas / WebGL / audio get faint per-session noise, so a fingerprint
 * script computes a different hash in every session. The page's real drawing is never
 * modified: noise is applied to a copy (toDataURL/toBlob) or to the returned buffer.
 */
(function () {
  const w = window as Window & { __fundamentShield?: boolean };
  if (w.__fundamentShield) return;
  try {
    Object.defineProperty(w, "__fundamentShield", { value: true });
  } catch {
    /* ignore */
  }

  const seed = (crypto.getRandomValues(new Uint32Array(1))[0] ?? 7) | 1;

  function noisy(data: Uint8ClampedArray | Uint8Array): void {
    // Flip the lowest bit of ~1 in 61 colour bytes, positions fixed for this session.
    for (let i = 0; i < data.length; i += 4) {
      if (((i >>> 2) * seed) % 61 === 0) {
        const channel = i + (seed % 3);
        const value = data[channel];
        if (value !== undefined) data[channel] = value ^ 1;
      }
    }
  }

  const ctx2dProto = CanvasRenderingContext2D.prototype;
  const originalGetImageData = ctx2dProto.getImageData;
  ctx2dProto.getImageData = function (this: CanvasRenderingContext2D, ...args: Parameters<CanvasRenderingContext2D["getImageData"]>) {
    const image = originalGetImageData.apply(this, args);
    noisy(image.data);
    return image;
  };

  function noisyCopy(source: HTMLCanvasElement): HTMLCanvasElement | null {
    try {
      if (source.width === 0 || source.height === 0 || source.width * source.height > 4_000_000) return null;
      const copy = document.createElement("canvas");
      copy.width = source.width;
      copy.height = source.height;
      const ctx = copy.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(source, 0, 0);
      const image = originalGetImageData.call(ctx, 0, 0, copy.width, copy.height);
      noisy(image.data);
      ctx.putImageData(image, 0, 0);
      return copy;
    } catch {
      return null; // tainted canvas: the page could not read it either
    }
  }

  const canvasProto = HTMLCanvasElement.prototype;
  const originalToDataURL = canvasProto.toDataURL;
  canvasProto.toDataURL = function (this: HTMLCanvasElement, ...args: [string?, number?]) {
    const copy = noisyCopy(this);
    return originalToDataURL.apply(copy ?? this, args);
  };
  const originalToBlob = canvasProto.toBlob;
  canvasProto.toBlob = function (this: HTMLCanvasElement, callback: BlobCallback, ...args: [string?, number?]) {
    const copy = noisyCopy(this);
    return originalToBlob.call(copy ?? this, callback, ...args);
  };

  for (const proto of [WebGLRenderingContext.prototype, (globalThis as { WebGL2RenderingContext?: { prototype: WebGLRenderingContext } }).WebGL2RenderingContext?.prototype]) {
    if (!proto) continue;
    const originalReadPixels = proto.readPixels;
    proto.readPixels = function (this: WebGLRenderingContext, ...args: unknown[]) {
      (originalReadPixels as (...a: unknown[]) => void).apply(this, args);
      const pixels = args[6];
      if (pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray) noisy(pixels);
    } as typeof proto.readPixels;
    const originalGetParameter = proto.getParameter;
    proto.getParameter = function (this: WebGLRenderingContext, pname: number) {
      if (pname === 0x9245) return "Google Inc.";
      if (pname === 0x9246) return "ANGLE (Generic GPU)";
      return originalGetParameter.call(this, pname);
    };
  }

  const touched = new WeakSet<AudioBuffer>();
  const originalChannelData = AudioBuffer.prototype.getChannelData;
  AudioBuffer.prototype.getChannelData = function (this: AudioBuffer, channel: number) {
    const data = originalChannelData.call(this, channel);
    if (!touched.has(this)) {
      touched.add(this);
      for (let i = seed % 97; i < data.length; i += 97) {
        const value = data[i];
        if (value !== undefined) data[i] = value + 1e-7;
      }
    }
    return data;
  };
  const originalFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
  AnalyserNode.prototype.getFloatFrequencyData = function (this: AnalyserNode, array: Float32Array) {
    originalFloatFreq.call(this, array as Float32Array<ArrayBuffer>);
    for (let i = seed % 13; i < array.length; i += 13) {
      const value = array[i];
      if (value !== undefined) array[i] = value + 0.0001;
    }
  };
})();
