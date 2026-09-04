importScripts("config.js");

const BrowserInfo = {
  isFirefox: typeof browser !== "undefined",
  hasTabCapture: typeof chrome !== "undefined" && typeof chrome.tabCapture !== "undefined",
  hasOffscreen: typeof chrome !== "undefined" && typeof chrome.offscreen !== "undefined",
  get supportsTabCapture() {
    return this.hasTabCapture && this.hasOffscreen;
  }
};

console.log("Vibes: Browser detection -", {
  isFirefox: BrowserInfo.isFirefox,
  hasTabCapture: BrowserInfo.hasTabCapture,
  hasOffscreen: BrowserInfo.hasOffscreen
});

if (BrowserInfo.supportsTabCapture) {
  importScripts("backend/tabcapture.js");
} else {
  globalThis.tabCapture = {
    startTabCapture: () => Promise.reject(new Error("Tab Capture not available on this browser")),
    stopTabCapture: () => Promise.resolve(),
    updateTabCaptureSettings: () => Promise.resolve(false),
    isTabCaptureActive: () => false,
    activeCaptures: new Map
  };
  console.log("Vibes: Tab Capture not available, using stub");
}

const INTERCEPTOR_SCRIPT_ID = "vibes-interceptor";

async function getGrantedStreamingOrigins() {
  const permissions = await chrome.permissions.getAll();
  const origins = permissions.origins || [];
  const streamingPatterns = [ "soundcloud.com", "spotify.com", "deezer.com", "tidal.com", "pandora.com", "amazon.com/music", "music.amazon.com", "music.apple.com", "vk.com", "vk.ru" ];
  return origins.filter(origin => streamingPatterns.some(pattern => origin.includes(pattern)));
}

async function registerInterceptorForOrigins(origins) {
  if (!origins || origins.length === 0) {
    console.log("Vibes: No streaming origins to register interceptor for");
    return false;
  }
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({
      ids: [ INTERCEPTOR_SCRIPT_ID ]
    });
    let currentMatches = [];
    if (existing.length > 0) {
      currentMatches = existing[0].matches || [];
      await chrome.scripting.unregisterContentScripts({
        ids: [ INTERCEPTOR_SCRIPT_ID ]
      });
    }
    const allMatches = [ ...new Set([ ...currentMatches, ...origins ]) ];
    await chrome.scripting.registerContentScripts([ {
      id: INTERCEPTOR_SCRIPT_ID,
      matches: allMatches,
      js: [ "backend/interceptor-minimal.js" ],
      runAt: "document_start",
      world: "MAIN",
      allFrames: true,
      persistAcrossSessions: true
    } ]);
    console.log("Vibes: Interceptor registered for", allMatches);
    return true;
  } catch (e) {
    console.error("Vibes: Failed to register interceptor", e);
    return false;
  }
}

async function unregisterInterceptorScript() {
  try {
    await chrome.scripting.unregisterContentScripts({
      ids: [ INTERCEPTOR_SCRIPT_ID ]
    });
    console.log("Vibes: Interceptor script unregistered");
    return true;
  } catch (e) {
    console.log("Vibes: Interceptor not registered or already removed");
    return true;
  }
}

async function updateInterceptorRegistration() {
  const origins = await getGrantedStreamingOrigins();
  if (origins.length > 0) {
    await registerInterceptorForOrigins(origins);
  } else {
    await unregisterInterceptorScript();
  }
}

async function checkInterceptorRegisteredForOrigin(originPattern) {
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({
      ids: [ INTERCEPTOR_SCRIPT_ID ]
    });
    if (existing.length === 0) {
      return false;
    }
    const registeredMatches = existing[0].matches || [];
    for (const match of registeredMatches) {
      if (match === originPattern || match === "<all_urls>") {
        return true;
      }
      const patternDomain = originPattern.replace("*://*.", "").replace("*://", "").replace("/*", "");
      const matchDomain = match.replace("*://*.", "").replace("*://", "").replace("/*", "");
      if (patternDomain.includes(matchDomain) || matchDomain.includes(patternDomain)) {
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error("Vibes: Error checking interceptor registration", e);
    return false;
  }
}

chrome.permissions.onAdded.addListener(async permissions => {
  console.log("Vibes: Permission granted", permissions);
  if (permissions.origins && permissions.origins.length > 0) {
    await registerInterceptorForOrigins(permissions.origins);
    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      if (activeTab?.id) {
        await new Promise(r => setTimeout(r, 100));
        console.log("Vibes: Reloading tab", activeTab.id, "for fresh injection");
        chrome.tabs.reload(activeTab.id);
      }
    } catch (e) {
      console.error("Vibes: Failed to reload tab", e);
    }
  }
});

chrome.permissions.onRemoved.addListener(async permissions => {
  console.log("Vibes: Permission removed", permissions);
  await updateInterceptorRegistration();
});

