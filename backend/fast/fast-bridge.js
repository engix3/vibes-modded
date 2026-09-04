(function() {
  "use strict";
  const EXCLUDED_SITES = [ "youtube.com", "youtu.be", "chrome.google.com", "chromewebstore.google.com" ];
  function isSiteEnabled() {
    const hostname = window.location.hostname.toLowerCase();
    if (window.location.protocol === "chrome:" || window.location.protocol === "chrome-extension:" || window.location.protocol === "about:") {
      return false;
    }
    return !EXCLUDED_SITES.some(site => hostname === site || hostname.endsWith("." + site));
  }
  if (!isSiteEnabled()) {
    return;
  }
  const DEBUG = typeof VIBES_DEBUG !== "undefined" ? VIBES_DEBUG : false;
  const log = DEBUG ? console.log.bind(console) : () => {};
  const warn = DEBUG ? console.warn.bind(console) : () => {};
  log("[Vibes Bridge] Fast Capture bridge loading on", window.location.hostname);
  function injectResourceUrls() {
    window.dispatchEvent(new CustomEvent("vibes_debugFlag", {
      detail: {
        debug: DEBUG
      }
    }));
    log("[Vibes Bridge] Debug flag sent:", DEBUG);
    const audioConfigUrl = chrome.runtime.getURL("backend/audio/audio-config.js");
    window.dispatchEvent(new CustomEvent("vibes_audioConfigUrl", {
      detail: {
        url: audioConfigUrl
      }
    }));
    log("[Vibes Bridge] Audio config URL sent:", audioConfigUrl);
    const jungleUrl = chrome.runtime.getURL("backend/audio/jungle.js");
    window.dispatchEvent(new CustomEvent("vibes_jungleUrl", {
      detail: {
        url: jungleUrl
      }
    }));
    log("[Vibes Bridge] Jungle URL sent:", jungleUrl);
    const freeverbProcessorUrl = chrome.runtime.getURL("backend/audio/freeverb-processor.js");
    window.dispatchEvent(new CustomEvent("vibes_freeverbProcessorUrl", {
      detail: {
        url: freeverbProcessorUrl
      }
    }));
    log("[Vibes Bridge] Freeverb processor URL sent:", freeverbProcessorUrl);
  }
  injectResourceUrls();
  function getFastMediaCount() {
    const marker = document.getElementById("vibes-fast-capture-active");
    if (marker) {
      const count = parseInt(marker.getAttribute("data-media-count") || "0", 10);
      log("[Vibes Bridge] getFastMediaCount:", count, "from marker");
      return count;
    }
    log("[Vibes Bridge] getFastMediaCount: marker not found");
    return 0;
  }
  function getFastCorsStatus() {
    const marker = document.getElementById("vibes-fast-capture-active");
    if (marker) {
      return {
        speedOnlyCount: parseInt(marker.getAttribute("data-speed-only-count") || "0", 10),
        fullCount: parseInt(marker.getAttribute("data-full-count") || "0", 10)
      };
    }
    return {
      speedOnlyCount: 0,
      fullCount: 0
    };
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log("[Vibes Bridge] Received from extension:", message.type);
    if (message.type === "INIT" || message.type === "GET_STATE") {
      const mediaCount = getFastMediaCount();
      const corsStatus = getFastCorsStatus();
      log("[Vibes Bridge] Responding to", message.type, "with mediaCount:", mediaCount, "speedOnly:", corsStatus.speedOnlyCount, "full:", corsStatus.fullCount);
      sendResponse({
        success: true,
        mediaCount: 0,
        fastMediaCount: mediaCount,
        fastCaptureActive: true,
        interceptorActive: true,
        limitations: [],
        settings: {},
        fastSpeedOnlyCount: corsStatus.speedOnlyCount,
        fastFullCount: corsStatus.fullCount
      });
      return true;
    }
    if (message.type === "UPDATE_SETTINGS" || message.pitch !== undefined || message.speed !== undefined || message.enabled !== undefined) {
      window.dispatchEvent(new CustomEvent("vibes_settingsUpdate", {
        detail: {
          pitch: message.pitch,
          speed: message.speed,
          enabled: message.enabled,
          reverbEnabled: message.reverbEnabled,
          reverbAmount: message.reverbAmount,
          volume: message.volume,
          vinylPitchMode: message.vinylPitchMode
        }
      }));
      const mediaCount = getFastMediaCount();
      const corsStatus = getFastCorsStatus();
      sendResponse({
        success: true,
        mediaCount: 0,
        fastMediaCount: mediaCount,
        fastCaptureActive: true,
        interceptorActive: true,
        limitations: [],
        fastSpeedOnlyCount: corsStatus.speedOnlyCount,
        fastFullCount: corsStatus.fullCount
      });
      return true;
    }
    sendResponse({
      received: true
    });
    return true;
  });
  window.addEventListener("vibes_fastCaptureReady", e => {
    log("[Vibes Bridge] Fast Capture ready signal received");
    injectResourceUrls();
    chrome.runtime.sendMessage({
      type: "FAST_CAPTURE_READY",
      ...e.detail
    }).catch(() => {});
  });
  window.addEventListener("vibes_needsReload", e => {
    warn("[Vibes Bridge] Page needs reload:", e.detail.reason);
    chrome.runtime.sendMessage({
      type: "NEEDS_RELOAD",
      reason: e.detail.reason
    }).catch(() => {});
  });
  window.addEventListener("vibes_toExtension", e => {
    log("[Vibes Bridge] Relaying to extension:", e.detail);
    chrome.runtime.sendMessage(e.detail).catch(() => {});
  });
  chrome.runtime.sendMessage({
    type: "GET_SETTINGS"
  }).then(settings => {
    if (settings && (settings.pitch !== undefined || settings.enabled !== undefined)) {
      log("[Vibes Bridge] Got initial settings:", settings);
      window.dispatchEvent(new CustomEvent("vibes_settingsUpdate", {
        detail: settings
      }));
    }
  }).catch(() => {});
  log("[Vibes Bridge] Fast Capture bridge ready");
})();
