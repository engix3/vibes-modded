// These operations coordinate this worker only; the offscreen document owns captures.
const captureOperations = new Map;
let offscreenDocumentPromise = null;

// While Tab Capture is active the tab keeps playing to the speakers AND the
// captured stream is played back by the offscreen document. Without muting
// the tab the user hears both (up to +6 dB louder + comb filtering).
const MUTED_TABS_STORE_KEY = "vibes_muted_tabs";

function getTabsUpdateApi() {
  try {
    const api = chrome?.tabs;
    return api && typeof api.update === "function" ? api : null;
  } catch (_) {
    return null;
  }
}

function setTabMuted(tabId, muted) {
  const tabs = getTabsUpdateApi();
  if (!tabs) return Promise.resolve(false);
  return new Promise(resolve => {
    try {
      tabs.update(tabId, { muted }, () => {
        const error = (() => { try {
          return chrome.runtime.lastError;
        } catch (_) {
          return null;
        } })();
        if (error) console.warn("TabCapture: Failed to update tab mute", error.message);
        resolve(!error);
      });
    } catch (error) {
      console.warn("TabCapture: Failed to update tab mute", error?.message);
      resolve(false);
    }
  });
}

function readMutedTabStore() {
  try {
    const storage = chrome?.storage?.local;
    if (!storage || typeof storage.get !== "function") return Promise.resolve([]);
    return Promise.resolve(storage.get(MUTED_TABS_STORE_KEY))
      .then(data => {
        const ids = data?.[MUTED_TABS_STORE_KEY];
        return Array.isArray(ids) ? ids.filter(Number.isSafeInteger) : [];
      })
      .catch(() => []);
  } catch (_) {
    return Promise.resolve([]);
  }
}

function writeMutedTabStore(ids) {
  try {
    const storage = chrome?.storage?.local;
    if (!storage || typeof storage.set !== "function") return;
    Promise.resolve(storage.set({ [MUTED_TABS_STORE_KEY]: ids })).catch(() => {});
  } catch (_) {}
}

async function rememberMutedTab(tabId) {
  const ids = await readMutedTabStore();
  if (!ids.includes(tabId)) {
    ids.push(tabId);
    writeMutedTabStore(ids);
  }
}

async function forgetMutedTab(tabId) {
  const ids = await readMutedTabStore();
  const next = ids.filter(id => id !== tabId);
  if (next.length !== ids.length) writeMutedTabStore(next);
}

async function unmuteIfOurs(tabId) {
  const ids = await readMutedTabStore();
  if (!ids.includes(tabId)) return;
  await setTabMuted(tabId, false);
  await forgetMutedTab(tabId);
}

async function reconcileStaleMutes() {
  const ids = await readMutedTabStore();
  if (!ids.length) return;
  for (const id of ids) {
    try {
      let live = false;
      try {
        if (await hasOffscreenDocument()) {
          const status = await getCaptureStatus(id);
          live = status?.success === true && status.active === true;
        }
      } catch (_) {}
      if (!live) await unmuteIfOurs(id);
    } catch (_) {}
  }
}

function isValidTabId(tabId) {
  return Number.isSafeInteger(tabId) && tabId >= 0;
}

async function hasOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [ "OFFSCREEN_DOCUMENT" ],
    documentUrls: [ chrome.runtime.getURL("offscreen.html") ]
  });
  return contexts.length > 0;
}

function ensureOffscreenDocument() {
  if (!offscreenDocumentPromise) {
    offscreenDocumentPromise = (async () => {
      if (!await hasOffscreenDocument()) {
        await chrome.offscreen.createDocument({
          url: "offscreen.html",
          reasons: [ "AUDIO_PLAYBACK" ],
          justification: "Process tab audio for pitch shifting and reverb effects"
        });
      }
    })().finally(() => {
      offscreenDocumentPromise = null;
    });
  }
  return offscreenDocumentPromise;
}

function getCaptureStatus(tabId) {
  return chrome.runtime.sendMessage({ type: "OFFSCREEN_GET_CAPTURE_STATUS", tabId });
}