updateInterceptorRegistration();

chrome.runtime.setUninstallURL("https://forms.gle/AUY2nNP57bNArzVg9");

chrome.runtime.onInstalled.addListener(async details => {
  if (details.reason === "install") {
    chrome.tabs.create({
      url: "welcome.html"
    });
  }
  if (details.reason === "install" || details.reason === "update") {
    await updateInterceptorRegistration();
  }
  if (details.reason === "update") {
    const migrated = await chrome.storage.local.get("freePitch_alwaysTab_v108");
    if (!migrated.freePitch_alwaysTab_v108) {
      await chrome.storage.local.set({
        freePitch_alwaysTabCapture: true,
        freePitch_alwaysTab_v108: true
      });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONTENT_SCRIPT_READY") {
    const tabId = sender.tab?.id;
    if (tabId) {
      const key = `freePitch_tab_${tabId}`;
      chrome.storage.local.get(key, data => {
        const saved = data[key];
        if (saved) {
          if (saved.corsTabCapture) {
            console.log("Vibes: CORS tab detected, deferring settings restore until popup opens");
            sendResponse({
              settings: {
                ...saved,
                pitch: 0,
                speed: 100,
                reverbEnabled: false,
                reverbAmount: 50
              }
            });
          } else {
            console.log("Vibes: Restoring settings for tab", tabId, saved);
            sendResponse({
              settings: saved
            });
          }
        } else {
          sendResponse({
            settings: null
          });
        }
      });
      return true;
    }
    sendResponse({
      settings: null
    });
    return;
  }
  if (message.type === "UPDATE_BADGE") {
    const tabId = message.tabId || sender.tab?.id;
    if (!tabId) return;
    const pitch = message.pitch || 0;
    const enabled = message.enabled;
    if (!enabled || pitch === 0) {
      chrome.action.setBadgeText({
        tabId: tabId,
        text: ""
      });
    } else {
      let text;
      if (Number.isInteger(pitch)) {
        text = (pitch > 0 ? "+" : "") + pitch;
      } else {
        text = (pitch > 0 ? "+" : "") + pitch.toFixed(1);
      }
      if (text.length > 4) text = text.substring(0, 4);
      chrome.action.setBadgeText({
        tabId: tabId,
        text: text
      });
      chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: "#fbbf24"
      });
      chrome.action.setBadgeTextColor({
        tabId: tabId,
        color: "#000000"
      });
    }
  }
  if (message.type === "START_TAB_CAPTURE") {
    tabCapture.startTabCapture(message.tabId).then(() => sendResponse({
      success: true
    })).catch(e => sendResponse({
      success: false,
      error: e.message
    }));
    return true;
  }
  if (message.type === "STOP_TAB_CAPTURE") {
    tabCapture.stopTabCapture(message.tabId).then(() => sendResponse({
      success: true
    })).catch(e => sendResponse({
      success: false,
      error: e.message
    }));
    return true;
  }
  if (message.type === "UPDATE_TAB_CAPTURE_SETTINGS") {
    tabCapture.updateTabCaptureSettings(message.tabId, message.settings).then(success => sendResponse({
      success: success
    })).catch(e => sendResponse({
      success: false,
      error: e.message
    }));
    return true;
  }
  if (message.type === "IS_TAB_CAPTURE_ACTIVE") {
    const active = tabCapture.isTabCaptureActive(message.tabId);
    sendResponse({
      active: active
    });
  }
  if (message.type === "CHECK_SITE_PERMISSION") {
    const origin = message.origin;
    checkInterceptorRegisteredForOrigin(origin).then(isRegistered => {
      console.log("Vibes: Check interceptor for", origin, "→", isRegistered);
      sendResponse({
        hasPermission: isRegistered,
        origin: origin
      });
    });
    return true;
  }
  if (message.type === "REQUEST_SITE_PERMISSION") {
    const origins = message.origins;
    const tabId = message.tabId;
    (async () => {
      try {
        await registerInterceptorForOrigins(origins);
        console.log("Vibes: Interceptor registered for", origins);
        if (tabId) {
          await new Promise(r => setTimeout(r, 100));
          console.log("Vibes: Reloading tab", tabId);
          chrome.tabs.reload(tabId);
        }
        sendResponse({
          granted: true,
          origins: origins
        });
      } catch (e) {
        console.error("Vibes: Failed to register interceptor", e);
        sendResponse({
          granted: false,
          error: e.message
        });
      }
    })();
    return true;
  }
  if (message.type === "GET_STREAMING_PERMISSIONS") {
    getGrantedStreamingOrigins().then(origins => {
      sendResponse({
        origins: origins
      });
    });
    return true;
  }
  return true;
});

console.log("Vibes background loaded");