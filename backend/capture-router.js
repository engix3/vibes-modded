const CaptureMode = {
  DEFAULT: "default",
  INTERCEPTOR: "interceptor",
  FAST_CAPTURE: "fastcapture",
  TAB_CAPTURE: "tabcapture"
};

const BrowserInfo = {
  isFirefox: typeof browser !== "undefined" && typeof browser.runtime !== "undefined",
  isChrome: typeof chrome !== "undefined" && typeof chrome.runtime !== "undefined" && !navigator.userAgent.includes("Firefox"),
  hasTabCapture: typeof chrome !== "undefined" && typeof chrome.tabCapture !== "undefined",
  hasOffscreen: typeof chrome !== "undefined" && typeof chrome.offscreen !== "undefined",
  getBrowserName() {
    if (this.isFirefox) return "Firefox";
    if (this.isChrome) return "Chrome";
    return "Unknown";
  },
  getAvailableModes() {
    const modes = [ CaptureMode.DEFAULT, CaptureMode.INTERCEPTOR ];
    if (this.hasTabCapture && this.hasOffscreen) {
      modes.push(CaptureMode.TAB_CAPTURE);
    }
    return modes;
  },
  isModeAvailable(mode) {
    return this.getAvailableModes().includes(mode);
  }
};

class CaptureRouter {
  constructor() {
    this._mode = CaptureMode.DEFAULT;
    this._tabId = null;
    this._tabUrl = null;
    this._listeners = [];
    this._capabilities = null;
    this._defaultMediaCount = 0;
    this._fastMediaCount = 0;
    this._fastSpeedOnlyCount = 0;
    this._fastFullCount = 0;
    this._noMediaPromptDismissed = false;
    this._fastCaptureGracePeriod = 0;
    this._fastCaptureModeSetAt = null;
  }
  setTabId(tabId) {
    this._tabId = tabId;
  }
  setTabUrl(url) {
    this._tabUrl = url;
  }
  isYouTube() {
    if (!this._tabUrl) return false;
    try {
      const hostname = new URL(this._tabUrl).hostname;
      return hostname === "youtube.com" || hostname.endsWith(".youtube.com");
    } catch {
      return false;
    }
  }
  isSpeedDisabled() {
    if (this._mode !== CaptureMode.TAB_CAPTURE) {
      return false;
    }
    const hasMedia = this._defaultMediaCount > 0 || this._fastMediaCount > 0;
    const fastCaptureWasActive = this._capabilities?.fastCaptureActive || false;
    return !this.isYouTube() && !hasMedia && !fastCaptureWasActive;
  }
  isCorsLimited() {
    if (this._mode !== CaptureMode.FAST_CAPTURE) return false;
    return this._fastSpeedOnlyCount > 0;
  }
  updateCorsStatus(speedOnlyCount, fullCount) {
    this._fastSpeedOnlyCount = speedOnlyCount;
    this._fastFullCount = fullCount;
  }
  getMode() {
    return this._mode;
  }
  isMode(mode) {
    return this._mode === mode;
  }
  setMode(mode) {
    if (this._mode === mode) return;
    const previous = this._mode;
    this._mode = mode;
    if (mode === CaptureMode.FAST_CAPTURE) {
      this._fastCaptureModeSetAt = Date.now();
    }
    console.log(`CaptureRouter: Mode changed ${previous} → ${mode}`);
    this._notifyListeners(mode, previous);
  }
  setCapabilities(capabilities) {
    this._capabilities = capabilities;
    if (capabilities.mediaCount !== undefined) {
      this._defaultMediaCount = capabilities.mediaCount;
    }
    if (capabilities.fastMediaCount !== undefined) {
      this._fastMediaCount = capabilities.fastMediaCount;
    }
    if (capabilities.fastSpeedOnlyCount !== undefined) {
      this._fastSpeedOnlyCount = capabilities.fastSpeedOnlyCount;
    }
    if (capabilities.fastFullCount !== undefined) {
      this._fastFullCount = capabilities.fastFullCount;
    }
  }
  setMediaCount(mode, count) {
    if (mode === CaptureMode.DEFAULT || mode === CaptureMode.INTERCEPTOR) {
      this._defaultMediaCount = count;
    } else if (mode === CaptureMode.FAST_CAPTURE) {
      this._fastMediaCount = count;
    }
  }
  getActiveMediaCount() {
    switch (this._mode) {
     case CaptureMode.FAST_CAPTURE:
      return this._fastMediaCount;

     case CaptureMode.TAB_CAPTURE:
      return 1;

     case CaptureMode.DEFAULT:
     case CaptureMode.INTERCEPTOR:
     default:
      return this._defaultMediaCount;
    }
  }
  getTotalMediaCount() {
    if (this._mode === CaptureMode.FAST_CAPTURE) {
      return this._fastMediaCount;
    }
    if (this._mode === CaptureMode.TAB_CAPTURE) {
      return 1;
    }
    return Math.max(this._defaultMediaCount, this._fastMediaCount);
  }
  hasActiveMedia() {
    return this.getActiveMediaCount() > 0;
  }
  dismissNoMediaPrompt() {
    this._noMediaPromptDismissed = true;
  }
  shouldShowNoMediaPrompt() {
    if (this._noMediaPromptDismissed) {
      return false;
    }
    if (this._mode === CaptureMode.TAB_CAPTURE) {
      return false;
    }
    if (this._mode === CaptureMode.FAST_CAPTURE) {
      if (this._fastCaptureModeSetAt) {
        const elapsed = Date.now() - this._fastCaptureModeSetAt;
        if (elapsed < this._fastCaptureGracePeriod) {
          return false;
        }
      }
      return this._fastMediaCount === 0;
    }
    return this._defaultMediaCount === 0;
  }
  determineMode(capabilities) {
    this.setCapabilities(capabilities);
    const {mediaCount: mediaCount = 0, limitations: limitations = [], interceptorActive: interceptorActive = false, fastCaptureActive: fastCaptureActive = false} = capabilities;
    if (this._mode === CaptureMode.TAB_CAPTURE) {
      return CaptureMode.TAB_CAPTURE;
    }
    if (fastCaptureActive) {
      return CaptureMode.FAST_CAPTURE;
    }
    if (interceptorActive) {
      return CaptureMode.INTERCEPTOR;
    }
    return CaptureMode.DEFAULT;
  }
  checkFastCaptureActive() {
    const fastMarker = document.getElementById("vibes-fast-capture-active");
    return fastMarker !== null;
  }
  checkInterceptorActive() {
    const marker = document.getElementById("vibes-interceptor-active");
    return marker !== null;
  }
  autoSetMode(capabilities) {
    const newMode = this.determineMode(capabilities);
    if (newMode !== this._mode) {
      this.setMode(newMode);
    }
    return newMode;
  }
  shouldShowTabCapturePrompt() {
    if (this._mode === CaptureMode.TAB_CAPTURE) {
      return false;
    }
    if (this._mode === CaptureMode.FAST_CAPTURE) {
      return false;
    }
    const limitations = this._capabilities?.limitations || [];
    const mediaCount = this._capabilities?.mediaCount || 0;
    if (limitations.length > 0) {
      return true;
    }
    if (this._mode === CaptureMode.INTERCEPTOR && mediaCount === 0) {
      return true;
    }
    return false;
  }
  getModeDescription() {
    switch (this._mode) {
     case CaptureMode.DEFAULT:
      return "Standard audio capture";

     case CaptureMode.INTERCEPTOR:
      return "AudioContext interception";

     case CaptureMode.FAST_CAPTURE:
      return "Fast Capture mode";

     case CaptureMode.TAB_CAPTURE:
      return "Tab Capture mode";

     default:
      return "Unknown";
    }
  }
  onModeChange(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }
  _notifyListeners(newMode, previousMode) {
    this._listeners.forEach(cb => {
      try {
        cb(newMode, previousMode);
      } catch (e) {
        console.error("CaptureRouter: Listener error", e);
      }
    });
  }
  getState() {
    return {
      mode: this._mode,
      tabId: this._tabId,
      capabilities: this._capabilities
    };
  }
}

window.CaptureMode = CaptureMode;

window.BrowserInfo = BrowserInfo;

window.captureRouter = new CaptureRouter;

console.log("CaptureRouter: Browser:", BrowserInfo.getBrowserName(), "| Available modes:", BrowserInfo.getAvailableModes());