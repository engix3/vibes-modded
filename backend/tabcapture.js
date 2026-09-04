const activeCaptures = new Map;

async function startTabCapture(tabId) {
  console.log("TabCapture: Starting capture for tab", tabId);
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId
    }, streamId => {
      if (chrome.runtime.lastError) {
        console.error("TabCapture: Failed to get stream ID", chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!streamId) {
        reject(new Error("No stream ID returned"));
        return;
      }
      console.log("TabCapture: Got stream ID for tab", tabId);
      activeCaptures.set(tabId, {
        streamId: streamId,
        active: true
      });
      ensureOffscreenDocument().then(() => chrome.runtime.sendMessage({
        type: "OFFSCREEN_START_CAPTURE",
        streamId: streamId,
        tabId: tabId
      })).then(response => {
        if (response && response.success) {
          resolve(streamId);
        } else {
          reject(new Error(response?.error || "Failed to start offscreen processing"));
        }
      }).catch(reject);
    });
  });
}

async function stopTabCapture(tabId) {
  console.log("TabCapture: Stopping capture for tab", tabId);
  const capture = activeCaptures.get(tabId);
  if (capture) {
    try {
      await chrome.runtime.sendMessage({
        type: "OFFSCREEN_STOP_CAPTURE",
        tabId: tabId
      });
    } catch (e) {
      console.warn("TabCapture: Error stopping offscreen processing", e);
    }
    activeCaptures.delete(tabId);
  }
}

async function updateTabCaptureSettings(tabId, settings) {
  const capture = activeCaptures.get(tabId);
  if (!capture || !capture.active) {
    console.warn("TabCapture: No active capture for tab", tabId);
    return false;
  }
  try {
    await chrome.runtime.sendMessage({
      type: "OFFSCREEN_UPDATE_SETTINGS",
      tabId: tabId,
      settings: settings
    });
    return true;
  } catch (e) {
    console.error("TabCapture: Error updating settings", e);
    return false;
  }
}

function isTabCaptureActive(tabId) {
  const capture = activeCaptures.get(tabId);
  return capture && capture.active;
}

async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [ "OFFSCREEN_DOCUMENT" ]
  });
  if (existingContexts.length > 0) {
    console.log("TabCapture: Offscreen document already exists");
    return;
  }
  console.log("TabCapture: Creating offscreen document");
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [ "AUDIO_PLAYBACK" ],
    justification: "Process tab audio for pitch shifting and reverb effects"
  });
}

chrome.tabs.onRemoved.addListener(tabId => {
  if (activeCaptures.has(tabId)) {
    console.log("TabCapture: Tab closed, cleaning up", tabId);
    stopTabCapture(tabId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && activeCaptures.has(tabId)) {
    const capture = activeCaptures.get(tabId);
    if (!changeInfo.url) {
      console.log("TabCapture: Page refresh detected, cleaning up", tabId);
      stopTabCapture(tabId);
    } else {
      console.log("TabCapture: Navigation detected, keeping Tab Capture active", tabId);
    }
  }
});

globalThis.tabCapture = {
  startTabCapture: startTabCapture,
  stopTabCapture: stopTabCapture,
  updateTabCaptureSettings: updateTabCaptureSettings,
  isTabCaptureActive: isTabCaptureActive,
  activeCaptures: activeCaptures
};

console.log("TabCapture: Module loaded");