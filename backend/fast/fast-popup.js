(function() {
  "use strict";
  console.log("[Vibes Fast Popup] Loading early in head...");
  window.vibesFastCapture = {
    ready: false,
    needsReload: false,
    reloadReason: null,
    siteConfig: null
  };
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "FAST_CAPTURE_READY") {
      console.log("[Vibes Fast Popup] Fast Capture ready signal received");
      window.vibesFastCapture.ready = true;
      window.dispatchEvent(new CustomEvent("vibes_fastCaptureReady", {
        detail: message
      }));
      sendResponse({
        received: true
      });
    }
    if (message.type === "NEEDS_RELOAD") {
      console.log("[Vibes Fast Popup] Page needs reload:", message.reason);
      window.vibesFastCapture.needsReload = true;
      window.vibesFastCapture.reloadReason = message.reason;
      window.dispatchEvent(new CustomEvent("vibes_needsReload", {
        detail: {
          reason: message.reason
        }
      }));
      sendResponse({
        received: true
      });
    }
    return true;
  });
  async function checkFastCaptureStatus() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      if (!tab) return;
      const hostname = new URL(tab.url).hostname.toLowerCase();
      const enabledSites = [ "spotify.com", "soundcloud.com", "pandora.com", "deezer.com", "tidal.com", "vk.com", "vk.ru" ];
      const isFastCaptureSite = enabledSites.some(site => hostname === site || hostname.endsWith("." + site));
      window.vibesFastCapture.siteConfig = {
        hostname: hostname,
        enabled: isFastCaptureSite,
        tabId: tab.id
      };
      console.log("[Vibes Fast Popup] Site check:", hostname, isFastCaptureSite ? "(Fast Capture enabled)" : "(Default mode)");
      if (isFastCaptureSite) {
        const response = await chrome.runtime.sendMessage({
          type: "CHECK_FAST_CAPTURE_STATUS",
          tabId: tab.id
        }).catch(() => null);
        if (response?.needsReload) {
          window.vibesFastCapture.needsReload = true;
          window.vibesFastCapture.reloadReason = response.reason;
        }
      }
    } catch (err) {
      console.log("[Vibes Fast Popup] Could not check status:", err.message);
    }
  }
  checkFastCaptureStatus();
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[Vibes Fast Popup] DOM ready, Fast Capture state:", window.vibesFastCapture);
    if (window.vibesFastCapture.needsReload) {
      window.dispatchEvent(new CustomEvent("vibes_needsReload", {
        detail: {
          reason: window.vibesFastCapture.reloadReason
        }
      }));
    }
  });
  console.log("[Vibes Fast Popup] Early initialization complete");
})();