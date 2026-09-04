(function() {
  if (window.__freePitchLoaded) {
    window.__freePitchUpdate && window.__freePitchUpdate();
    return;
  }
  window.__freePitchLoaded = true;
  let interceptorActive = false;
  let fastCaptureActive = false;
  function checkInterceptorActive() {
    const fastMarker = document.getElementById("vibes-fast-capture-active");
    if (fastMarker) {
      return true;
    }
    const oldMarker = document.getElementById("vibes-interceptor-active");
    return oldMarker !== null;
  }
  function checkFastCaptureActive() {
    const marker = document.getElementById("vibes-fast-capture-active");
    return marker !== null;
  }
  function getFastCaptureMediaCount() {
    const marker = document.getElementById("vibes-fast-capture-active");
    if (!marker) return 0;
    return parseInt(marker.getAttribute("data-media-count") || "0", 10);
  }
  window.addEventListener("vibes-interceptor-ready", () => {
    interceptorActive = true;
    console.log("Vibes: Interceptor detected via event");
  });
  window.addEventListener("vibes_fastCaptureReady", () => {
    fastCaptureActive = true;
    interceptorActive = true;
    console.log("Vibes: Fast Capture detected via event");
  });
  function detectInterceptor() {
    if (checkFastCaptureActive()) {
      fastCaptureActive = true;
      interceptorActive = true;
      console.log("Vibes: Fast Capture detected - streaming site audio capture active");
      return;
    }
    if (checkInterceptorActive()) {
      interceptorActive = true;
      console.log("Vibes: Interceptor detected - AudioContext extension mode active");
      injectJungle();
    }
  }
  function injectJungle() {
    if (document.getElementById("vibes-jungle-script")) return;
    const script = document.createElement("script");
    script.id = "vibes-jungle-script";
    script.src = chrome.runtime.getURL("backend/audio/jungle.js");
    script.onload = () => {
      console.log("Vibes: Jungle script injected");
    };
    (document.head || document.documentElement).appendChild(script);
  }
  detectInterceptor();
  if (document.readyState !== "complete") {
    document.addEventListener("DOMContentLoaded", detectInterceptor);
    window.addEventListener("load", detectInterceptor);
  }
  const delayTime = .1;
  const fadeTime = .05;
  const bufferTime = .1;
  function createFadeBuffer(context, activeTime, fadeTime) {
    const length1 = activeTime * context.sampleRate;
    const length2 = (activeTime - 2 * fadeTime) * context.sampleRate;
    const length = length1 + length2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const p = buffer.getChannelData(0);
    const fadeLength = fadeTime * context.sampleRate;
    const fadeIndex1 = fadeLength;
    const fadeIndex2 = length1 - fadeLength;
    for (let i = 0; i < length1; ++i) {
      let value;
      if (i < fadeIndex1) {
        value = Math.sqrt(i / fadeLength);
      } else if (i >= fadeIndex2) {
        value = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
      } else {
        value = 1;
      }
      p[i] = value;
    }
    for (let i = length1; i < length; ++i) {
      p[i] = 0;
    }
    return buffer;
  }
  function createDelayTimeBuffer(context, activeTime, fadeTime, shiftUp) {
    const length1 = activeTime * context.sampleRate;
    const length2 = (activeTime - 2 * fadeTime) * context.sampleRate;
    const length = length1 + length2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const p = buffer.getChannelData(0);
    for (let i = 0; i < length1; ++i) {
      p[i] = shiftUp ? (length1 - i) / length : i / length1;
    }
    for (let i = length1; i < length; ++i) {
      p[i] = 0;
    }
    return buffer;
  }
  class Jungle {
    constructor(context) {
      this.context = context;
      this.input = context.createGain();
      this.output = context.createGain();
      const mod1 = context.createBufferSource();
      const mod2 = context.createBufferSource();
      const mod3 = context.createBufferSource();
      const mod4 = context.createBufferSource();
      const shiftDownBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, false);
      const shiftUpBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, true);
      mod1.buffer = shiftDownBuffer;
      mod2.buffer = shiftDownBuffer;
      mod3.buffer = shiftUpBuffer;
      mod4.buffer = shiftUpBuffer;
      mod1.loop = mod2.loop = mod3.loop = mod4.loop = true;
      this.mod1Gain = context.createGain();
      this.mod2Gain = context.createGain();
      this.mod3Gain = context.createGain();
      this.mod4Gain = context.createGain();
      this.mod3Gain.gain.value = 0;
      this.mod4Gain.gain.value = 0;
      mod1.connect(this.mod1Gain);
      mod2.connect(this.mod2Gain);
      mod3.connect(this.mod3Gain);
      mod4.connect(this.mod4Gain);
      const fade1 = context.createBufferSource();
      const fade2 = context.createBufferSource();
      const fadeBuffer = createFadeBuffer(context, bufferTime, fadeTime);
      fade1.buffer = fadeBuffer;
      fade2.buffer = fadeBuffer;
      fade1.loop = fade2.loop = true;
      const mix1 = context.createGain();
      const mix2 = context.createGain();
      mix1.gain.value = 0;
      mix2.gain.value = 0;
      fade1.connect(mix1.gain);
      fade2.connect(mix2.gain);
      const delay1 = context.createDelay();
      const delay2 = context.createDelay();
      this.mod1Gain.connect(delay1.delayTime);
      this.mod2Gain.connect(delay2.delayTime);
      this.mod3Gain.connect(delay1.delayTime);
      this.mod4Gain.connect(delay2.delayTime);
      this.input.connect(delay1);
      this.input.connect(delay2);
      delay1.connect(mix1);
      delay2.connect(mix2);
      mix1.connect(this.output);
      mix2.connect(this.output);
      const t = context.currentTime + .05;
      const t2 = t + bufferTime - fadeTime;
      mod1.start(t);
      mod2.start(t2);
      mod3.start(t);
      mod4.start(t2);
      fade1.start(t);
      fade2.start(t2);
      this.setDelay(delayTime);
    }
    setDelay(d) {
      this.mod1Gain.gain.setTargetAtTime(.5 * d, 0, .01);
      this.mod2Gain.gain.setTargetAtTime(.5 * d, 0, .01);
      this.mod3Gain.gain.setTargetAtTime(.5 * d, 0, .01);
      this.mod4Gain.gain.setTargetAtTime(.5 * d, 0, .01);
    }
    setPitchOffset(mult) {
      if (mult > 0) {
        this.mod1Gain.gain.setTargetAtTime(0, 0, .01);
        this.mod2Gain.gain.setTargetAtTime(0, 0, .01);
        this.mod3Gain.gain.setTargetAtTime(.5 * delayTime * mult, 0, .01);
        this.mod4Gain.gain.setTargetAtTime(.5 * delayTime * mult, 0, .01);
      } else {
        this.mod1Gain.gain.setTargetAtTime(.5 * delayTime * Math.abs(mult), 0, .01);
        this.mod2Gain.gain.setTargetAtTime(.5 * delayTime * Math.abs(mult), 0, .01);
        this.mod3Gain.gain.setTargetAtTime(0, 0, .01);
        this.mod4Gain.gain.setTargetAtTime(0, 0, .01);
      }
    }
    setSemitones(semitones) {
      const clampedSemitones = Math.max(-12, Math.min(12, semitones));
      const offset = clampedSemitones / 12;
      this.setPitchOffset(offset);
    }
  }
  const processedElements = new WeakMap;
  let audioContext = null;
  let settings = {
    enabled: false,
    volume: 1,
    pitch: 0,
    speed: 1,
    vinylPitchMode: false,
    reverbEnabled: false,
    reverbAmount: 50
  };
  function getAudioContext() {
    if (!audioContext || audioContext.state === "closed") {
      audioContext = new (window.AudioContext || window.webkitAudioContext);
    }
    return audioContext;
  }
  function processMediaElement(element) {
    if (processedElements.has(element)) {
      return processedElements.get(element);
    }
    if (interceptorActive) {
      console.log("Vibes: Interceptor mode - AudioContext extension handling all audio");
      const controller = {
        element: element,
        interceptorControlled: true
      };
      processedElements.set(element, controller);
      applySettingsToElement(controller);
      return controller;
    }
    const wasCaptured = element.hasAttribute("data-vibes-captured");
    if (wasCaptured) {
      console.log("Vibes: Element captured by legacy interceptor");
      const controller = {
        element: element,
        interceptorControlled: true
      };
      processedElements.set(element, controller);
      return controller;
    }
    try {
      const ctx = getAudioContext();
      const source = ctx.createMediaElementSource(element);
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      const jungleL = new Jungle(ctx);
      const jungleR = new Jungle(ctx);
      const reverb = new Freeverb(ctx);
      const bypassGain = ctx.createGain();
      bypassGain.gain.value = 1;
      const processedGain = ctx.createGain();
      processedGain.gain.value = 0;
      const volumeGain = ctx.createGain();
      volumeGain.gain.value = settings.volume;
      source.connect(splitter);
      source.connect(bypassGain);
      bypassGain.connect(volumeGain);
      splitter.connect(jungleL.input, 0);
      jungleL.output.connect(merger, 0, 0);
      splitter.connect(jungleR.input, 1);
      jungleR.output.connect(merger, 0, 1);
      merger.connect(reverb.input);
      reverb.output.connect(processedGain);
      processedGain.connect(volumeGain);
      volumeGain.connect(ctx.destination);
      const controller = {
        element: element,
        source: source,
        jungleL: jungleL,
        jungleR: jungleR,
        reverb: reverb,
        bypassGain: bypassGain,
        processedGain: processedGain,
        volumeGain: volumeGain,
        ctx: ctx
      };
      processedElements.set(element, controller);
      applySettingsToElement(controller);
      setupMediaEventListeners(element, controller);
      console.log("Vibes: Processed media element", element.tagName);
      return controller;
    } catch (e) {
      const errorMsg = e.message.toLowerCase();
      let limitation = "unknown";
      if (errorMsg.includes("cors") || errorMsg.includes("cross-origin")) {
        limitation = "cors";
      } else if (errorMsg.includes("already connected") || errorMsg.includes("already been")) {
        limitation = interceptorActive ? "intercepted" : "captured";
      }
      console.warn(`Vibes: Speed-only mode (${limitation}) -`, e.message);
      const controller = {
        element: element,
        speedOnly: true,
        limitation: limitation
      };
      processedElements.set(element, controller);
      applySettingsToElement(controller);
      setupMediaEventListeners(element, controller);
      return controller;
    }
  }
  function setupMediaEventListeners(element, controller) {
    if (element._vibesListenersAttached) return;
    element._vibesListenersAttached = true;
    const reapplySettings = () => {
      if (settings.enabled && processedElements.has(element)) {
        applySettingsToElement(controller);
      }
    };
    element.addEventListener("loadedmetadata", reapplySettings);
    element.addEventListener("play", reapplySettings);
    element.addEventListener("ratechange", () => {
      if (settings.enabled && processedElements.has(element)) {
        const expectedRate = settings.speed;
        if (Math.abs(element.playbackRate - expectedRate) > .01) {
          element.playbackRate = expectedRate;
        }
      }
    });
  }
  function getLimitations() {
    if (interceptorActive) {
      return [];
    }
    const limitations = [];
    document.querySelectorAll("video, audio").forEach(el => {
      if (processedElements.has(el)) {
        const controller = processedElements.get(el);
        if (controller.interceptorControlled) {
          return;
        }
        if (controller.speedOnly && controller.limitation) {
          limitations.push(controller.limitation);
        }
      }
    });
    return [ ...new Set(limitations) ];
  }
  function hasInterceptorControl() {
    return interceptorActive;
  }
  function applySettingsToElement(controller) {
    if (controller.interceptorControlled) {
      const {element: element} = controller;
      if (element) {
        if (settings.enabled) {
          element.playbackRate = settings.speed;
        } else {
          element.playbackRate = 1;
        }
        element.preservesPitch = true;
      }
      return;
    }
    const {element: element, jungleL: jungleL, jungleR: jungleR, reverb: reverb, bypassGain: bypassGain, processedGain: processedGain, volumeGain: volumeGain, speedOnly: speedOnly, ctx: ctx} = controller;
    if (!settings.enabled) {
      element.playbackRate = 1;
      element.preservesPitch = true;
      element.mozPreservesPitch = true;
      element.webkitPreservesPitch = true;
      if (ctx && bypassGain && processedGain) {
        const now = ctx.currentTime;
        bypassGain.gain.setTargetAtTime(1, now, .02);
        processedGain.gain.setTargetAtTime(0, now, .02);
      }
      if (ctx && volumeGain) {
        volumeGain.gain.setTargetAtTime(1, ctx.currentTime, .02);
      }
      if (reverb) {
        reverb.setEnabled(false);
      }
      return;
    }
    element.playbackRate = settings.speed;
    const preservePitch = !settings.vinylPitchMode;
    element.preservesPitch = preservePitch;
    element.mozPreservesPitch = preservePitch;
    element.webkitPreservesPitch = preservePitch;
    if (speedOnly) return;
    const shouldProcess = settings.pitch !== 0 || settings.reverbEnabled;
    if (ctx && bypassGain && processedGain) {
      const now = ctx.currentTime;
      if (shouldProcess) {
        const hasPitch = settings.pitch !== 0;
        const gain = hasPitch && settings.reverbEnabled ? MAKEUP_GAIN_PLUS_REVERB : hasPitch ? MAKEUP_GAIN : 1;
        bypassGain.gain.setTargetAtTime(0, now, .02);
        processedGain.gain.setTargetAtTime(gain, now, .02);
      } else {
        bypassGain.gain.setTargetAtTime(1, now, .02);
        processedGain.gain.setTargetAtTime(0, now, .02);
      }
    }
    if (jungleL && jungleR) {
      jungleL.setSemitones(settings.pitch);
      jungleR.setSemitones(settings.pitch);
    }
    if (reverb) {
      reverb.setEnabled(settings.reverbEnabled);
      reverb.setAmount(settings.reverbAmount);
    }
    if (ctx && volumeGain) {
      volumeGain.gain.setTargetAtTime(settings.volume, ctx.currentTime, .02);
    }
  }
  function findAndProcessMedia() {
    const elements = [ ...document.querySelectorAll("video"), ...document.querySelectorAll("audio") ];
    document.querySelectorAll("*").forEach(el => {
      if (el.shadowRoot) {
        elements.push(...el.shadowRoot.querySelectorAll("video"), ...el.shadowRoot.querySelectorAll("audio"));
      }
    });
    elements.forEach(el => {
      if (!processedElements.has(el)) {
        processMediaElement(el);
      } else {
        applySettingsToElement(processedElements.get(el));
      }
    });
    return elements.length;
  }
  function applyAllSettings() {
    document.querySelectorAll("video, audio").forEach(el => {
      if (processedElements.has(el)) {
        applySettingsToElement(processedElements.get(el));
      }
    });
    sendSettingsToInterceptor();
    try {
      chrome.runtime.sendMessage({
        type: "UPDATE_BADGE",
        pitch: settings.pitch,
        enabled: settings.enabled
      });
    } catch (e) {}
  }
  function sendSettingsToInterceptor() {
    if (!interceptorActive) return;
    try {
      window.dispatchEvent(new CustomEvent("vibes-update-settings", {
        detail: {
          enabled: settings.enabled,
          pitch: settings.pitch,
          speed: settings.speed
        }
      }));
    } catch (e) {
      console.error("Vibes: Error sending to interceptor", e);
    }
  }
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName === "VIDEO" || node.nodeName === "AUDIO") {
          processMediaElement(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll("video, audio").forEach(processMediaElement);
        }
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "UPDATE_SETTINGS") {
      detectInterceptor();
      if (fastCaptureActive) {
        console.log("Vibes: Deferring UPDATE_SETTINGS to fast-bridge.js (Fast Capture active)");
        return false;
      }
      settings.enabled = message.enabled ?? settings.enabled;
      settings.volume = message.volume ?? settings.volume;
      settings.pitch = message.pitch ?? settings.pitch;
      settings.speed = message.speed ?? settings.speed;
      settings.vinylPitchMode = message.vinylPitchMode ?? settings.vinylPitchMode;
      settings.reverbEnabled = message.reverbEnabled ?? settings.reverbEnabled;
      settings.reverbAmount = message.reverbAmount ?? settings.reverbAmount;
      const count = findAndProcessMedia();
      applyAllSettings();
      sendResponse({
        success: true,
        mediaCount: count,
        settings: settings,
        limitations: getLimitations(),
        interceptorActive: interceptorActive,
        fastCaptureActive: fastCaptureActive,
        fastMediaCount: getFastCaptureMediaCount()
      });
    }
    if (message.type === "GET_STATE") {
      detectInterceptor();
      if (fastCaptureActive) {
        console.log("Vibes: Deferring GET_STATE to fast-bridge.js (Fast Capture active)");
        return false;
      }
      const count = findAndProcessMedia();
      sendResponse({
        success: true,
        mediaCount: count,
        settings: settings,
        limitations: getLimitations(),
        interceptorActive: interceptorActive,
        fastCaptureActive: fastCaptureActive,
        fastMediaCount: getFastCaptureMediaCount()
      });
    }
    if (message.type === "INIT") {
      if (audioContext && audioContext.state === "suspended") {
        audioContext.resume();
      }
      detectInterceptor();
      if (fastCaptureActive) {
        console.log("Vibes: Deferring INIT to fast-bridge.js (Fast Capture active)");
        return false;
      }
      const count = findAndProcessMedia();
      sendResponse({
        success: true,
        mediaCount: count,
        settings: settings,
        limitations: getLimitations(),
        interceptorActive: interceptorActive,
        fastCaptureActive: fastCaptureActive,
        fastMediaCount: getFastCaptureMediaCount()
      });
    }
    return true;
  });
  window.__freePitchUpdate = function() {
    findAndProcessMedia();
    applyAllSettings();
  };
  function restoreSettings() {
    try {
      chrome.runtime.sendMessage({
        type: "CONTENT_SCRIPT_READY"
      }, response => {
        if (chrome.runtime.lastError) {
          console.log("Vibes: Could not restore settings", chrome.runtime.lastError.message);
          return;
        }
        if (response?.settings) {
          const s = response.settings;
          settings.enabled = s.enabled ?? false;
          settings.volume = (s.volume ?? 100) / 100;
          settings.pitch = s.pitch ?? 0;
          settings.speed = (s.speed ?? 100) / 100;
          settings.vinylPitchMode = s.vinylPitchMode ?? false;
          settings.reverbEnabled = s.reverbEnabled ?? false;
          settings.reverbAmount = s.reverbAmount ?? 50;
          console.log("Vibes: Settings restored", settings);
          findAndProcessMedia();
          applyAllSettings();
        }
      });
    } catch (e) {
      console.log("Vibes: Settings restore failed", e);
    }
  }
  findAndProcessMedia();
  restoreSettings();
  if (interceptorActive) {
    console.log("Vibes: Content script loaded (Interceptor mode - full audio control)");
  } else {
    console.log("Vibes: Content script loaded (Standard mode)");
  }
})();