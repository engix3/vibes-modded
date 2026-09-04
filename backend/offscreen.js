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

let audioContext = null;

let activeProcessors = new Map;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OFFSCREEN_START_CAPTURE") {
    startProcessing(message.streamId, message.tabId).then(() => sendResponse({
      success: true
    })).catch(e => {
      console.error("Offscreen: Start processing failed", e);
      sendResponse({
        success: false,
        error: e.message
      });
    });
    return true;
  }
  if (message.type === "OFFSCREEN_STOP_CAPTURE") {
    stopProcessing(message.tabId);
    sendResponse({
      success: true
    });
  }
  if (message.type === "OFFSCREEN_UPDATE_SETTINGS") {
    updateSettings(message.tabId, message.settings);
    sendResponse({
      success: true
    });
  }
  return true;
});

async function startProcessing(streamId, tabId) {
  console.log("Offscreen: Starting processing for tab", tabId);
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    },
    video: false
  });
  audioContext = audioContext || new AudioContext;
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  const source = audioContext.createMediaStreamSource(stream);
  const splitter = audioContext.createChannelSplitter(2);
  const merger = audioContext.createChannelMerger(2);
  const jungleL = new Jungle(audioContext);
  const jungleR = new Jungle(audioContext);
  const reverb = new Freeverb(audioContext);
  const bypassGain = audioContext.createGain();
  bypassGain.gain.value = 1;
  const processedGain = audioContext.createGain();
  processedGain.gain.value = 0;
  const volumeGain = audioContext.createGain();
  volumeGain.gain.value = 1;
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
  volumeGain.connect(audioContext.destination);
  activeProcessors.set(tabId, {
    source: source,
    stream: stream,
    splitter: splitter,
    merger: merger,
    jungleL: jungleL,
    jungleR: jungleR,
    reverb: reverb,
    bypassGain: bypassGain,
    processedGain: processedGain,
    volumeGain: volumeGain,
    settings: {
      enabled: true,
      volume: 1,
      pitch: 0,
      speed: 1,
      vinylPitchMode: false,
      reverbEnabled: false,
      reverbAmount: 50
    }
  });
  console.log("Offscreen: Processing started for tab", tabId);
}

function updateSettings(tabId, settings) {
  const processor = activeProcessors.get(tabId);
  if (!processor) {
    console.warn("Offscreen: No processor for tab", tabId);
    return;
  }
  Object.assign(processor.settings, settings);
  const {jungleL: jungleL, jungleR: jungleR, reverb: reverb, bypassGain: bypassGain, processedGain: processedGain, volumeGain: volumeGain} = processor;
  const {enabled: enabled, volume: volume, pitch: pitch, reverbEnabled: reverbEnabled, reverbAmount: reverbAmount} = processor.settings;
  if (!enabled) {
    const now = audioContext.currentTime;
    bypassGain.gain.setTargetAtTime(1, now, .02);
    processedGain.gain.setTargetAtTime(0, now, .02);
    if (volumeGain) volumeGain.gain.setTargetAtTime(1, now, .02);
    reverb.setEnabled(false);
    return;
  }
  const shouldProcess = pitch !== 0 || reverbEnabled;
  const now = audioContext.currentTime;
  if (shouldProcess) {
    const hasPitch = pitch !== 0;
    const gain = hasPitch && reverbEnabled ? MAKEUP_GAIN_PLUS_REVERB : hasPitch ? MAKEUP_GAIN : 1;
    bypassGain.gain.setTargetAtTime(0, now, .02);
    processedGain.gain.setTargetAtTime(gain, now, .02);
  } else {
    bypassGain.gain.setTargetAtTime(1, now, .02);
    processedGain.gain.setTargetAtTime(0, now, .02);
  }
  jungleL.setSemitones(pitch);
  jungleR.setSemitones(pitch);
  reverb.setEnabled(reverbEnabled);
  reverb.setAmount(reverbAmount);
  if (volumeGain) {
    volumeGain.gain.setTargetAtTime(volume ?? 1, now, .02);
  }
  console.log("Offscreen: Settings updated for tab", tabId, processor.settings);
}

function stopProcessing(tabId) {
  const processor = activeProcessors.get(tabId);
  if (processor) {
    console.log("Offscreen: Stopping processing for tab", tabId);
    processor.stream.getTracks().forEach(track => track.stop());
    processor.source.disconnect();
    activeProcessors.delete(tabId);
  }
}

console.log("Offscreen: Audio processor loaded");