(function() {
  "use strict";
  const DEBUG = false;
  const log = DEBUG ? console.log.bind(console) : () => {};
  const config = window.__vibesAudioConfig?.jungle || {};
  const DELAY_TIME = config.delayTime || .1;
  const FADE_TIME = config.fadeTime || .05;
  const BUFFER_TIME = config.bufferTime || .1;
  const MAX_SEMITONES = config.maxSemitones || 12;
  const SMOOTHING_TIME = config.smoothingTime || .01;
  const MODULATION_DEPTH = config.modulationDepth || .5;
  log("[Vibes Jungle] Config loaded:", {
    DELAY_TIME: DELAY_TIME,
    FADE_TIME: FADE_TIME,
    BUFFER_TIME: BUFFER_TIME,
    MAX_SEMITONES: MAX_SEMITONES
  });
  function createFadeBuffer(ctx, activeTime, fadeTime) {
    const length1 = activeTime * ctx.sampleRate;
    const length2 = (activeTime - 2 * fadeTime) * ctx.sampleRate;
    const length = length1 + length2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const p = buffer.getChannelData(0);
    const fadeLength = fadeTime * ctx.sampleRate;
    const fadeIndex1 = fadeLength;
    const fadeIndex2 = length1 - fadeLength;
    for (let i = 0; i < length1; ++i) {
      if (i < fadeIndex1) {
        p[i] = Math.sqrt(i / fadeLength);
      } else if (i >= fadeIndex2) {
        p[i] = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
      } else {
        p[i] = 1;
      }
    }
    for (let i = length1; i < length; ++i) {
      p[i] = 0;
    }
    return buffer;
  }
  function createDelayTimeBuffer(ctx, activeTime, fadeTime, shiftUp) {
    const length1 = activeTime * ctx.sampleRate;
    const length2 = (activeTime - 2 * fadeTime) * ctx.sampleRate;
    const length = length1 + length2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
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
    constructor(ctx) {
      this.ctx = ctx;
      this.input = ctx.createGain();
      this.output = ctx.createGain();
      const mod1 = ctx.createBufferSource();
      const mod2 = ctx.createBufferSource();
      const mod3 = ctx.createBufferSource();
      const mod4 = ctx.createBufferSource();
      const shiftDownBuffer = createDelayTimeBuffer(ctx, BUFFER_TIME, FADE_TIME, false);
      const shiftUpBuffer = createDelayTimeBuffer(ctx, BUFFER_TIME, FADE_TIME, true);
      mod1.buffer = shiftDownBuffer;
      mod2.buffer = shiftDownBuffer;
      mod3.buffer = shiftUpBuffer;
      mod4.buffer = shiftUpBuffer;
      mod1.loop = mod2.loop = mod3.loop = mod4.loop = true;
      this.mod1Gain = ctx.createGain();
      this.mod2Gain = ctx.createGain();
      this.mod3Gain = ctx.createGain();
      this.mod4Gain = ctx.createGain();
      this.mod3Gain.gain.value = 0;
      this.mod4Gain.gain.value = 0;
      mod1.connect(this.mod1Gain);
      mod2.connect(this.mod2Gain);
      mod3.connect(this.mod3Gain);
      mod4.connect(this.mod4Gain);
      const fade1 = ctx.createBufferSource();
      const fade2 = ctx.createBufferSource();
      const fadeBuffer = createFadeBuffer(ctx, BUFFER_TIME, FADE_TIME);
      fade1.buffer = fadeBuffer;
      fade2.buffer = fadeBuffer;
      fade1.loop = fade2.loop = true;
      const mix1 = ctx.createGain();
      const mix2 = ctx.createGain();
      mix1.gain.value = 0;
      mix2.gain.value = 0;
      fade1.connect(mix1.gain);
      fade2.connect(mix2.gain);
      const delay1 = ctx.createDelay();
      const delay2 = ctx.createDelay();
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
      const t = ctx.currentTime + .05;
      const t2 = t + BUFFER_TIME - FADE_TIME;
      mod1.start(t);
      mod2.start(t2);
      mod3.start(t);
      mod4.start(t2);
      fade1.start(t);
      fade2.start(t2);
      this.setDelay(DELAY_TIME);
    }
    setDelay(d) {
      const depth = MODULATION_DEPTH;
      this.mod1Gain.gain.setTargetAtTime(depth * d, 0, SMOOTHING_TIME);
      this.mod2Gain.gain.setTargetAtTime(depth * d, 0, SMOOTHING_TIME);
      this.mod3Gain.gain.setTargetAtTime(depth * d, 0, SMOOTHING_TIME);
      this.mod4Gain.gain.setTargetAtTime(depth * d, 0, SMOOTHING_TIME);
    }
    setPitchOffset(mult) {
      const depth = MODULATION_DEPTH;
      if (mult > 0) {
        this.mod1Gain.gain.setTargetAtTime(0, 0, SMOOTHING_TIME);
        this.mod2Gain.gain.setTargetAtTime(0, 0, SMOOTHING_TIME);
        this.mod3Gain.gain.setTargetAtTime(depth * DELAY_TIME * mult, 0, SMOOTHING_TIME);
        this.mod4Gain.gain.setTargetAtTime(depth * DELAY_TIME * mult, 0, SMOOTHING_TIME);
      } else {
        this.mod1Gain.gain.setTargetAtTime(depth * DELAY_TIME * Math.abs(mult), 0, SMOOTHING_TIME);
        this.mod2Gain.gain.setTargetAtTime(depth * DELAY_TIME * Math.abs(mult), 0, SMOOTHING_TIME);
        this.mod3Gain.gain.setTargetAtTime(0, 0, SMOOTHING_TIME);
        this.mod4Gain.gain.setTargetAtTime(0, 0, SMOOTHING_TIME);
      }
    }
    setSemitones(semitones) {
      const clamped = Math.max(-MAX_SEMITONES, Math.min(MAX_SEMITONES, semitones));
      this.setPitchOffset(clamped / MAX_SEMITONES);
    }
  }
  window.__vibesJungle = Jungle;
  window.__vibesJungleFast = Jungle;
  log("[Vibes Jungle] Class loaded (unified version)");
  window.dispatchEvent(new CustomEvent("vibes-jungle-ready"));
  window.dispatchEvent(new CustomEvent("vibes_jungleFastReady"));
})();