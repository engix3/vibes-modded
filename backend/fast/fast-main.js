(function() {
  "use strict";
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
      return hostname.includes("vkuseraudio") || hostname.includes("useraudio") || hostname.includes("vkcdn") || hostname.includes("vk-cdn");
    } catch {
      return /vkuseraudio|useraudio|vkcdn|vk-cdn/i.test(url);
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
  window.__vibesFastState = state;
  window.__vibesFastIntercepted = false;
  function getOrCreateMarker() {
    let marker = document.getElementById("vibes-fast-capture-active");
    if (!marker) {
      marker = document.createElement("div");
      marker.id = "vibes-fast-capture-active";
      marker.style.display = "none";
      marker.setAttribute("data-media-count", "0");
      (document.body || document.documentElement).appendChild(marker);
      log("[Vibes Fast] Created DOM marker (MAIN world)");
    }
    return marker;
  }
  function updateMediaCount() {
    const marker = getOrCreateMarker();
    const count = capturedMediaElements.length + state.contexts.length;
    marker.setAttribute("data-media-count", String(count));
    log("[Vibes Fast] Media count updated:", count);
  }
  function updateCorsStatus() {
    const marker = getOrCreateMarker();
    const speedOnlyCount = capturedMediaElements.filter(el => el.__vibesMode === "speed-only").length;
    const fullCount = capturedMediaElements.filter(el => el.__vibesMode === "full").length;
    marker.setAttribute("data-speed-only-count", String(speedOnlyCount));
    marker.setAttribute("data-full-count", String(fullCount));
    log("[Vibes Fast] CORS status updated: speedOnly=" + speedOnlyCount + " full=" + fullCount);
  }
  window.__vibesFastMediaCount = function() {
    return capturedMediaElements.length + state.contexts.length;
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
    if (hasPlayingMedia && !window.__vibesFastIntercepted && state.contexts.length === 0) {
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
    return `\n// Freeverb AudioWorklet Processor - Inlined for Fast Capture\n// Faithful port of Jezar's Freeverb C++ algorithm (public domain)\n// Configuration loaded from audio-config.js\nconst TUNING = {\n  numCombs: ${cfg.numCombs},\n  numAllpasses: ${cfg.numAllpasses},\n  fixedGain: ${cfg.fixedGain},\n  scaleWet: ${cfg.scaleWet},\n  scaleDry: ${cfg.scaleDry},\n  scaleDamp: ${cfg.scaleDamp},\n  scaleRoom: ${cfg.scaleRoom},\n  offsetRoom: ${cfg.offsetRoom},\n  initialRoom: ${cfg.initialRoom},\n  initialDamp: ${cfg.initialDamp},\n  initialWet: ${cfg.initialWet},\n  initialDry: ${cfg.initialDry},\n  initialWidth: ${cfg.initialWidth},\n  initialMode: ${cfg.initialMode},\n  freezeMode: ${cfg.freezeMode},\n  stereoSpread: ${cfg.stereoSpread},\n  combTuningsL: ${JSON.stringify(cfg.combTuningsL)},\n  allpassTuningsL: ${JSON.stringify(cfg.allpassTuningsL)}\n};\n\nclass CombFilter {\n  constructor(bufferSize) {\n    this.buffer = new Float32Array(bufferSize);\n    this.bufferSize = bufferSize;\n    this.bufferIndex = 0;\n    this.filterStore = 0;\n    this.feedback = 0;\n    this.damp1 = 0;\n    this.damp2 = 1;\n  }\n  setDamp(val) { this.damp1 = val; this.damp2 = 1 - val; }\n  setFeedback(val) { this.feedback = val; }\n  process(input) {\n    let output = this.buffer[this.bufferIndex];\n    if (Math.abs(output) < 1e-18) output = 0;\n    this.filterStore = (output * this.damp2) + (this.filterStore * this.damp1);\n    if (Math.abs(this.filterStore) < 1e-18) this.filterStore = 0;\n    this.buffer[this.bufferIndex] = input + (this.filterStore * this.feedback);\n    if (++this.bufferIndex >= this.bufferSize) this.bufferIndex = 0;\n    return output;\n  }\n  mute() { this.buffer.fill(0); this.filterStore = 0; }\n}\n\nclass AllpassFilter {\n  constructor(bufferSize) {\n    this.buffer = new Float32Array(bufferSize);\n    this.bufferSize = bufferSize;\n    this.bufferIndex = 0;\n    this.feedback = 0.5;\n  }\n  setFeedback(val) { this.feedback = val; }\n  process(input) {\n    let bufout = this.buffer[this.bufferIndex];\n    if (Math.abs(bufout) < 1e-18) bufout = 0;\n    const output = -input + bufout;\n    this.buffer[this.bufferIndex] = input + (bufout * this.feedback);\n    if (++this.bufferIndex >= this.bufferSize) this.bufferIndex = 0;\n    return output;\n  }\n  mute() { this.buffer.fill(0); }\n}\n\nclass FreeverbProcessor extends AudioWorkletProcessor {\n  constructor() {\n    super();\n    const sampleRatio = sampleRate / 44100;\n    this.combsL = TUNING.combTuningsL.map(size => new CombFilter(Math.round(size * sampleRatio)));\n    this.combsR = TUNING.combTuningsL.map(size => new CombFilter(Math.round((size + TUNING.stereoSpread) * sampleRatio)));\n    this.allpassesL = TUNING.allpassTuningsL.map(size => new AllpassFilter(Math.round(size * sampleRatio)));\n    this.allpassesR = TUNING.allpassTuningsL.map(size => new AllpassFilter(Math.round((size + TUNING.stereoSpread) * sampleRatio)));\n    [...this.allpassesL, ...this.allpassesR].forEach(ap => ap.setFeedback(0.5));\n    this.gain = TUNING.fixedGain;\n    this.roomSize = 0; this.roomSize1 = 0; this.damp = 0; this.damp1 = 0;\n    this.wet = 0; this.wet1 = 0; this.wet2 = 0; this.dry = 0; this.width = 1; this.mode = 0;\n    this.setRoomSize(TUNING.initialRoom); this.setDamp(TUNING.initialDamp);\n    this.setWet(TUNING.initialWet); this.setDry(TUNING.initialDry);\n    this.setWidth(TUNING.initialWidth); this.setMode(TUNING.initialMode);\n    this.mute();\n    this.port.onmessage = (e) => this.handleMessage(e.data);\n  }\n  handleMessage(data) {\n    switch (data.type) {\n      case 'setRoomSize': this.setRoomSize(data.value); break;\n      case 'setDamp': this.setDamp(data.value); break;\n      case 'setWet': this.setWet(data.value); break;\n      case 'setDry': this.setDry(data.value); break;\n      case 'setWidth': this.setWidth(data.value); break;\n      case 'setMode': this.setMode(data.value); break;\n      case 'mute': this.mute(); break;\n    }\n  }\n  update() {\n    this.wet1 = this.wet * (this.width / 2 + 0.5);\n    this.wet2 = this.wet * ((1 - this.width) / 2);\n    if (this.mode >= TUNING.freezeMode) {\n      this.roomSize1 = 1; this.damp1 = 0; this.gain = 0;\n    } else {\n      this.roomSize1 = this.roomSize; this.damp1 = this.damp; this.gain = TUNING.fixedGain;\n    }\n    for (let i = 0; i < TUNING.numCombs; i++) {\n      this.combsL[i].setFeedback(this.roomSize1); this.combsR[i].setFeedback(this.roomSize1);\n      this.combsL[i].setDamp(this.damp1); this.combsR[i].setDamp(this.damp1);\n    }\n  }\n  setRoomSize(value) { this.roomSize = (value * TUNING.scaleRoom) + TUNING.offsetRoom; this.update(); }\n  setDamp(value) { this.damp = value * TUNING.scaleDamp; this.update(); }\n  setWet(value) { this.wet = value * TUNING.scaleWet; this.update(); }\n  setDry(value) { this.dry = value * TUNING.scaleDry; }\n  setWidth(value) { this.width = value; this.update(); }\n  setMode(value) { this.mode = value; this.update(); }\n  mute() {\n    if (this.mode >= TUNING.freezeMode) return;\n    for (let i = 0; i < TUNING.numCombs; i++) { this.combsL[i].mute(); this.combsR[i].mute(); }\n    for (let i = 0; i < TUNING.numAllpasses; i++) { this.allpassesL[i].mute(); this.allpassesR[i].mute(); }\n  }\n  process(inputs, outputs) {\n    const input = inputs[0], output = outputs[0];\n    if (!input || !input[0]) return true;\n    const inputL = input[0], inputR = input[1] || input[0];\n    const outputL = output[0], outputR = output[1] || output[0];\n    const numSamples = inputL.length;\n    const { combsL, combsR, allpassesL, allpassesR, gain, wet1, wet2, dry } = this;\n    for (let n = 0; n < numSamples; n++) {\n      const inp = (inputL[n] + inputR[n]) * gain;\n      let outL = 0, outR = 0;\n      for (let i = 0; i < TUNING.numCombs; i++) { outL += combsL[i].process(inp); outR += combsR[i].process(inp); }\n      for (let i = 0; i < TUNING.numAllpasses; i++) { outL = allpassesL[i].process(outL); outR = allpassesR[i].process(outR); }\n      outputL[n] = outL * wet1 + outR * wet2 + inputL[n] * dry;\n      outputR[n] = outR * wet1 + outL * wet2 + inputR[n] * dry;\n    }\n    return true;\n  }\n}\nregisterProcessor('freeverb-processor', FreeverbProcessor);\n`;
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
        await audioContext.audioWorklet.addModule(blobUrl);
        URL.revokeObjectURL(blobUrl);
        log("[Vibes Fast] Freeverb loaded from Blob URL");
      } catch (blobErr) {
        log("[Vibes Fast] Blob URL failed (" + blobErr.message + "), trying extension URL fallback");
        const extUrl = await getFreeverbProcessorUrl();
        if (extUrl) {
          log("[Vibes Fast] Loading Freeverb AudioWorklet from extension URL");
          await audioContext.audioWorklet.addModule(extUrl);
          log("[Vibes Fast] Freeverb loaded from extension URL");
        } else {
          throw new Error("No extension URL available and blob failed");
        }
      }
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
      this._initProcessors();
      updateMediaCount();
    }
    _setupProcessingChain() {
      this._fakeDestination = this.createGain();
      this._fakeDestination.gain.value = 1;
      this._bypassGain = this.createGain();
      this._bypassGain.gain.value = 0;
      this._wetGain = this.createGain();
      this._wetGain.gain.value = 1;
      this._volumeGain = this.createGain();
      this._volumeGain.gain.value = state.volume;
      this._fakeDestination.connect(this._bypassGain);
      this._bypassGain.connect(this._volumeGain);
      this._fakeDestination.connect(this._wetGain);
      this._wetGain.connect(this._volumeGain);
      this._volumeGain.connect(this._realDestination);
      log("[Vibes Fast] Processing chain created");
    }
    async _initProcessors() {
      try {
        await loadJungle();
        if (!window.__vibesJungleFast) {
          warn("[Vibes Fast] Jungle class not available");
          return;
        }
        this._splitter = this.createChannelSplitter(2);
        this._merger = this.createChannelMerger(2);
        this._jungleL = new window.__vibesJungleFast(this);
        this._jungleR = new window.__vibesJungleFast(this);
        state.jungleInstances.push(this._jungleL, this._jungleR);
        this._fakeDestination.disconnect(this._wetGain);
        this._fakeDestination.connect(this._splitter);
        this._splitter.connect(this._jungleL.input, 0);
        this._jungleL.output.connect(this._merger, 0, 0);
        this._splitter.connect(this._jungleR.input, 1);
        this._jungleR.output.connect(this._merger, 0, 1);
        const freeverbNodes = await loadFreeverbForContext(this);
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
          this._merger.connect(this._wetGain);
          log("[Vibes Fast] Stereo audio chain initialized (no Freeverb)");
        }
        this._jungleL.setSemitones(state.pitch);
        this._jungleR.setSemitones(state.pitch);
        this._applySettings();
      } catch (err) {
        console.error("[Vibes Fast] Failed to initialize processors:", err);
      }
    }
    get destination() {
      return this._fakeDestination;
    }
    setPitch(semitones) {
      if (this._jungleL) {
        this._jungleL.setSemitones(semitones);
      }
      if (this._jungleR) {
        this._jungleR.setSemitones(semitones);
      }
      this._updateOutputGain();
    }
    setEnabled(enabled) {
      const now = this.currentTime;
      if (enabled) {
        this._bypassGain.gain.setTargetAtTime(0, now, .02);
        this._volumeGain.gain.setTargetAtTime(state.volume, now, .02);
        this._updateOutputGain();
      } else {
        this._bypassGain.gain.setTargetAtTime(1, now, .02);
        this._wetGain.gain.setTargetAtTime(0, now, .02);
        this._volumeGain.gain.setTargetAtTime(1, now, .02);
      }
    }
    _updateOutputGain() {
      if (!state.enabled) return;
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
      const now = this.currentTime;
      this._volumeGain.gain.setTargetAtTime(volume, now, .02);
    }
    setReverb(enabled, amount) {
      this._reverbEnabled = enabled;
      this._updateOutputGain();
      if (this._reverbWetGain && this._reverbDryGain) {
        const now = this.currentTime;
        if (enabled) {
          const t = (amount || 50) / 100;
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
            const t = (amount || 50) / 100;
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
    if (settings.speed !== undefined) state.speed = settings.speed;
    if (settings.enabled !== undefined) state.enabled = settings.enabled;
    if (settings.vinylPitchMode !== undefined) state.vinylPitchMode = settings.vinylPitchMode;
    if (settings.reverbEnabled !== undefined) state.reverbEnabled = settings.reverbEnabled;
    if (settings.reverbAmount !== undefined) state.reverbAmount = settings.reverbAmount;
    if (settings.volume !== undefined) state.volume = settings.volume;
    state.contexts.forEach(ctx => {
      if (settings.pitch !== undefined) ctx.setPitch(state.pitch);
      if (settings.enabled !== undefined) ctx.setEnabled(state.enabled);
      if (settings.volume !== undefined) ctx.setVolume(state.volume);
      if (settings.reverbEnabled !== undefined || settings.reverbAmount !== undefined) {
        ctx.setReverb(state.reverbEnabled, state.reverbAmount);
      }
    });
    if (settings.speed !== undefined || settings.vinylPitchMode !== undefined) {
      capturedMediaElements.forEach(el => {
        try {
          const preservePitch = !state.enabled || !state.vinylPitchMode;
          el.preservesPitch = preservePitch;
          el.mozPreservesPitch = preservePitch;
          el.webkitPreservesPitch = preservePitch;
          if (el.__vibesSpeedControl) {
            const desiredSpeed = state.enabled ? state.speed : 1;
            el.__vibesSpeedControl.setSpeed(desiredSpeed);
            if (desiredSpeed !== 1 && state.enabled) {
              el.__vibesSpeedControl.lock();
            } else {
              el.__vibesSpeedControl.unlock();
            }
          } else {
            el.playbackRate = state.enabled ? state.speed : 1;
          }
        } catch (err) {
          console.error("[Vibes Fast] Failed to set playbackRate:", err);
        }
      });
    }
  });
  const capturedMedia = new WeakSet;
  const capturedMediaElements = [];
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
    const src = mediaElement.src || mediaElement.currentSrc || "";
    if (!src || src.startsWith("blob:") || src.startsWith("data:")) return false;
    try {
      return new URL(src).origin !== window.location.origin;
    } catch {
      return false;
    }
  }
  async function supportsCors(url) {
    try {
      const controller = new AbortController;
      const timeout = setTimeout(() => controller.abort(), 2e3);
      const resp = await fetch(url, {
        method: "HEAD",
        mode: "cors",
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (resp.ok || resp.type === "cors") return true;
    } catch {
    }
    try {
      const controller = new AbortController;
      const timeout = setTimeout(() => controller.abort(), 2e3);
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          Range: "bytes=0-0"
        },
        mode: "cors",
        signal: controller.signal
      });
      clearTimeout(timeout);
      return resp.ok || resp.status === 206 || resp.type === "cors";
    } catch {
      return false;
    }
  }
  function setupSpeedReapplyListeners(mediaElement) {
    if (mediaElement.__vibesSpeedListeners) return;
    mediaElement.__vibesSpeedListeners = true;
    const reapplySpeed = () => {
      try {
        const preservePitch = !state.enabled || !state.vinylPitchMode;
        mediaElement.preservesPitch = preservePitch;
        mediaElement.mozPreservesPitch = preservePitch;
        mediaElement.webkitPreservesPitch = preservePitch;
      } catch (err) {}
      const desiredSpeed = state.enabled ? state.speed : 1;
      if (desiredSpeed !== 1 || mediaElement.playbackRate !== 1) {
        try {
          if (mediaElement.__vibesSpeedControl) {
            mediaElement.__vibesSpeedControl.setSpeed(desiredSpeed);
          } else if (NativePlaybackRateDescriptor) {
            NativePlaybackRateDescriptor.set.call(mediaElement, desiredSpeed);
          }
          log("[Vibes Fast] Speed re-applied after track change:", desiredSpeed);
        } catch (err) {}
      }
    };
    const reapplyAfterTrackChange = () => {
      if (!isVkSite()) return;
      const source = mediaElement.currentSrc || mediaElement.src || "";
      if (source && mediaElement.__vibesLastCapturedSrc !== source) {
        log("[Vibes Fast] VK source changed — keeping existing audio graph");
        mediaElement.__vibesLastCapturedSrc = source;
      }
      reapplySpeed();
    };
    [ "loadstart", "loadedmetadata", "durationchange", "canplay", "play", "playing" ].forEach(eventName => {
      mediaElement.addEventListener(eventName, reapplyAfterTrackChange);
    });
    mediaElement.addEventListener("ended", () => {
      [ 0, 50, 250, 1e3 ].forEach(delay => {
        setTimeout(reapplyAfterTrackChange, delay);
      });
    });
  }
  function registerSpeedOnlyMode(mediaElement) {
    capturedMediaElements.push(mediaElement);
    overridePlaybackRate(mediaElement);
    updateMediaCount();
    const desiredSpeed = state.enabled ? state.speed : 1;
    if (desiredSpeed !== 1) {
      if (mediaElement.__vibesSpeedControl) {
        mediaElement.__vibesSpeedControl.setSpeed(desiredSpeed);
      } else {
        mediaElement.playbackRate = desiredSpeed;
      }
    }
    mediaElement.__vibesMode = "speed-only";
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
      capturedMediaElements.push(mediaElement);
      overridePlaybackRate(mediaElement);
      updateMediaCount();
      if (state.enabled && state.speed !== 1) {
        mediaElement.playbackRate = state.speed;
      } else if (!state.enabled) {
        mediaElement.playbackRate = 1;
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
        capturedMediaElements.push(mediaElement);
        overridePlaybackRate(mediaElement);
        updateMediaCount();
        if (state.speed !== 1) {
          if (mediaElement.__vibesSpeedControl) {
            mediaElement.__vibesSpeedControl.setSpeed(state.speed);
          } else if (NativePlaybackRateDescriptor) {
            NativePlaybackRateDescriptor.set.call(mediaElement, state.speed);
          }
        }
        mediaElement.__vibesMode = "speed-only";
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
    setTimeout(async () => {
      let ctx = state.contexts[0];
      if (!ctx) {
        ctx = new window.AudioContext;
        log("[Vibes Fast] Created AudioContext for capture");
      }
      const crossOrigin = isCrossOrigin(mediaElement);
      const audioSrc = mediaElement.src || mediaElement.currentSrc;
      log("[Vibes Fast] [DIAG] Capture analysis:", "isCrossOrigin=" + crossOrigin, "crossOriginAttr=" + (mediaElement.crossOrigin || "not set"), "src=" + (audioSrc?.substring(0, 80) || "NONE"));
      if (isVkSite() && isVkCdnUrl(audioSrc)) {
        log("[Vibes Fast] [DIAG] VK CDN media detected — using speed-only marker so popup can switch to Tab Capture");
        registerSpeedOnlyMode(mediaElement);
        return;
      }
      if (!crossOrigin) {
        log("[Vibes Fast] [DIAG] Same-origin — attempting direct full capture");
        if (connectFullCapture(mediaElement, ctx)) {
          return;
        }
        log("[Vibes Fast] [DIAG] Same-origin capture failed unexpectedly, using speed-only");
        registerSpeedOnlyMode(mediaElement);
        return;
      }
      log("[Vibes Fast] [DIAG] Cross-origin audio — probing CORS before capture...");
      const corsOk = await supportsCors(audioSrc);
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
        try {
          mediaElement.currentTime = savedTime;
        } catch (e) {}
        if (wasPlaying) {
          try {
            await mediaElement.play();
          } catch (e) {}
        }
        if (connectFullCapture(mediaElement, ctx)) {
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
      state.contexts.forEach(ctx => {
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