function startTabCapture(tabId) {
  if (!isValidTabId(tabId)) return Promise.reject(new Error("Invalid tab ID"));
  const previous = captureOperations.get(tabId);
  if (previous?.type === "start") return previous.promise;

  const operation = {
    type: "start",
    captureId: crypto.randomUUID(),
    waitForStop: previous?.promise
  };
  captureOperations.set(tabId, operation);
  const assertOwner = () => {
    if (captureOperations.get(tabId) !== operation) {
      throw new Error("Capture start canceled");
    }
  };
  operation.promise = Promise.resolve().then(async () => {
    let dispatched = false;
    try {
      if (operation.waitForStop) {
        await operation.waitForStop;
        assertOwner();
      }
      assertOwner();
      await ensureOffscreenDocument();
      assertOwner();
      const status = await getCaptureStatus(tabId);
      assertOwner();
      if (!status?.success) throw new Error("Failed to query offscreen capture status");
      if (status.active) return status.streamId;

      let streamId;
      if (status.pending) {
        operation.captureId = status.captureId;
        streamId = status.streamId;
      } else {
        streamId = await new Promise((resolve, reject) => {
          chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, id => {
            const error = chrome.runtime.lastError;
            if (error || !id) {
              reject(new Error(error?.message || "No stream ID returned"));
            } else {
              resolve(id);
            }
          });
        });
        assertOwner();
      }
      dispatched = true;
      const response = await chrome.runtime.sendMessage({
        type: "OFFSCREEN_START_CAPTURE",
        streamId,
        tabId,
        captureId: operation.captureId
      });
      assertOwner();
      if (!response?.success) {
        throw new Error(response?.error || "Failed to start offscreen processing");
      }
      await setTabMuted(tabId, true);
      void rememberMutedTab(tabId);
      return response.streamId || streamId;
    } catch (error) {
      if (dispatched) {
        // Token-scoped rollback cannot stop a replacement capture.
        try {
          await chrome.runtime.sendMessage({
            type: "OFFSCREEN_STOP_CAPTURE", tabId, captureId: operation.captureId
          });
        } catch (_) {}
      }
      throw error;
    } finally {
      if (captureOperations.get(tabId) === operation) captureOperations.delete(tabId);
    }
  });
  return operation.promise;
}

function stopTabCapture(tabId) {
  if (!isValidTabId(tabId)) return Promise.resolve(false);
  const previous = captureOperations.get(tabId);
  if (previous?.type === "stop") return previous.promise;
  const operation = { type: "stop", waitForStop: previous?.waitForStop };
  // Replacing the operation invalidates a pending start before any await.
  captureOperations.set(tabId, operation);
  operation.promise = Promise.resolve().then(async () => {
    try {
      // A new start waits for this stop, including any older stop it supersedes.
      if (operation.waitForStop) await operation.waitForStop;
      if (!await hasOffscreenDocument()) {
        await unmuteIfOurs(tabId);
        return false;
      }
      const status = await getCaptureStatus(tabId);
      if (!status?.success || !status.captureId) {
        await unmuteIfOurs(tabId);
        return false;
      }
      const response = await chrome.runtime.sendMessage({
        type: "OFFSCREEN_STOP_CAPTURE", tabId, captureId: status.captureId
      });
      if (response?.success === true) await unmuteIfOurs(tabId);
      return response?.success === true;
    } catch (error) {
      console.warn("TabCapture: Error stopping offscreen processing", error);
      return false;
    } finally {
      if (captureOperations.get(tabId) === operation) captureOperations.delete(tabId);
    }
  });
  return operation.promise;
}

async function updateTabCaptureSettings(tabId, settings) {
  if (!isValidTabId(tabId)) return false;
  try {
    if (!await hasOffscreenDocument()) return false;
    const response = await chrome.runtime.sendMessage({
      type: "OFFSCREEN_UPDATE_SETTINGS", tabId, settings
    });
    return response?.success === true;
  } catch (error) {
    console.error("TabCapture: Error updating settings", error);
    return false;
  }
}

async function isTabCaptureActive(tabId) {
  if (!isValidTabId(tabId)) return false;
  try {
    if (!await hasOffscreenDocument()) return false;
    const status = await getCaptureStatus(tabId);
    return status?.success === true && status.active === true;
  } catch (_) {
    return false;
  }
}

chrome.tabs.onRemoved.addListener(tabId => {
  void stopTabCapture(tabId);
  void forgetMutedTab(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") void stopTabCapture(tabId);
});

// Service worker restarts while a tab stayed muted: unmute it unless its
// capture is still alive in the offscreen document.
void reconcileStaleMutes();

globalThis.tabCapture = {
  startTabCapture,
  stopTabCapture,
  updateTabCaptureSettings,
  isTabCaptureActive
};

console.log("TabCapture: Module loaded");
