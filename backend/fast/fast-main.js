(function() {
  "use strict";
  if (window.__vibesInterceptorLoaded) {
    return;
  }
  const EXCLUDED_SITES = [ "youtube.com", "youtu.be", "chrome.google.com", "chromewebstore.google.com" ];
  const BLOCK_SPEED_RESET_SITES = [ "spotify.com", "pandora.com", "vk.com", "vk.ru" ];
  function isSiteEnabled() {
    const hostname = window.location.hostname.toLowerCase();
    if (window.location.protocol === "chrome:" || window.location.protocol === "chrome-extension:" || window.location.protocol === "about:") {
      return false;
    }
    return !EXCLUDED_SITES.some(site => hostname === site || hostname.endsWith("." + site));
  }
  function shouldBlockSpeedReset() {
    const hostname = window.location.hostname.toLowerCase();
    return BLOCK_SPEED_RESET_SITES.some(site => hostname === site || hostname.endsWith("." + site));
  }
  function isVkSite() {
    const hostname = window.location.hostname.toLowerCase();
    return hostname === "vk.com" || hostname.endsWith(".vk.com") || hostname === "vk.ru" || hostname.endsWith(".vk.ru");
  }
  function isVkCdnUrl(url) {
    if (!url) return false;
    try {
      const hostname = new URL(url, window.location.href).hostname.toLowerCase();
      return hostname.includes("vkuseraudio") || hostname.includes("useraudio") || hostname.includes("vkcdn") || hostname.includes("vk-cdn") || hostname.includes("userapi") || hostname.includes("vkuservideo") || hostname.includes("vkuser") || hostname.endsWith("vk.me");
    } catch {
      return /vkuseraudio|useraudio|vkcdn|vk-cdn|userapi|vkuservideo|vkuser|vk\.me/i.test(url);
    }
  }
  if (!isSiteEnabled()) {
    return;
  }
  if (window.__vibesFastCaptureInjected) {
    return;
  }
  window.__vibesFastCaptureInjected = true;
  let DEBUG = false;
  let log = () => {};
  let warn = () => {};
  window.addEventListener("vibes_debugFlag", e => {
    DEBUG = e.detail?.debug || false;
    window.__vibesDebug = DEBUG;
    if (DEBUG) {
      log = console.log.bind(console);
      warn = console.warn.bind(console);
      log("[Vibes Fast] Debug mode enabled");
      log("[Vibes Fast] MAIN world script loaded on", window.location.hostname);
    }
  });
  const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
  const OriginalAudio = window.Audio;
  const originalCreateElement = document.createElement.bind(document);
  let NativePlaybackRateDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "playbackRate");
  if (!OriginalAudioContext) {
    warn("[Vibes Fast] AudioContext not available in this browser");
    return;
  }
  const state = {
    pitch: 0,
    speed: 1,
    enabled: false,
    vinylPitchMode: false,
    reverbEnabled: false,
    reverbAmount: 50,
    volume: 1,
    contexts: [],
    jungleInstances: [],
    jungleLoaded: false,
    jungleLoadPromise: null,
    freeverbLoaded: false,
    freeverbLoadPromise: null
  };
  function sanitizeSpeed(value) {
    let v = Number(value);
    if (!Number.isFinite(v)) return 1;
    if (v > 4) v = v / 100;
    return Math.max(.25, Math.min(4, v));
  }
  function sanitizeVolume(value) {
    let v = Number(value);
    if (!Number.isFinite(v)) return 1;
    if (v > 6) v = v / 100;
    return Math.max(0, Math.min(6, v));
  }
  window.__vibesFastState = state;
  window.__vibesFastIntercepted = false;
  function getOrCreateMarker() {
    let marker = document.getElementById("vibes-fast-capture-active");
    if (!marker) {
      marker = document.createElement("div");
      marker.id = "vibes-fast-capture-active";
      marker.style.display = "none";
      marker.setAttribute("data-media-count", "0");
      marker.setAttribute("data-playback-media-count", "0");
      (document.body || document.documentElement).appendChild(marker);
      log("[Vibes Fast] Created DOM marker (MAIN world)");
    }
    return marker;
  }
  function getLiveContexts() {
    state.contexts.filter(ctx => ctx.state === "closed").forEach(ctx => ctx._disposeProcessingChain());
    state.contexts = state.contexts.filter(ctx => ctx.state !== "closed");
    return state.contexts;
  }
  function updateMediaCount() {
    const marker = getOrCreateMarker();
    const live = pruneCapturedMedia();
    const mediaCount = new Set(live).size;
    const count = mediaCount + getLiveContexts().length;
    const cors = getCorsCounts(live);
    marker.setAttribute("data-media-count", String(count));
    marker.setAttribute("data-playback-media-count", String(mediaCount));
    marker.setAttribute("data-speed-only-count", String(cors.speedOnlyCount));
    marker.setAttribute("data-full-count", String(cors.fullCount));
    log("[Vibes Fast] Media count updated:", count);
  }
  function getCorsCounts(list) {
    const arr = list || pruneCapturedMedia();
    let speedOnlyCount = 0;
    let fullCount = 0;
    for (const el of arr) {
      if (el.__vibesMode === "speed-only") speedOnlyCount++;
      else if (el.__vibesMode === "full") fullCount++;
    }
    return { speedOnlyCount, fullCount };
  }
  function updateCorsStatus() {
    const marker = getOrCreateMarker();
    const live = pruneCapturedMedia();
    const cors = getCorsCounts(live);
    marker.setAttribute("data-speed-only-count", String(cors.speedOnlyCount));
    marker.setAttribute("data-full-count", String(cors.fullCount));
    log("[Vibes Fast] CORS status updated: speedOnly=" + cors.speedOnlyCount + " full=" + cors.fullCount);
  }
  window.__vibesFastMediaCount = function() {
    return new Set(pruneCapturedMedia()).size + getLiveContexts().length;
  };
  function getMakeupGain() {
    return window.__vibesAudioConfig?.makeupGain?.pitchOnly || 1.2625;
  }
  function getMakeupGainPlusReverb() {
    return window.__vibesAudioConfig?.makeupGain?.pitchPlusReverb || 1.33;
  }
  function getFreeverbConfig() {
    const cfg = window.__vibesAudioConfig?.freeverb;
    if (cfg) return cfg;
    return {
      numCombs: 8,
      numAllpasses: 4,
      stereoSpread: 23,
      combTuningsL: [ 1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617 ],
      allpassTuningsL: [ 556, 441, 341, 225 ],
      fixedGain: .015,
      scaleWet: 3,
      scaleDry: 2,
      scaleDamp: .4,
      scaleRoom: .28,
      offsetRoom: .7,
      initialRoom: .5,
      initialDamp: .5,
      initialWet: 1 / 3,
      initialDry: 0,
      initialWidth: 1,
      initialMode: 0,
      freezeMode: .5
    };
  }
  setTimeout(() => {
    const mediaElements = document.querySelectorAll("audio, video");
    const hasPlayingMedia = Array.from(mediaElements).some(el => !el.paused);
    if (hasPlayingMedia && !window.__vibesFastIntercepted && getLiveContexts().length === 0) {
      warn("[Vibes Fast] Audio playing but no contexts intercepted - RELOAD REQUIRED");
      window.dispatchEvent(new CustomEvent("vibes_needsReload", {
        detail: {
          reason: "Audio context created before extension loaded"
        }
      }));
    }
  }, 3e3);
  let audioConfigUrl = null;
  let audioConfigUrlResolvers = [];
  let audioConfigLoaded = false;
  let jungleUrl = null;
  let jungleUrlResolvers = [];
  window.addEventListener("vibes_audioConfigUrl", e => {
    log("[Vibes Fast] Received audio config URL from bridge:", e.detail.url);
    audioConfigUrl = e.detail.url;
    audioConfigUrlResolvers.forEach(resolve => resolve(audioConfigUrl));
    audioConfigUrlResolvers = [];
  });
  window.addEventListener("vibes_jungleUrl", e => {
    log("[Vibes Fast] Received Jungle URL from bridge:", e.detail.url);
    jungleUrl = e.detail.url;
    jungleUrlResolvers.forEach(resolve => resolve(jungleUrl));
    jungleUrlResolvers = [];
  });
  let freeverbProcessorUrl = null;
  let freeverbProcessorUrlResolvers = [];
  window.addEventListener("vibes_freeverbProcessorUrl", e => {
    log("[Vibes Fast] Received Freeverb processor URL from bridge:", e.detail.url);
    freeverbProcessorUrl = e.detail.url;
    freeverbProcessorUrlResolvers.forEach(resolve => resolve(freeverbProcessorUrl));
    freeverbProcessorUrlResolvers = [];
  });
  function getFreeverbProcessorUrl() {
    if (freeverbProcessorUrl) return Promise.resolve(freeverbProcessorUrl);
    return new Promise(resolve => freeverbProcessorUrlResolvers.push(resolve));
  }
  function getAudioConfigUrl() {
    if (audioConfigUrl) return Promise.resolve(audioConfigUrl);
    return new Promise(resolve => audioConfigUrlResolvers.push(resolve));
  }
  function getJungleUrl() {
    if (jungleUrl) return Promise.resolve(jungleUrl);
    return new Promise(resolve => jungleUrlResolvers.push(resolve));
  }
  async function loadAudioConfig() {
    if (audioConfigLoaded || window.__vibesAudioConfig) {
      audioConfigLoaded = true;
      return window.__vibesAudioConfig;
    }
    try {
      const url = await getAudioConfigUrl();
      log("[Vibes Fast] Loading audio config from:", url);
      return new Promise((resolve, reject) => {
        const script = originalCreateElement("script");
        script.src = url;
        script.onload = () => {
          audioConfigLoaded = true;
          log("[Vibes Fast] Audio config loaded successfully");
          resolve(window.__vibesAudioConfig);
        };
        script.onerror = e => {
          warn("[Vibes Fast] Failed to load audio config, using defaults:", e);
          audioConfigLoaded = true;
          resolve(null);
        };
        document.head.appendChild(script);
      });
    } catch (err) {
      warn("[Vibes Fast] Error loading audio config:", err);
      audioConfigLoaded = true;
      return null;
    }
  }
  function loadJungle() {
    if (state.jungleLoadPromise) return state.jungleLoadPromise;
    state.jungleLoadPromise = new Promise(async (resolve, reject) => {
      if (window.__vibesJungleFast) {
        state.jungleLoaded = true;
        resolve(window.__vibesJungleFast);
        return;
      }
      try {
        await loadAudioConfig();
        const url = await getJungleUrl();
        log("[Vibes Fast] Loading Jungle from:", url);
        const script = originalCreateElement("script");
        script.src = url;
        script.onload = () => {
          state.jungleLoaded = true;
          log("[Vibes Fast] Jungle loaded successfully");
          resolve(window.__vibesJungleFast);
        };
        script.onerror = e => {
          console.error("[Vibes Fast] Failed to load Jungle:", e);
          reject(e);
        };
        document.head.appendChild(script);
      } catch (err) {
        console.error("[Vibes Fast] Error loading Jungle:", err);
        reject(err);
      }
    });
    return state.jungleLoadPromise;
  }
  function generateFreeverbProcessorCode() {
    const cfg = getFreeverbConfig();
    return `\n// Freeverb AudioWorklet Processor - Inlined for Fast Capture\n// Faithful port of Jezar's Freeverb C++ algorithm (public domain)\n// Configuration loaded from audio-config.js\nconst TUNING = {\n  numCombs: ${cfg.numCombs},\n  numAllpasses: ${cfg.numAllpasses},\n  fixedGain: ${cfg.fixedGain},\n  scaleWet: ${cfg.scaleWet},\n  scaleDry: ${cfg.scaleDry},\n  scaleDamp: ${cfg.scaleDamp},\n  scaleRoom: ${cfg.scaleRoom},\n  offsetRoom: ${cfg.offsetRoom},\n  initialRoom: ${cfg.initialRoom},\n  initialDamp: ${cfg.initialDamp},\n  initialWet: ${cfg.initialWet},\n  initialDry: ${cfg.initialDry},\n  initialWidth: ${cfg.initialWidth},\n  initialMode: ${cfg.initialMode},\n  freezeMode: ${cfg.freezeMode},\n  stereoSpread: ${cfg.stereoSpread},\n  combTuningsL: ${JSON.stringify(cfg.combTuningsL)},\n  allpassTuningsL: ${JSON.stringify(cfg.allpassTuningsL)}\n};\n\nclass CombFilter {\n  constructor(bufferSize) {\n    this.buffer = new Float32Array(bufferSize);\n    this.bufferSize = bufferSize;\n    this.bufferIndex = 0;\n    this.filterStore = 0;\n    this.feedback = 0;\n    this.damp1 = 0;\n    this.damp2 = 1;\n  }\n  setDamp(val) { this.damp1 = val; this.damp2 = 1 - val; }\n  setFeedback(val) { this.feedback = val; }\n  process(input) {\n    let output = this.buffer[this.bufferIndex];\n    if (Math.abs(output) < 1e-18) output = 0;\n    this.filterStore = (output * this.damp2) + (this.filterStore * this.damp1);\n    if (Math.abs(this.filterStore) < 1e-18) this.filterStore = 0;\n    this.buffer[this.bufferIndex] = input + (this.filterStore * this.feedback);\n    if (++this.bufferIndex >= this.bufferSize) this.bufferIndex = 0;\n    return output;\n  }\n  mute() { this.buffer.fill(0); this.filterStore = 0; }\n}\n\nclass AllpassFilter {\n  constructor(bufferSize) {\n    this.buffer = new Float32Array(bufferSize);\n    this.bufferSize = bufferSize;\n    this.bufferIndex = 0;\n    this.feedback = 0.5;\n  }\n  setFeedback(val) { this.feedback = val; }\n  process(input) {\n    let bufout = this.buffer[this.bufferIndex];\n    if (Math.abs(bufout) < 1e-18) bufout = 0;\n    const output = -input + bufout;\n    this.buffer[this.bufferIndex] = input + (bufout * this.feedback);\n    if (++this.bufferIndex >= this.bufferSize) this.bufferIndex = 0;\n    return output;\n  }\n  mute() { this.buffer.fill(0); }\n}\n\nclass FreeverbProcessor extends AudioWorkletProcessor {\n  constructor() {\n    super();\n    const sampleRatio = sampleRate / 44100;\n    this.combsL = TUNING.combTuningsL.map(size => new CombFilter(Math.round(size * sampleRatio)));\n    this.combsR = TUNING.combTuningsL.map(size => new CombFilter(Math.round((size + TUNING.stereoSpread) * sampleRatio)));\n    this.allpassesL = TUNING.allpassTuningsL.map(size => new AllpassFilter(Math.round(size * sampleRatio)));\n    this.allpassesR = TUNING.allpassTuningsL.map(size => new AllpassFilter(Math.round((size + TUNING.stereoSpread) * sampleRatio)));\n    [...this.allpassesL, ...this.allpassesR].forEach(ap => ap.setFeedback(0.5));\n    this.gain = TUNING.fixedGain;\n    this.roomSize = 0; this.roomSize1 = 0; this.damp = 0; this.damp1 = 0;\n    this.wet = 0; this.wet1 = 0; this.wet2 = 0; this.dry = 0; this.width = 1; this.mode = 0;\n    this.setRoomSize(TUNING.initialRoom); this.setDamp(TUNING.initialDamp);\n    this.setWet(TUNING.initialWet); this.setDry(TUNING.initialDry);\n    this.setWidth(TUNING.initialWidth); this.setMode(TUNING.initialMode);\n    this.mute();\n    this.port.onmessage = (e) => this.handleMessage(e.data);\n  }\n  handleMessage(data) {\n    switch (data.type) {\n      case 'setRoomSize': this.setRoomSize(data.value); break;\n      case 'setDamp': this.setDamp(data.value); break;\n      case 'setWet': this.setWet(data.value); break;\n      case 'setDry': this.setDry(data.value); break;\n      case 'setWidth': this.setWidth(data.value); break;\n      case 'setMode': this.setMode(data.value); break;\n      case 'mute': this.mute(); break;\n    }\n  }\n  update() {\n    this.wet1 = this.wet * (this.width / 2 + 0.5);\n    this.wet2 = this.wet * ((1 - this.width) / 2);\n    if (this.mode >= TUNING.freezeMode) {\n      this.roomSize1 = 1; this.damp1 = 0; this.gain = 0;\n    } else {\n      this.roomSize1 = this.roomSize; this.damp1 = this.damp; this.gain = TUNING.fixedGain;\n    }\n    for (let i = 0; i < TUNING.numCombs; i++) {\n      this.combsL[i].setFeedback(this.roomSize1); this.combsR[i].setFeedback(this.roomSize1);\n      this.combsL[i].setDamp(this.damp1); this.combsR[i].setDamp(this.damp1);\n    }\n  }\n  setRoomSize(value) { this.roomSize = (value * TUNING.scaleRoom) + TUNING.offsetRoom; this.update(); }\n  setDamp(value) { this.damp = value * TUNING.scaleDamp; this.update(); }\n  setWet(value) { this.wet = value * TUNING.scaleWet; this.update(); }\n  setDry(value) { this.dry = value * TUNING.scaleDry; }\n  setWidth(value) { this.width = value; this.update(); }\n  setMode(value) { this.mode = value; this.update(); }\n  mute() {\n    if (this.mode >= TUNING.freezeMode) return;\n    for (let i = 0; i < TUNING.numCombs; i++) { this.combsL[i].mute(); this.combsR[i].mute(); }\n    for (let i = 0; i < TUNING.numAllpasses; i++) { this.allpassesL[i].mute(); this.allpassesR[i].mute(); }\n  }\n  process(inputs, outputs) {\n    const input = inputs[0], output = outputs[0];\n    if (!output || !output[0]) return true;\n    const inputL = input?.[0], inputR = input?.[1] || inputL;\n    const outputL = output[0], outputR = output[1] || output[0];\n    const numSamples = outputL.length;\n    const { combsL, combsR, allpassesL, allpassesR, gain, wet1, wet2, dry } = this;\n    for (let n = 0; n < numSamples; n++) {\n      const sampleL = inputL?.[n] || 0, sampleR = inputR?.[n] || 0;\n      const inp = (sampleL + sampleR) * gain;\n      let outL = 0, outR = 0;\n      for (let i = 0; i < TUNING.numCombs; i++) { outL += combsL[i].process(inp); outR += combsR[i].process(inp); }\n      for (let i = 0; i < TUNING.numAllpasses; i++) { outL = allpassesL[i].process(outL); outR = allpassesR[i].process(outR); }\n      outputL[n] = outL * wet1 + outR * wet2 + sampleL * dry;\n      outputR[n] = outR * wet1 + outL * wet2 + sampleR * dry;\n    }\n    return true;\n  }\n}\nregisterProcessor('freeverb-processor', FreeverbProcessor);\n`;
  }
  async function loadFreeverbForContext(audioContext) {
    try {
      try {
        const processorCode = generateFreeverbProcessorCode();
        const blob = new Blob([ processorCode ], {
          type: "application/javascript"
        });
        const blobUrl = URL.createObjectURL(blob);
        log("[Vibes Fast] Loading Freeverb AudioWorklet from Blob URL");
        try {
          await audioContext.audioWorklet.addModule(blobUrl);
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
        log("[Vibes Fast] Freeverb loaded from Blob URL");
      } catch (blobErr) {
        if (audioContext.state === "closed") return null;
        log("[Vibes Fast] Blob URL failed (" + blobErr.message + "), trying extension URL fallback");
        const extUrl = await getFreeverbProcessorUrl();
        if (audioContext.state === "closed") return null;
        if (extUrl) {
          log("[Vibes Fast] Loading Freeverb AudioWorklet from extension URL");
          await audioContext.audioWorklet.addModule(extUrl);
          log("[Vibes Fast] Freeverb loaded from extension URL");
        } else {
          throw new Error("No extension URL available and blob failed");
        }
      }
      if (audioContext.state === "closed") return null;
      const workletNode = new AudioWorkletNode(audioContext, "freeverb-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [ 2 ]
      });
      const wetGain = audioContext.createGain();
      const dryGain = audioContext.createGain();
      wetGain.gain.value = 0;
      dryGain.gain.value = 1;
      log("[Vibes Fast] Freeverb AudioWorklet loaded successfully");
      state.freeverbLoaded = true;
      return {
        workletNode: workletNode,
        wetGain: wetGain,
        dryGain: dryGain
      };
    } catch (err) {
      warn("[Vibes Fast] Freeverb AudioWorklet failed to load:", err.message);
      return null;
    }
  }
  class HookedAudioContext extends OriginalAudioContext {
    constructor(options) {
      super(options);
      log("[Vibes Fast] AudioContext created - setting up interception");
      window.__vibesFastIntercepted = true;
      this._realDestination = super.destination;
      this._setupProcessingChain();
      state.contexts.push(this);
      this.addEventListener("statechange", () => {
        if (this.state === "closed") {
          this._disposeProcessingChain();
          updateMediaCount();
        }
      });
      this._processorsInitStarted = false;
      this._maybeInitProcessors();
      updateMediaCount();
    }
    _setupProcessingChain() {
      this._fakeDestination = this.createGain();
      this._fakeDestination.gain.value = 1;
      this._bypassGain = this.createGain();
      this._bypassGain.gain.value = 1;
      this._wetGain = this.createGain();
      this._wetGain.gain.value = 0;
      this._processorsReady = false;
      this._volumeGain = this.createGain();
      this._volumeGain.gain.value = state.enabled ? state.volume : 1;
      this._fakeDestination.connect(this._bypassGain);
      this._bypassGain.connect(this._volumeGain);
      this._wetGain.connect(this._volumeGain);
      this._volumeGain.connect(this._realDestination);
      log("[Vibes Fast] Processing chain created");
    }
    _needsProcessing() {
      return state.enabled && (state.pitch !== 0 || state.reverbEnabled);
    }
    _maybeInitProcessors() {
      if (this._processorsInitStarted || this._processorsReady || this.state === "closed") return;
      if (!this._needsProcessing()) return;
      this._processorsInitStarted = true;
      this._initProcessors().then(() => {
        if (this.state !== "closed" && this._processorsReady) this._applySettings();
      });
    }
    async _initProcessors() {
      try {
        await loadJungle();
        if (this.state === "closed") return;
        if (!window.__vibesJungleFast) {
          warn("[Vibes Fast] Jungle class not available");
          return;
        }
        this._splitter = this.createChannelSplitter(2);
        this._merger = this.createChannelMerger(2);
        this._jungleL = new window.__vibesJungleFast(this);
        this._jungleR = new window.__vibesJungleFast(this);
        state.jungleInstances.push(this._jungleL, this._jungleR);
        // Explicit speaker upmix duplicates mono into both splitter channels.
        this._stereoInput = this.createGain();
        this._stereoInput.channelCount = 2;
        this._stereoInput.channelCountMode = "explicit";
        this._stereoInput.channelInterpretation = "speakers";
        this._fakeDestination.connect(this._stereoInput);
        this._stereoInput.connect(this._splitter);
        this._splitter.connect(this._jungleL.input, 0);
        this._jungleL.output.connect(this._merger, 0, 0);
        this._splitter.connect(this._jungleR.input, 1);
        this._jungleR.output.connect(this._merger, 0, 1);
        const freeverbNodes = await loadFreeverbForContext(this);
        if (this.state === "closed") {
          freeverbNodes?.workletNode.disconnect();
          freeverbNodes?.workletNode.port.close();
          freeverbNodes?.wetGain.disconnect();
          freeverbNodes?.dryGain.disconnect();
          this._disposeProcessors();
          return;
        }
        if (freeverbNodes) {
          this._reverbWorklet = freeverbNodes.workletNode;
          this._reverbWetGain = freeverbNodes.wetGain;
          this._reverbDryGain = freeverbNodes.dryGain;
          this._reverbEnabled = false;
          try {
            this._reverbWorklet.port.postMessage({
              type: "setWet",
              value: .33
            });
            this._reverbWorklet.port.postMessage({
              type: "setDry",
              value: 0
            });
            this._reverbWorklet.port.postMessage({
              type: "setRoomSize",
              value: .5
            });
            this._reverbWorklet.port.postMessage({
              type: "setDamp",
              value: .5
            });
            this._reverbWorklet.port.postMessage({
              type: "setWidth",
              value: 1
            });
          } catch (e) {}
          this._merger.connect(this._reverbDryGain);
          this._merger.connect(this._reverbWorklet);
          this._reverbWorklet.connect(this._reverbWetGain);
          this._reverbDryGain.connect(this._wetGain);
          this._reverbWetGain.connect(this._wetGain);
          log("[Vibes Fast] Full stereo audio chain with Freeverb initialized");
        } else {
          throw new Error("Freeverb initialization failed");
        }
        this._processorsReady = true;
        this._applySettings();
      } catch (err) {
        this._disposeProcessors();
        this._processorsInitStarted = false;
        if (this.state !== "closed") {
          const now = this.currentTime;
          this._bypassGain.gain.cancelScheduledValues(now);
          this._bypassGain.gain.setValueAtTime(1, now);
          this._wetGain.gain.cancelScheduledValues(now);
          this._wetGain.gain.setValueAtTime(0, now);
        }
        console.error("[Vibes Fast] Failed to initialize processors:", err);
      }
    }
    _disposeProcessors() {
      this._processorsReady = false;
      const jungles = [ this._jungleL, this._jungleR ];
      for (const jungle of jungles) {
        try { jungle?.dispose(); } catch (err) {}
        try { jungle?.input.disconnect(); } catch (err) {}
        try { jungle?.output.disconnect(); } catch (err) {}
      }
      state.jungleInstances = state.jungleInstances.filter(jungle => !jungles.includes(jungle));
      try { this._reverbWorklet?.port.close(); } catch (err) {}
      if (this._stereoInput) {
        try { this._fakeDestination.disconnect(this._stereoInput); } catch (err) {}
      }
      for (const key of [ "_stereoInput", "_splitter", "_merger", "_reverbWorklet", "_reverbWetGain", "_reverbDryGain" ]) {
        try { this[key]?.disconnect(); } catch (err) {}
        this[key] = null;
      }
      this._jungleL = this._jungleR = null;
    }
    _disposeProcessingChain() {
      if (this._disposed) return;
      this._disposed = true;
      this._disposeProcessors();
      for (const node of [ this._fakeDestination, this._bypassGain, this._wetGain, this._volumeGain ]) {
        try { node.disconnect(); } catch (err) {}
      }
      state.contexts = state.contexts.filter(ctx => ctx !== this);
    }
    async close() {
      await super.close();
      this._disposeProcessingChain();
      updateMediaCount();
    }
    get destination() {
      return this._fakeDestination;
    }
    setPitch(semitones) {
      this._maybeInitProcessors();
      if (!this._processorsReady || this.state === "closed") return;
      if (this._jungleL) {
        this._jungleL.setSemitones(semitones);
      }
      if (this._jungleR) {
        this._jungleR.setSemitones(semitones);
      }
      this._updateOutputGain();
    }
    setEnabled(enabled) {
      if (this.state === "closed") return;
      const now = this.currentTime;
      if (enabled) {
        this._maybeInitProcessors();
        if (!this._processorsReady) {
          this._bypassGain.gain.setTargetAtTime(1, now, .02);
          this._wetGain.gain.setTargetAtTime(0, now, .02);
        } else {
          if (this._stereoInput) {
            try { this._fakeDestination.disconnect(this._stereoInput); } catch (err) {}
            try { this._fakeDestination.connect(this._stereoInput); } catch (err) {}
          }
          this._bypassGain.gain.setTargetAtTime(0, now, .02);
          this._updateOutputGain();
        }
      } else {
        if (this._stereoInput) {
          try { this._fakeDestination.disconnect(this._stereoInput); } catch (err) {}
        }
        this._bypassGain.gain.setTargetAtTime(1, now, .02);
        this._wetGain.gain.setTargetAtTime(0, now, .02);
      }
      this.setVolume(state.volume);
    }
    _updateOutputGain() {
      if (!state.enabled || !this._processorsReady || this.state === "closed") return;
      const hasPitch = state.pitch !== 0;
      const hasReverb = this._reverbEnabled;
      let gain;
      if (hasPitch && hasReverb) {
        gain = getMakeupGainPlusReverb();
      } else if (hasPitch) {
        gain = getMakeupGain();
      } else {
        gain = 1;
      }
      const now = this.currentTime;
      this._wetGain.gain.setTargetAtTime(gain, now, .02);
    }
    setVolume(volume) {
      if (this.state === "closed") return;
      const now = this.currentTime;
      this._volumeGain.gain.setTargetAtTime(state.enabled ? volume : 1, now, .02);
    }
    setReverb(enabled, amount) {
      if (this.state === "closed") return;
      if (enabled) this._maybeInitProcessors();
      this._reverbEnabled = enabled;
      this._updateOutputGain();
      if (this._reverbWetGain && this._reverbDryGain) {
        const now = this.currentTime;
        if (enabled) {
          const t = (amount ?? 50) / 100;
          const wetGain = .5 + t * 1.15;
          const dryGain = .96 - t * .08;
          this._reverbWetGain.gain.setTargetAtTime(wetGain, now, .02);
          this._reverbDryGain.gain.setTargetAtTime(dryGain, now, .02);
        } else {
          this._reverbWetGain.gain.cancelScheduledValues(now);
          this._reverbWetGain.gain.setValueAtTime(0, now);
          this._reverbDryGain.gain.cancelScheduledValues(now);
          this._reverbDryGain.gain.setValueAtTime(1, now);
        }
        log("[Vibes Fast] Reverb set:", enabled ? `${amount}%` : "off");
      }
      if (this._reverbWorklet) {
        try {
          if (enabled) {
            const t = (amount ?? 50) / 100;
            this._reverbWorklet.port.postMessage({
              type: "setWet",
              value: .33
            });
            this._reverbWorklet.port.postMessage({
              type: "setRoomSize",
              value: t * .29
            });
            const damping = t <= .2 ? .85 - t / .2 * .15 : .7 - (t - .2) / .8 * .315;
            this._reverbWorklet.port.postMessage({
              type: "setDamp",
              value: damping
            });
            this._reverbWorklet.port.postMessage({
              type: "setWidth",
              value: .4 + t * .6
            });
          } else {
            this._reverbWorklet.port.postMessage({
              type: "setWet",
              value: 0
            });
            this._reverbWorklet.port.postMessage({
              type: "mute",
              value: null
            });
          }
        } catch (e) {}
      }
    }
    _applySettings() {
      this._maybeInitProcessors();
      this.setPitch(state.pitch);
      this.setEnabled(state.enabled);
      this.setVolume(state.volume);
      this.setReverb(state.reverbEnabled, state.reverbAmount);
    }
  }
  const OFFLOAD_AUDIO_PIPELINE_CONTEXT = true;
  window.AudioContext = HookedAudioContext;
  if (window.webkitAudioContext) {
    window.webkitAudioContext = HookedAudioContext;
  }
  if (OFFLOAD_AUDIO_PIPELINE_CONTEXT) {
    try {
      Object.defineProperty(window, "AudioContext", {
        get() {
          return HookedAudioContext;
        },
        set() {},
        configurable: true
      });
      if (window.webkitAudioContext) {
        Object.defineProperty(window, "webkitAudioContext", {
          get() {
            return HookedAudioContext;
          },
          set() {},
          configurable: true
        });
      }
      log("[Vibes Fast] Indexed");
    } catch (e) {
      warn("[Vibes Fast] Audio setup warning:", e.message);
    }
  }
  log("[Vibes Fast] AudioContext hook installed");
  getOrCreateMarker();
  let vibesSpeedActivated = false;
  if (OFFLOAD_AUDIO_PIPELINE_CONTEXT && NativePlaybackRateDescriptor) {
    try {
      Object.defineProperty(HTMLMediaElement.prototype, "playbackRate", {
        get() {
          return NativePlaybackRateDescriptor.get.call(this);
        },
        set(v) {
          if (!vibesSpeedActivated) {
            NativePlaybackRateDescriptor.set.call(this, v);
            return;
          }
          if (this.__vibesSpeedControl) {
            this.__vibesSpeedControl.setSpeed(v);
          } else {
            NativePlaybackRateDescriptor.set.call(this, v);
          }
        },
        configurable: true
      });
      log("[Vibes Fast] playbackRate protected");
    } catch (e) {}
  }
  window.__vibesActivateSpeedControl = () => {
    vibesSpeedActivated = true;
  };
  window.Audio = class HookedAudio extends OriginalAudio {
    constructor(src) {
      super(src);
      log("[Vibes Fast] Audio element created:", src?.substring(0, 50));
      queueMediaElementForCapture(this);
    }
  };
  Object.setPrototypeOf(window.Audio, OriginalAudio);
  document.createElement = function(tagName, options) {
    const element = originalCreateElement(tagName, options);
    const tag = tagName.toLowerCase();
    if (tag === "audio" || tag === "video") {
      log("[Vibes Fast] Media element created via createElement:", tag);
      queueMediaElementForCapture(element);
    }
    return element;
  };
  const pendingMediaElements = new Set;
  function queueMediaElementForCapture(element) {
    log("[Vibes Fast] Queuing media element for capture:", element.tagName, "src:", element.src?.substring(0, 60) || "NONE (will wait for src)");
    pendingMediaElements.add(element);
    setTimeout(() => {
      if (pendingMediaElements.has(element)) {
        log("[Vibes Fast] [DIAG] Timeout capture attempt — src:", element.src?.substring(0, 80) || "STILL NONE");
        captureMediaElement(element);
        pendingMediaElements.delete(element);
      }
    }, 100);
    element.addEventListener("loadstart", () => {
      log("[Vibes Fast] [DIAG] loadstart fired — src:", element.src?.substring(0, 80) || "NONE");
      if (pendingMediaElements.has(element)) {
        captureMediaElement(element);
        pendingMediaElements.delete(element);
      }
    }, {
      once: true
    });
    element.addEventListener("playing", () => {
      log("[Vibes Fast] [DIAG] playing fired — src:", element.src?.substring(0, 80) || "NONE");
      if (pendingMediaElements.has(element)) {
        captureMediaElement(element);
        pendingMediaElements.delete(element);
      }
    }, {
      once: true
    });
    element.addEventListener("canplay", () => {
      log("[Vibes Fast] [DIAG] canplay fired — src:", element.src?.substring(0, 80) || "NONE");
      if (pendingMediaElements.has(element)) {
        captureMediaElement(element);
        pendingMediaElements.delete(element);
      }
    }, {
      once: true
    });
  }
  window.addEventListener("vibes_settingsUpdate", e => {
    const settings = e.detail;
    log("[Vibes Fast] Settings received:", settings);
    if (window.__vibesActivateSpeedControl) {
      window.__vibesActivateSpeedControl();
    }
    if (settings.pitch !== undefined) state.pitch = settings.pitch;
    if (settings.speed !== undefined) state.speed = sanitizeSpeed(settings.speed);
    if (settings.enabled !== undefined) state.enabled = settings.enabled;
    if (settings.vinylPitchMode !== undefined) state.vinylPitchMode = settings.vinylPitchMode;
    if (settings.reverbEnabled !== undefined) state.reverbEnabled = settings.reverbEnabled;
    if (settings.reverbAmount !== undefined) state.reverbAmount = settings.reverbAmount;
    if (settings.volume !== undefined) state.volume = sanitizeVolume(settings.volume);
    getLiveContexts().forEach(ctx => {
      if (settings.pitch !== undefined) ctx.setPitch(state.pitch);
      if (settings.enabled !== undefined) ctx.setEnabled(state.enabled);
      if (settings.volume !== undefined) ctx.setVolume(state.volume);
      if (settings.reverbEnabled !== undefined || settings.reverbAmount !== undefined) {
        ctx.setReverb(state.reverbEnabled, state.reverbAmount);
      }
    });
    if (settings.enabled !== undefined || settings.speed !== undefined || settings.vinylPitchMode !== undefined) {
      pruneCapturedMedia().forEach(el => {
        try {
          if (el.__vibesDead) return;
          const preservePitch = !state.enabled || !state.vinylPitchMode;
          el.preservesPitch = preservePitch;
          el.mozPreservesPitch = preservePitch;
          el.webkitPreservesPitch = preservePitch;
          const desiredSpeed = state.enabled ? state.speed : 1;
          let currentRate = desiredSpeed;
          try {
            currentRate = NativePlaybackRateDescriptor ? NativePlaybackRateDescriptor.get.call(el) : el.playbackRate;
          } catch (err) {}
          if (el.__vibesSpeedControl) {
            if (currentRate !== desiredSpeed) el.__vibesSpeedControl.setSpeed(desiredSpeed);
            if (desiredSpeed !== 1 && state.enabled) {
              el.__vibesSpeedControl.lock();
            } else {
              el.__vibesSpeedControl.unlock();
            }
          } else if (currentRate !== desiredSpeed) {
            if (NativePlaybackRateDescriptor) NativePlaybackRateDescriptor.set.call(el, desiredSpeed);
            else el.playbackRate = desiredSpeed;
          }
          touchMediaElement(el);
        } catch (err) {
          console.error("[Vibes Fast] Failed to set playbackRate:", err);
        }
      });
    }
    if (settings.enabled !== undefined) {
      pruneCapturedMedia().forEach(el => {
        if (el.__vibesDead) return;
        if (!state.enabled) el.__vibesCaptureAttempt?.controller.abort();
        else if (el.__vibesMode === "speed-only" && !el.__vibesCaptureAttempt) {
          capturedMedia.delete(el);
          captureMediaElement(el);
        }
      });
    }
    updateMediaCount();
  });
  const capturedMedia = new WeakSet;
  const capturedMediaElements = [];
  const MAX_TRACKED_MEDIA = 5;
  const DEAD_MEDIA_PRUNE_MS = 60 * 1e3;
  function touchMediaElement(el) {
    try {
      el.__vibesLastSeen = Date.now();
    } catch (err) {}
  }
  function addTrackedMedia(el) {
    touchMediaElement(el);
    if (!capturedMediaElements.includes(el)) {
      capturedMediaElements.push(el);
    }
    if (capturedMediaElements.length > MAX_TRACKED_MEDIA * 2) {
      pruneCapturedMedia();
    }
  }
  function removeTrackedMedia(el) {
    const idx = capturedMediaElements.indexOf(el);
    if (idx !== -1) capturedMediaElements.splice(idx, 1);
  }
  function scheduleDeadMediaPrune(el) {
    setTimeout(() => {
      try {
        const lastSeen = el.__vibesLastSeen || 0;
        if ((el.ended || el.paused) && Date.now() - lastSeen > DEAD_MEDIA_PRUNE_MS) {
          removeTrackedMedia(el);
          updateMediaCount();
        }
      } catch (err) {}
    }, DEAD_MEDIA_PRUNE_MS + 1e3);
  }
  function pruneCapturedMedia() {
    const seen = new Set;
    const live = [];
    const now = Date.now();
    for (const el of capturedMediaElements) {
      if (!el || seen.has(el)) continue;
      seen.add(el);
      try {
        if (el.__vibesDead) continue;
        const lastSeen = el.__vibesLastSeen || 0;
        if (el.ended && (!lastSeen || now - lastSeen > DEAD_MEDIA_PRUNE_MS)) continue;
        live.push(el);
      } catch (err) {
        continue;
      }
    }
    let trimmed = live;
    if (live.length > MAX_TRACKED_MEDIA) {
      trimmed = live.slice().sort((a, b) => (b.__vibesLastSeen || 0) - (a.__vibesLastSeen || 0)).slice(0, MAX_TRACKED_MEDIA);
    }
    if (trimmed.length !== capturedMediaElements.length) {
      capturedMediaElements.length = 0;
      capturedMediaElements.push(...trimmed);
    }
    return capturedMediaElements;
  }
  let mediaCaptureContext = null;
  function getMediaCaptureContext() {
    getLiveContexts();
    if (!mediaCaptureContext || mediaCaptureContext.state === "closed") {
      mediaCaptureContext = new HookedAudioContext;
    }
    return mediaCaptureContext;
  }
  function overridePlaybackRate(mediaElement) {
    if (!shouldBlockSpeedReset()) {
      mediaElement.__vibesSpeedControl = {
        lock: () => {},
        unlock: () => {},
        setSpeed: speed => {
          if (speed > 0 && NativePlaybackRateDescriptor) {
            NativePlaybackRateDescriptor.set.call(mediaElement, speed);
          }
        }
      };
      return;
    }
    if (!NativePlaybackRateDescriptor) {
      warn("[Vibes Fast] Could not get playbackRate descriptor");
      return;
    }
    const originalDescriptor = NativePlaybackRateDescriptor;
    let ourSpeed = state.speed > 0 ? state.speed : 1;
    let lockSpeed = false;
    let settingFromVibes = false;
    Object.defineProperty(mediaElement, "playbackRate", {
      get() {
        return originalDescriptor.get.call(this);
      },
      set(value) {
        if (settingFromVibes) {
          originalDescriptor.set.call(this, value);
          return;
        }
        if (lockSpeed) {
          originalDescriptor.set.call(this, ourSpeed);
          if (value !== ourSpeed) {
            log("[Vibes Fast] Blocked external speed change, keeping:", ourSpeed);
          }
          return;
        }
        originalDescriptor.set.call(this, value);
      },
      configurable: true
    });
    mediaElement.__vibesSpeedControl = {
      lock: () => {
        lockSpeed = true;
      },
      unlock: () => {
        lockSpeed = false;
      },
      setSpeed: speed => {
        if (speed > 0) {
          ourSpeed = speed;
          settingFromVibes = true;
          originalDescriptor.set.call(mediaElement, speed);
          settingFromVibes = false;
        }
      }
    };
    log("[Vibes Fast] playbackRate override installed (with reset blocking)");
  }
  function isCrossOrigin(mediaElement) {
    const src = mediaElement.currentSrc || mediaElement.src || "";
    if (!src || src.startsWith("blob:") || src.startsWith("data:")) return false;
    try {
      return new URL(src, window.location.href).origin !== window.location.origin;
    } catch {
      return false;
    }
  }
  async function supportsCors(url, credentialMode, signal) {
    for (const method of [ "HEAD", "GET" ]) {
      if (signal?.aborted) return false;
      const controller = new AbortController;
      const abort = () => controller.abort();
      if (signal) signal.addEventListener("abort", abort, { once: true });
      const timeout = setTimeout(abort, 2e3);
      let response;
      try {
        response = await fetch(url, {
          method,
          ...(method === "GET" ? { headers: { Range: "bytes=0-0" } } : {}),
          mode: "cors",
          credentials: credentialMode === "use-credentials" ? "include" : "same-origin",
          signal: controller.signal
        });
        if (!controller.signal.aborted && response.ok) return true;
      } catch (err) {
      } finally {
        clearTimeout(timeout);
        if (signal) signal.removeEventListener("abort", abort);
        try { await response?.body?.cancel(); } catch (err) {}
      }
    }
    return false;
  }
  function waitForMediaReady(mediaElement, signal) {
    if (signal.aborted) return Promise.resolve("aborted");
    if (mediaElement.error) return Promise.resolve("error");
    if (mediaElement.readyState >= 3) return Promise.resolve("canplay");
    return new Promise(resolve => {
      const finish = result => {
        clearTimeout(timeout);
        mediaElement.removeEventListener("canplay", canplay);
        mediaElement.removeEventListener("error", error);
        signal.removeEventListener("abort", abort);
        resolve(result);
      };
      const canplay = () => finish("canplay");
      const error = () => finish("error");
      const abort = () => finish("aborted");
      const timeout = setTimeout(() => finish("timeout"), 3e3);
      mediaElement.addEventListener("canplay", canplay);
      mediaElement.addEventListener("error", error);
      signal.addEventListener("abort", abort, { once: true });
    });
  }
  function setupSpeedReapplyListeners(mediaElement) {
    if (mediaElement.__vibesSpeedListeners) return;
    mediaElement.__vibesSpeedListeners = true;
    const reapplySpeed = () => {
      touchMediaElement(mediaElement);
      const desiredSpeed = state.enabled ? state.speed : 1;
      let currentRate = 1;
      try {
        currentRate = NativePlaybackRateDescriptor ? NativePlaybackRateDescriptor.get.call(mediaElement) : mediaElement.playbackRate;
      } catch (err) {}
      try {
        const preservePitch = !state.enabled || !state.vinylPitchMode;
        mediaElement.preservesPitch = preservePitch;
        mediaElement.mozPreservesPitch = preservePitch;
        mediaElement.webkitPreservesPitch = preservePitch;
      } catch (err) {}
      if (currentRate === desiredSpeed) return;
      try {
        if (mediaElement.__vibesSpeedControl) {
          mediaElement.__vibesSpeedControl.setSpeed(desiredSpeed);
        } else if (NativePlaybackRateDescriptor) {
          NativePlaybackRateDescriptor.set.call(mediaElement, desiredSpeed);
        }
        log("[Vibes Fast] Speed re-applied after track change:", desiredSpeed);
      } catch (err) {}
    };
    const reapplyAfterTrackChange = () => {
      touchMediaElement(mediaElement);
      if (!isVkSite()) return;
      const source = mediaElement.currentSrc || mediaElement.src || "";
      if (source && mediaElement.__vibesLastCapturedSrc !== source) {
        log("[Vibes Fast] VK source changed — keeping existing audio graph");
        mediaElement.__vibesLastCapturedSrc = source;
        mediaElement.__vibesCaptureGeneration = (mediaElement.__vibesCaptureGeneration || 0) + 1;
      }
      reapplySpeed();
    };
    [ "loadstart", "loadedmetadata", "durationchange", "canplay", "play", "playing" ].forEach(eventName => {
      mediaElement.addEventListener(eventName, reapplyAfterTrackChange);
    });
    mediaElement.addEventListener("ended", () => {
      scheduleDeadMediaPrune(mediaElement);
      [ 0, 50, 250, 1e3 ].forEach(delay => {
        setTimeout(reapplyAfterTrackChange, delay);
      });
    });
    mediaElement.addEventListener("emptied", () => scheduleDeadMediaPrune(mediaElement));
    mediaElement.addEventListener("error", () => scheduleDeadMediaPrune(mediaElement));
  }
  function registerSpeedOnlyMode(mediaElement) {
    overridePlaybackRate(mediaElement);
    mediaElement.__vibesMode = "speed-only";
    addTrackedMedia(mediaElement);
    updateMediaCount();
    const desiredSpeed = state.enabled ? state.speed : 1;
    if (desiredSpeed !== 1) {
      if (mediaElement.__vibesSpeedControl) {
        mediaElement.__vibesSpeedControl.setSpeed(desiredSpeed);
      } else {
        mediaElement.playbackRate = desiredSpeed;
      }
    }
    const preservePitch = !state.enabled || !state.vinylPitchMode;
    mediaElement.preservesPitch = preservePitch;
    mediaElement.mozPreservesPitch = preservePitch;
    mediaElement.webkitPreservesPitch = preservePitch;
    mediaElement.__vibesLastCapturedSrc = mediaElement.currentSrc || mediaElement.src || "";
    setupSpeedReapplyListeners(mediaElement);
    updateCorsStatus();
    log("[Vibes Fast] ⚠️ Speed-only mode (pitch/reverb unavailable — audio CDN does not support CORS)");
    window.__vibesFastIntercepted = true;
  }
  function connectFullCapture(mediaElement, ctx) {
    try {
      log("[Vibes Fast] [DIAG] connectFullCapture: crossOrigin=" + (mediaElement.crossOrigin || "not set"), "src=" + (mediaElement.src?.substring(0, 80) || "NONE"));
      const source = ctx.createMediaElementSource(mediaElement);
      source.connect(ctx.destination);
      overridePlaybackRate(mediaElement);
      mediaElement.__vibesMode = "full";
      addTrackedMedia(mediaElement);
      updateMediaCount();
      const desiredCaptureSpeed = state.enabled ? state.speed : 1;
      if (NativePlaybackRateDescriptor && NativePlaybackRateDescriptor.get.call(mediaElement) !== desiredCaptureSpeed) {
        if (mediaElement.__vibesSpeedControl) {
          mediaElement.__vibesSpeedControl.setSpeed(desiredCaptureSpeed);
        } else {
          NativePlaybackRateDescriptor.set.call(mediaElement, desiredCaptureSpeed);
        }
      }
      const resumeContext = () => {
        if (ctx.state === "suspended") {
          ctx.resume();
        }
      };
      mediaElement.addEventListener("playing", resumeContext);
      mediaElement.addEventListener("play", resumeContext);
      mediaElement.__vibesMode = "full";
      const preservePitch = !state.enabled || !state.vinylPitchMode;
      mediaElement.preservesPitch = preservePitch;
      mediaElement.mozPreservesPitch = preservePitch;
      mediaElement.webkitPreservesPitch = preservePitch;
      mediaElement.__vibesLastCapturedSrc = mediaElement.currentSrc || mediaElement.src || "";
      setupSpeedReapplyListeners(mediaElement);
      updateCorsStatus();
      window.__vibesFastIntercepted = true;
      log("[Vibes Fast] ✅ Full capture connected (pitch + reverb + speed)");
      return true;
    } catch (err) {
      if (err.name === "InvalidStateError") {
        log("[Vibes Fast] Element already connected via site Web Audio — setting up speed control");
        overridePlaybackRate(mediaElement);
        mediaElement.__vibesMode = "speed-only";
        addTrackedMedia(mediaElement);
        updateMediaCount();
        const desiredFallbackSpeed = state.enabled ? state.speed : 1;
        if (desiredFallbackSpeed !== 1) {
          if (mediaElement.__vibesSpeedControl) {
            mediaElement.__vibesSpeedControl.setSpeed(desiredFallbackSpeed);
          } else if (NativePlaybackRateDescriptor) {
            NativePlaybackRateDescriptor.set.call(mediaElement, desiredFallbackSpeed);
          }
        }
        const preservePitch = !state.enabled || !state.vinylPitchMode;
        mediaElement.preservesPitch = preservePitch;
        mediaElement.mozPreservesPitch = preservePitch;
        mediaElement.webkitPreservesPitch = preservePitch;
        mediaElement.__vibesLastCapturedSrc = mediaElement.currentSrc || mediaElement.src || "";
        setupSpeedReapplyListeners(mediaElement);
        updateCorsStatus();
        window.__vibesFastIntercepted = true;
        log("[Vibes Fast] Speed-only capture (element pre-connected via site Web Audio)");
        return true;
      }
      log("[Vibes Fast] Full capture error:", err.name, err.message);
      return false;
    }
  }
  function captureMediaElement(mediaElement) {
    if (capturedMedia.has(mediaElement)) {
      log("[Vibes Fast] [DIAG] Already captured, skipping");
      return;
    }
    const src = mediaElement.src || "";
    const currentSrc = mediaElement.currentSrc || "";
    const hasSrcObj = !!mediaElement.srcObject;
    const hasSource = src || currentSrc || hasSrcObj;
    log("[Vibes Fast] [DIAG] captureMediaElement called:", "src=" + (src?.substring(0, 80) || "NONE"), "currentSrc=" + (currentSrc?.substring(0, 80) || "NONE"), "srcObject=" + hasSrcObj, "readyState=" + mediaElement.readyState, "paused=" + mediaElement.paused, "inDOM=" + !!mediaElement.parentNode);
    if (!hasSource) {
      log("[Vibes Fast] [DIAG] No source yet — installing event listeners to wait");
      const tryCapture = () => {
        if (!capturedMedia.has(mediaElement)) {
          log("[Vibes Fast] [DIAG] Deferred capture triggered, src now:", mediaElement.src?.substring(0, 80) || "STILL NONE");
          captureMediaElement(mediaElement);
        }
      };
      mediaElement.addEventListener("loadstart", tryCapture, {
        once: true
      });
      mediaElement.addEventListener("loadedmetadata", tryCapture, {
        once: true
      });
      mediaElement.addEventListener("canplay", tryCapture, {
        once: true
      });
      return;
    }
    log("[Vibes Fast] Capturing:", mediaElement.tagName, mediaElement.src?.substring(0, 60));
    capturedMedia.add(mediaElement);
    const captureGeneration = mediaElement.__vibesCaptureGeneration || 0;
    const captureSource = mediaElement.currentSrc || mediaElement.src || "";
    setTimeout(async () => {
      const crossOrigin = isCrossOrigin(mediaElement);
      const audioSrc = mediaElement.src || mediaElement.currentSrc;
      const isStaleCapture = () => {
        const currentSource = mediaElement.currentSrc || mediaElement.src || "";
        return (mediaElement.__vibesCaptureGeneration || 0) !== captureGeneration || currentSource !== captureSource;
      };
      const retryCurrentCapture = () => {
        capturedMedia.delete(mediaElement);
        setTimeout(() => captureMediaElement(mediaElement), 0);
      };
      log("[Vibes Fast] [DIAG] Capture analysis:", "isCrossOrigin=" + crossOrigin, "crossOriginAttr=" + (mediaElement.crossOrigin || "not set"), "src=" + (audioSrc?.substring(0, 80) || "NONE"));
      if (isStaleCapture()) {
        log("[Vibes Fast] Skipping stale capture after VK source change");
        retryCurrentCapture();
        return;
      }
      const ensureCaptureContext = () => {
        getLiveContexts();
        let c = state.contexts[0];
        if (!c || c.state === "closed") {
          c = new window.AudioContext;
          log("[Vibes Fast] Created AudioContext for capture");
        }
        return c;
      };
      if (isVkSite() && (crossOrigin || isVkCdnUrl(audioSrc))) {
        log("[Vibes Fast] [DIAG] VK cross-origin media — speed-only, skipping CORS probe so Tab Capture can take over");
        registerSpeedOnlyMode(mediaElement);
        return;
      }
      if (!crossOrigin) {
        log("[Vibes Fast] [DIAG] Same-origin — attempting direct full capture");
        if (connectFullCapture(mediaElement, ensureCaptureContext())) {
          return;
        }
        log("[Vibes Fast] [DIAG] Same-origin capture failed unexpectedly, using speed-only");
        registerSpeedOnlyMode(mediaElement);
        return;
      }
      log("[Vibes Fast] [DIAG] Cross-origin audio — probing CORS before capture...");
      let corsOk = false;
      try {
        corsOk = await supportsCors(audioSrc);
      } catch (err) {
        log("[Vibes Fast] [DIAG] CORS probe threw, treating as no-CORS:", err?.message);
        corsOk = false;
      }
      if (isStaleCapture()) {
        log("[Vibes Fast] Skipping stale CORS result after VK source change");
        retryCurrentCapture();
        return;
      }
      log("[Vibes Fast] [DIAG] CORS probe result:", corsOk ? "SUPPORTED" : "NOT SUPPORTED");
      if (corsOk) {
        log("[Vibes Fast] [DIAG] CORS supported — setting crossOrigin=anonymous and reloading");
        const savedTime = mediaElement.currentTime;
        const wasPlaying = !mediaElement.paused;
        mediaElement.crossOrigin = "anonymous";
        mediaElement.load();
        await new Promise(resolve => {
          mediaElement.addEventListener("canplay", resolve, {
            once: true
          });
          setTimeout(resolve, 3e3);
        });
        if (isStaleCapture()) {
          log("[Vibes Fast] Skipping stale reload after VK source change");
          retryCurrentCapture();
          return;
        }
        try {
          mediaElement.currentTime = savedTime;
        } catch (e) {}
        if (wasPlaying) {
          try {
            await mediaElement.play();
          } catch (e) {}
        }
        if (connectFullCapture(mediaElement, ensureCaptureContext())) {
          log("[Vibes Fast] [DIAG] ✅ Cross-origin CORS capture successful");
          return;
        }
        log("[Vibes Fast] [DIAG] CORS capture failed despite probe — reverting crossOrigin");
        mediaElement.removeAttribute("crossorigin");
        mediaElement.load();
        await new Promise(resolve => {
          mediaElement.addEventListener("canplay", resolve, {
            once: true
          });
          setTimeout(resolve, 3e3);
        });
        try {
          mediaElement.currentTime = savedTime;
        } catch (e) {}
        if (wasPlaying) {
          try {
            await mediaElement.play();
          } catch (e) {}
        }
      }
      log("[Vibes Fast] [DIAG] ⚠️ No CORS — using speed-only mode to preserve audio");
      registerSpeedOnlyMode(mediaElement);
    }, 0);
  }
  function scanForMediaElements(node) {
    if (node instanceof HTMLMediaElement) {
      captureMediaElement(node);
    }
    if (node.querySelectorAll) {
      node.querySelectorAll("audio, video").forEach(captureMediaElement);
    }
  }
  function setupMediaObserver() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLMediaElement) {
            captureMediaElement(node);
          } else if (node.querySelectorAll) {
            node.querySelectorAll("audio, video").forEach(captureMediaElement);
          }
        });
      });
    });
    observer.observe(document, {
      subtree: true,
      childList: true
    });
    log("[Vibes Fast] Media observer started");
  }
  function setupGlobalAutoResume() {
    const resumeAllContexts = () => {
      getLiveContexts().forEach(ctx => {
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
      });
    };
    document.addEventListener("play", e => {
      if (e.target instanceof HTMLMediaElement) {
        resumeAllContexts();
      }
    }, true);
    document.addEventListener("playing", e => {
      if (e.target instanceof HTMLMediaElement) {
        resumeAllContexts();
      }
    }, true);
    document.addEventListener("click", resumeAllContexts, {
      once: true
    });
    document.addEventListener("keydown", resumeAllContexts, {
      once: true
    });
    log("[Vibes Fast] Auto-resume listeners active");
  }
  setupGlobalAutoResume();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      scanForMediaElements(document);
      setupMediaObserver();
    });
  } else {
    scanForMediaElements(document);
    setupMediaObserver();
  }
  window.dispatchEvent(new CustomEvent("vibes_fastCaptureReady", {
    detail: {
      success: true,
      timestamp: Date.now()
    }
  }));
  log("[Vibes Fast] MAIN world initialization complete");
})();
