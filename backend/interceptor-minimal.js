(function() {
  "use strict";
  if (window.__vibesFastCaptureInjected) return;
  const DEBUG = false;
  const log = DEBUG ? console.log.bind(console) : () => {};
  const startTime = performance.now();
  if (window.__vibesInterceptorLoaded) return;
  window.__vibesInterceptorLoaded = true;
  const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
  if (!OriginalAudioContext) return;
  const contexts = [];
  const settings = {
    enabled: false,
    pitch: 0,
    speed: 1
  };
  const MAKEUP_GAIN = 1.2625;
  const MAKEUP_GAIN_PLUS_REVERB = 1.33;
  let JungleClass = null;
  class VibesAudioContext extends OriginalAudioContext {
    constructor(options) {
      super(options);
      this._vibesRealDest = super.destination;
      this._vibesGain = this.createGain();
      this._vibesMakeupGain = this.createGain();
      this._vibesMakeupGain.gain.value = MAKEUP_GAIN;
      this._vibesGain.connect(this._vibesRealDest);
      this._vibesConnected = true;
      this._vibesJungle = null;
      this._vibesReverb = null;
      this._vibesProcessorSetup = false;
      contexts.push(this);
      log("Vibes: Extended AudioContext created at", performance.now().toFixed(2), "ms");
      if (JungleClass && !this._vibesProcessorSetup) {
        this._vibesSetupProcessor(JungleClass);
        log("Vibes: Jungle set up for new context");
      }
    }
    get destination() {
      return this._vibesGain;
    }
    _vibesSetupProcessor(JungleClassParam) {
      if (this._vibesProcessorSetup) return;
      this._vibesJungle = new JungleClassParam(this);
      this._vibesProcessorSetup = true;
      log("Vibes: Processor created for context");
    }
    _vibesApply() {
      const shouldProcess = settings.enabled && settings.pitch !== 0 && this._vibesJungle;
      if (shouldProcess) {
        if (this._vibesConnected) {
          try {
            this._vibesGain.disconnect(this._vibesRealDest);
          } catch (e) {}
          this._vibesConnected = false;
          this._vibesGain.connect(this._vibesJungle.input);
          this._vibesJungle.output.connect(this._vibesMakeupGain);
          this._vibesMakeupGain.connect(this._vibesRealDest);
        }
        this._vibesJungle.setSemitones(settings.pitch);
      } else {
        if (!this._vibesConnected) {
          if (this._vibesProcessorSetup) {
            try {
              this._vibesGain.disconnect(this._vibesJungle.input);
              this._vibesJungle.output.disconnect(this._vibesMakeupGain);
              this._vibesMakeupGain.disconnect(this._vibesRealDest);
            } catch (e) {}
          }
          this._vibesGain.connect(this._vibesRealDest);
          this._vibesConnected = true;
        }
      }
    }
  }
  window.AudioContext = VibesAudioContext;
  if (window.webkitAudioContext) {
    window.webkitAudioContext = VibesAudioContext;
  }
  log("Vibes: AudioContext intercepted at", performance.now().toFixed(2), "ms");
  function injectJungle(JungleClassParam) {
    JungleClass = JungleClassParam;
    log("Vibes: Jungle injected, setting up", contexts.length, "existing contexts");
    contexts.forEach(ctx => {
      if (ctx.state !== "closed" && !ctx._vibesProcessorSetup) {
        ctx._vibesSetupProcessor(JungleClass);
      }
    });
  }
  function updateSettings(newSettings) {
    Object.assign(settings, newSettings);
    contexts.forEach(ctx => {
      if (ctx.state !== "closed") {
        ctx._vibesApply();
      }
    });
    document.querySelectorAll("video, audio").forEach(el => {
      el.playbackRate = settings.enabled ? settings.speed : 1;
      el.preservesPitch = true;
    });
  }
  window.addEventListener("vibes-jungle-ready", () => {
    if (window.__vibesJungle) {
      injectJungle(window.__vibesJungle);
    }
  });
  window.addEventListener("vibes-update-settings", e => {
    if (e.detail) {
      updateSettings(e.detail);
    }
  });
  window.__vibesInterceptor = {
    contexts: contexts,
    settings: settings
  };
  function createMarker() {
    if (document.getElementById("vibes-interceptor-active")) return;
    const marker = document.createElement("div");
    marker.id = "vibes-interceptor-active";
    marker.style.display = "none";
    (document.body || document.documentElement).appendChild(marker);
  }
  if (document.body || document.documentElement) createMarker();
  document.addEventListener("DOMContentLoaded", createMarker);
  log("Vibes: Interceptor ready at", performance.now().toFixed(2), "ms (boot time:", (performance.now() - startTime).toFixed(2), "ms)");
})();
