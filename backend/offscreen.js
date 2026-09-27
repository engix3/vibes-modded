const Jungle = window.__vibesJungle;
const pendingProcessors = new Map;
const activeProcessors = new Map;
const captureCommands = new Set([
  "OFFSCREEN_START_CAPTURE",
  "OFFSCREEN_STOP_CAPTURE",
  "OFFSCREEN_UPDATE_SETTINGS",
  "OFFSCREEN_GET_CAPTURE_STATUS"
]);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!captureCommands.has(message?.type)) return false;
  if (sender?.id !== chrome.runtime.id || sender.tab ||
      typeof sender.url !== "string" || !sender.url.startsWith(chrome.runtime.getURL(""))) {
    return false;
  }
  if (!Number.isSafeInteger(message.tabId) || message.tabId < 0) {
    sendResponse({ success: false, error: "Invalid tab ID" });
    return false;
  }
  if (message.type === "OFFSCREEN_GET_CAPTURE_STATUS") {
    const active = activeProcessors.get(message.tabId);
    const pending = pendingProcessors.get(message.tabId);
    const processor = active || pending;
    sendResponse({
      success: true,
      active: !!active,
      pending: !!pending,
      captureId: processor?.captureId || null,
      streamId: processor?.streamId || null
    });
    return false;
  }
  if (message.type === "OFFSCREEN_UPDATE_SETTINGS") {
    try {
      sendResponse({ success: updateSettings(message.tabId, message.settings) });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return false;
  }
  if (typeof message.captureId !== "string" || !message.captureId ||
      (message.type === "OFFSCREEN_START_CAPTURE" &&
       (typeof message.streamId !== "string" || !message.streamId))) {
    sendResponse({ success: false, error: "Invalid capture token or stream ID" });
    return false;
  }
  const result = message.type === "OFFSCREEN_START_CAPTURE"
    ? startProcessing(message.streamId, message.tabId, message.captureId)
    : stopProcessing(message.tabId, message.captureId).then(success => ({ success }));
  result.then(sendResponse).catch(error => {
    sendResponse({ success: false, error: error.message });
  });
  return true;
});

function ownsProcessor(processor) {
  return !processor.canceled && (pendingProcessors.get(processor.tabId) === processor ||
    activeProcessors.get(processor.tabId) === processor);
}

function removeProcessor(processor) {
  processor.canceled = true;
  if (pendingProcessors.get(processor.tabId) === processor) pendingProcessors.delete(processor.tabId);
  if (activeProcessors.get(processor.tabId) === processor) activeProcessors.delete(processor.tabId);
}

function cleanupProcessor(processor) {
  const release = action => {
    try {
      action();
    } catch (error) {
      console.warn("Offscreen: Resource cleanup failed", error);
    }
  };
  for (const [track, listener] of processor.trackListeners.splice(0)) {
    release(() => track.removeEventListener("ended", listener));
  }
  if (processor.stream) {
    const stream = processor.stream;
    processor.stream = null;
    for (const track of stream.getTracks()) release(() => track.stop());
  }
  for (const node of processor.nodes.splice(0)) release(() => node.disconnect());
  for (const dsp of processor.disposables.splice(0)) release(() => dsp.dispose?.());
  if (processor.audioContext) {
    const context = processor.audioContext;
    processor.audioContext = null;
    // Closing a context releases even nodes allocated by a failed DSP constructor.
    processor.closePromise = Promise.resolve().then(() => context.close()).catch(error => {
      console.warn("Offscreen: Audio context cleanup failed", error);
    });
  }
  // A canceled getUserMedia may acquire its stream later; subsequent cleanup drains it too.
  return processor.closePromise || Promise.resolve();
}

function startProcessing(streamId, tabId, captureId) {
  const active = activeProcessors.get(tabId);
  if (active) return Promise.resolve({ success: true, streamId: active.streamId, captureId: active.captureId });
  const pending = pendingProcessors.get(tabId);
  if (pending) return pending.promise;
  const processor = {
    tabId,
    streamId,
    captureId,
    canceled: false,
    stream: null,
    audioContext: null,
    nodes: [],
    disposables: [],
    trackListeners: [],
    settings: {
      enabled: true,
      volume: 1,
      pitch: 0,
      speed: 1,
      vinylPitchMode: false,
      reverbEnabled: false,
      reverbAmount: 50
    }
  };
  pendingProcessors.set(tabId, processor);
  const assertOwner = () => {
    if (!ownsProcessor(processor)) throw new Error("Capture start canceled");
  };
  processor.promise = Promise.resolve().then(async () => {
    try {
      assertOwner();
      if (typeof Jungle !== "function" || typeof Freeverb !== "function") {
        throw new Error("DSP classes are not loaded in the offscreen document");
      }
      processor.stream = await navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
        video: false
      });
      assertOwner();
      for (const track of processor.stream.getTracks()) {
        const listener = () => { void stopProcessing(tabId, captureId); };
        track.addEventListener("ended", listener);
        processor.trackListeners.push([track, listener]);
        if (track.readyState === "ended") throw new Error("Capture track already ended");
      }
      const audioContext = processor.audioContext = new AudioContext;
      if (audioContext.state === "suspended") {
        await audioContext.resume();
        assertOwner();
      }
      const node = value => {
        processor.nodes.push(value);
        return value;
      };
      const dsp = value => {
        processor.disposables.push(value);
        return value;
      };
      const source = processor.source = node(audioContext.createMediaStreamSource(processor.stream));
      const upmix = processor.upmix = node(audioContext.createGain());
      upmix.channelCount = 2;
      upmix.channelCountMode = "explicit";
      upmix.channelInterpretation = "speakers";
      const splitter = processor.splitter = node(audioContext.createChannelSplitter(2));
      const merger = processor.merger = node(audioContext.createChannelMerger(2));
      const jungleL = processor.jungleL = dsp(new Jungle(audioContext));
      const jungleR = processor.jungleR = dsp(new Jungle(audioContext));
      const reverb = processor.reverb = dsp(new Freeverb(audioContext));
      const bypassGain = processor.bypassGain = node(audioContext.createGain());
      bypassGain.gain.value = 1;
      const processedGain = processor.processedGain = node(audioContext.createGain());
      processedGain.gain.value = 0;
      const volumeGain = processor.volumeGain = node(audioContext.createGain());
      volumeGain.gain.value = 1;
      source.connect(upmix);
      upmix.connect(splitter);
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
      assertOwner();
      pendingProcessors.delete(tabId);
      activeProcessors.set(tabId, processor);
      return { success: true, streamId, captureId };
    } catch (error) {
      removeProcessor(processor);
      await cleanupProcessor(processor);
      throw error;
    }
  });
  return processor.promise;
}

function updateSettings(tabId, settings) {
  const processor = activeProcessors.get(tabId);
  if (!processor) return false;
  Object.assign(processor.settings, settings);
  const {audioContext, jungleL, jungleR, reverb, bypassGain, processedGain, volumeGain} = processor;
  const {enabled, volume, pitch, reverbEnabled, reverbAmount} = processor.settings;
  const now = audioContext.currentTime;
  if (!enabled) {
    bypassGain.gain.setTargetAtTime(1, now, .02);
    processedGain.gain.setTargetAtTime(0, now, .02);
    if (volumeGain) volumeGain.gain.setTargetAtTime(1, now, .02);
    reverb.setEnabled(false);
    return true;
  }
  const shouldProcess = pitch !== 0 || reverbEnabled;
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
  if (volumeGain) volumeGain.gain.setTargetAtTime(volume ?? 1, now, .02);
  return true;
}

async function stopProcessing(tabId, captureId) {
  const processor = pendingProcessors.get(tabId) || activeProcessors.get(tabId);
  if (!processor || processor.captureId !== captureId) return false;
  removeProcessor(processor);
  await cleanupProcessor(processor);
  return true;
}

console.log("Offscreen: Audio processor loaded");
