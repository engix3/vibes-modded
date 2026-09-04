class ModesUI {
  constructor() {
    this.modesBtn = document.getElementById("modes-btn");
    this.modesEmoji = document.getElementById("modes-emoji");
    this.modesDropdown = document.getElementById("modes-dropdown");
    this.modesOptions = document.querySelectorAll(".modes-option");
    this.overlay = document.getElementById("tab-capture-overlay");
    this.enableBtn = document.getElementById("tab-capture-enable");
    this.dismissBtn = document.getElementById("tab-capture-dismiss");
    this.alwaysCheckbox = document.getElementById("tab-capture-always");
    this.alwaysTabToggle = document.getElementById("always-tab-toggle");
    this.alwaysTabRow = document.getElementById("always-tab-row");
    this.modalTitle = document.querySelector(".tab-capture-modal-title");
    this.modalText = document.querySelector(".tab-capture-modal-text");
    this.dismissed = false;
    this._alwaysTabEnabled = false;
    this._showingNoMedia = false;
    this._showingLimitations = false;
    this._tabCaptureAvailable = BrowserInfo.isModeAvailable(CaptureMode.TAB_CAPTURE);
    this._mediaPollingInterval = null;
    this._autoSwitchAttempted = false;
    this._onEnabled = null;
    this._onDisabled = null;
    this._hideUnavailableFeatures();
    this._bindEvents();
    this._loadAlwaysTabSetting();
  }
  _hideUnavailableFeatures() {
    if (!this._tabCaptureAvailable) {
      console.log("ModesUI: Tab Capture not available, hiding related UI");
      const tabCaptureOption = document.querySelector('.modes-option[data-mode="tabcapture"]');
      if (tabCaptureOption) tabCaptureOption.style.display = "none";
      if (this.alwaysTabRow) this.alwaysTabRow.style.display = "none";
    }
  }
  isTabCaptureAvailable() {
    return this._tabCaptureAvailable;
  }
  _bindEvents() {
    this.enableBtn?.addEventListener("click", () => this.enable());
    this.dismissBtn?.addEventListener("click", () => this.dismiss());
    this.overlay?.addEventListener("click", e => {
      if (e.target === this.overlay && !this._showingLimitations) {
        this.dismissWithoutSaving();
      }
    });
    this.modesOptions.forEach(option => {
      option.addEventListener("click", e => {
        e.stopPropagation();
        const mode = option.dataset.mode;
        this._handleModeSelect(mode);
      });
    });
    this.modesBtn?.addEventListener("click", e => {
      if (e.target === this.modesBtn || e.target === this.modesEmoji) {
        if (captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
          this.disable();
        }
      }
    });
    this.alwaysTabToggle?.addEventListener("change", () => {
      this._saveAlwaysTabSetting(this.alwaysTabToggle.checked);
    });
    this.alwaysTabRow?.addEventListener("click", e => {
      if (!e.target.closest(".toggle")) {
        this.alwaysTabToggle.checked = !this.alwaysTabToggle.checked;
        this.alwaysTabToggle.dispatchEvent(new Event("change"));
      }
    });
  }
  async _loadAlwaysTabSetting() {
    try {
      const result = await chrome.storage.local.get("freePitch_alwaysTabCapture");
      this._alwaysTabEnabled = result.freePitch_alwaysTabCapture ?? true;
      if (this.alwaysCheckbox) this.alwaysCheckbox.checked = this._alwaysTabEnabled;
      if (this.alwaysTabToggle) this.alwaysTabToggle.checked = this._alwaysTabEnabled;
    } catch (e) {
      console.warn("ModesUI: Error loading always tab setting:", e);
      this._alwaysTabEnabled = true;
    }
  }
  async _saveAlwaysTabSetting(enabled) {
    this._alwaysTabEnabled = enabled;
    if (this.alwaysCheckbox) this.alwaysCheckbox.checked = enabled;
    if (this.alwaysTabToggle) this.alwaysTabToggle.checked = enabled;
    try {
      await chrome.storage.local.set({
        freePitch_alwaysTabCapture: enabled
      });
      console.log("ModesUI: Always Tab setting saved:", enabled);
    } catch (e) {
      console.warn("ModesUI: Error saving always tab setting:", e);
    }
  }
  isAlwaysTabEnabled() {
    return this._alwaysTabEnabled;
  }
  _handleModeSelect(mode) {
    switch (mode) {
     case "default":
      if (captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
        this.disable();
      } else if (captureRouter.isMode(CaptureMode.FAST_CAPTURE)) {
        captureRouter.setMode(CaptureMode.DEFAULT);
        this.updateModesButton();
        console.log("ModesUI: Switched from Fast Capture to Default mode");
      }
      break;

     case "tabcapture":
      if (!captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
        this.enable();
      }
      break;

     case "fastcapture":
      if (captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
        this.disable();
      }
      captureRouter.setMode(CaptureMode.FAST_CAPTURE);
      this.updateModesButton();
      console.log("ModesUI: Fast Capture mode enabled");
      break;

     case "interceptor":
      console.log("ModesUI: Interceptor mode is deprecated, use Fast Capture instead");
      break;
    }
  }
  updateModesButton() {
    const mode = captureRouter.getMode();
    const hasWarning = captureRouter.shouldShowTabCapturePrompt() && !this.dismissed;
    const hasMedia = captureRouter.hasActiveMedia();
    this.modesBtn?.classList.remove("warning", "active-tab", "media-detected");
    if (captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
      this.modesEmoji.textContent = "📋";
      this.modesBtn?.classList.add("active-tab");
    } else if (captureRouter.isMode(CaptureMode.FAST_CAPTURE)) {
      this.modesEmoji.textContent = "⚡";
      if (hasMedia) {
        this.modesBtn?.classList.add("media-detected");
      }
    } else if (hasWarning) {
      this.modesEmoji.textContent = "⚠️";
      this.modesBtn?.classList.add("warning");
    } else if (hasMedia && captureRouter.isMode(CaptureMode.DEFAULT)) {
      this.modesEmoji.textContent = "🎵";
      this.modesBtn?.classList.add("media-detected");
    } else {
      this.modesEmoji.textContent = "🎵";
    }
    const defaultHasMedia = captureRouter._defaultMediaCount > 0;
    const fastCaptureAvailable = captureRouter._capabilities?.fastCaptureActive || captureRouter._fastMediaCount > 0;
    this.modesOptions.forEach(option => {
      const optionMode = option.dataset.mode;
      if (optionMode === "default" && mode === CaptureMode.DEFAULT) {
        option.classList.add("active");
      } else if (optionMode === "tabcapture" && mode === CaptureMode.TAB_CAPTURE) {
        option.classList.add("active");
      } else if (optionMode === "interceptor" && mode === CaptureMode.INTERCEPTOR) {
        option.classList.add("active");
      } else if (optionMode === "fastcapture" && mode === CaptureMode.FAST_CAPTURE) {
        option.classList.add("active");
      } else {
        option.classList.remove("active");
      }
      if (optionMode === "default") {
        option.style.display = defaultHasMedia ? "" : "none";
      } else if (optionMode === "fastcapture") {
        option.style.display = fastCaptureAvailable ? "" : "none";
      }
    });
  }
  setWarningState(hasWarning) {
    if (hasWarning && !this.dismissed && !captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
      this.modesEmoji.textContent = "⚠️";
      this.modesBtn?.classList.add("warning");
    } else {
      this.updateModesButton();
    }
  }
  static ENABLE_BUTTON_DELAY=3250;
  _delayEnableButton() {
    if (!this.enableBtn) return;
    const originalText = this.enableBtn.textContent;
    this.enableBtn.disabled = true;
    this.enableBtn.classList.add("delayed");
    const startTime = Date.now();
    const totalDelay = ModesUI.ENABLE_BUTTON_DELAY;
    const updateCountdown = () => {
      if (!this.enableBtn) return;
      const elapsed = Date.now() - startTime;
      const remaining = totalDelay - elapsed;
      if (remaining <= 0) {
        this.enableBtn.disabled = false;
        this.enableBtn.classList.remove("delayed");
        this.enableBtn.textContent = originalText;
        return;
      }
      const remainingSeconds = remaining / 1e3;
      let displaySeconds;
      if (remainingSeconds < .5) {
        displaySeconds = 0;
      } else if (remainingSeconds < 1) {
        displaySeconds = 1;
      } else {
        displaySeconds = Math.floor(remainingSeconds);
      }
      this.enableBtn.textContent = `${displaySeconds}s`;
      setTimeout(updateCountdown, 100);
    };
    updateCountdown();
  }
  showModal() {
    if (!this._tabCaptureAvailable) {
      return false;
    }
    if (captureRouter.isMode(CaptureMode.TAB_CAPTURE) || this.dismissed) {
      return false;
    }
    this.overlay?.classList.add("visible");
    this.modesBtn?.classList.add("overlay-visible");
    this._delayEnableButton();
    this.updateModesButton();
    return true;
  }
  hideModal() {
    this._stopMediaPolling();
    this.overlay?.classList.remove("visible");
    this.modesBtn?.classList.remove("overlay-visible");
    this.modesBtn?.classList.remove("dropdown-disabled");
    if (this._showingNoMedia || this._showingLimitations) {
      this._showingNoMedia = false;
      this._showingLimitations = false;
      if (this.modalTitle) this.modalTitle.setAttribute("data-lang", "tabCapture.title");
      if (this.modalText) this.modalText.setAttribute("data-lang", "tabCapture.description");
      if (this.dismissBtn) {
        this.dismissBtn.setAttribute("data-lang", "tabCapture.notNow");
        this.dismissBtn.classList.remove("primary");
        this.dismissBtn.classList.add("secondary");
      }
      if (this.enableBtn) {
        this.enableBtn.setAttribute("data-lang", "tabCapture.enable");
        this.enableBtn.style.display = "";
      }
      const checkboxLabel = this.overlay?.querySelector(".tab-capture-checkbox");
      if (checkboxLabel) checkboxLabel.style.display = "";
      const speedNote = this.overlay?.querySelector(".tab-capture-modal-note:not(.auto-dismiss-note)");
      if (speedNote) speedNote.style.display = "";
      const autoDismissNote = document.getElementById("auto-dismiss-note");
      if (autoDismissNote) autoDismissNote.style.display = "none";
      if (typeof langpack !== "undefined") langpack.applyToDOM();
    }
  }
  showModalForNoMedia() {
    if (!this._tabCaptureAvailable) {
      return false;
    }
    if (captureRouter.isMode(CaptureMode.TAB_CAPTURE) || this.dismissed) {
      return false;
    }
    this._showingNoMedia = true;
    if (this.modalTitle) this.modalTitle.setAttribute("data-lang", "noMedia.title");
    if (this.modalText) this.modalText.setAttribute("data-lang", "noMedia.description");
    const autoDismissNote = document.getElementById("auto-dismiss-note");
    if (autoDismissNote) autoDismissNote.style.display = "";
    if (typeof langpack !== "undefined") langpack.applyToDOM();
    if (this.alwaysCheckbox) this.alwaysCheckbox.checked = this._alwaysTabEnabled;
    this.overlay?.classList.add("visible");
    this.modesBtn?.classList.add("overlay-visible");
    this._delayEnableButton();
    this.updateModesButton();
    this._startMediaPolling();
    return true;
  }
  showModalForLimitations(langPrefix = "refreshRequired") {
    if (this.dismissed) {
      return false;
    }
    this._showingLimitations = true;
    this._limitationsLangPrefix = langPrefix;
    if (this.modalTitle) this.modalTitle.setAttribute("data-lang", `${langPrefix}.title`);
    if (this.modalText) this.modalText.setAttribute("data-lang", `${langPrefix}.description`);
    if (this.dismissBtn) {
      this.dismissBtn.setAttribute("data-lang", `${langPrefix}.reload`);
      this.dismissBtn.classList.remove("secondary");
      this.dismissBtn.classList.add("primary");
    }
    if (this.enableBtn) this.enableBtn.style.display = "none";
    const checkboxLabel = this.overlay?.querySelector(".tab-capture-checkbox");
    if (checkboxLabel) checkboxLabel.style.display = "none";
    const speedNote = this.overlay?.querySelector(".tab-capture-modal-note");
    if (speedNote) speedNote.style.display = "none";
    if (typeof langpack !== "undefined") langpack.applyToDOM();
    this.overlay?.classList.add("visible");
    this.modesBtn?.classList.add("overlay-visible");
    this.modesBtn?.classList.add("dropdown-disabled");
    this.updateModesButton();
    this._startMediaPolling();
    return true;
  }
  async reloadTab() {
    const tabId = captureRouter._tabId;
    if (tabId) {
      this.hideModal();
      chrome.tabs.reload(tabId);
      setTimeout(() => window.close(), 100);
    }
  }
  showPrompt() {
    return this.showModal();
  }
  hidePrompt() {
    this.hideModal();
  }
  async enable() {
    const tabId = captureRouter._tabId;
    if (!tabId) {
      console.error("ModesUI: No tab ID set");
      return false;
    }
    await this._saveAlwaysTabSetting(this.alwaysCheckbox?.checked ?? false);
    try {
      const response = await chrome.runtime.sendMessage({
        type: "START_TAB_CAPTURE",
        tabId: tabId
      });
      if (response?.success) {
        captureRouter.setMode(CaptureMode.TAB_CAPTURE);
        this.hideModal();
        this.updateModesButton();
        if (this._onEnabled) {
          await this._onEnabled();
        }
        console.log("ModesUI: Tab Capture enabled for tab", tabId);
        return true;
      } else {
        console.error("ModesUI: Failed to enable:", response?.error);
        alert("Failed to enable Tab Capture: " + (response?.error || "Unknown error"));
        return false;
      }
    } catch (e) {
      console.error("ModesUI: Error enabling:", e);
      alert("Error enabling Tab Capture: " + e.message);
      return false;
    }
  }
  async enableSilent() {
    const tabId = captureRouter._tabId;
    if (!tabId) {
      console.error("ModesUI: No tab ID set for silent enable");
      return false;
    }
    if (captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
      return true;
    }
    try {
      const response = await chrome.runtime.sendMessage({
        type: "START_TAB_CAPTURE",
        tabId: tabId
      });
      if (response?.success) {
        captureRouter.setMode(CaptureMode.TAB_CAPTURE);
        this.updateModesButton();
        if (this._onEnabled) {
          await this._onEnabled();
        }
        console.log("ModesUI: Tab Capture silently enabled for tab", tabId);
        return true;
      } else {
        console.error("ModesUI: Silent enable failed:", response?.error);
        return false;
      }
    } catch (e) {
      console.error("ModesUI: Error in silent enable:", e);
      return false;
    }
  }
  async autoSwitchToTabCapture() {
    if (!this._tabCaptureAvailable) return false;
    if (captureRouter.isMode(CaptureMode.TAB_CAPTURE)) return false;
    if (this._autoSwitchAttempted) return false;
    this._autoSwitchAttempted = true;
    if (typeof settings !== "undefined") settings.corsTabCapture = true;
    if (this._alwaysTabEnabled) {
      console.log("ModesUI: Auto-switching to Tab Capture (Always Tab ON, silent)");
      return await this.enableSilent();
    } else {
      console.log("ModesUI: Auto-switching to Tab Capture (Always Tab OFF, showing modal)");
      return this.showModalForNoMedia();
    }
  }
  shouldAutoSwitchForCors() {
    return captureRouter.isCorsLimited() && !this.dismissed && !this._autoSwitchAttempted;
  }
  async disable() {
    const tabId = captureRouter._tabId;
    if (!tabId) {
      console.error("ModesUI: No tab ID set");
      return false;
    }
    try {
      await chrome.runtime.sendMessage({
        type: "STOP_TAB_CAPTURE",
        tabId: tabId
      });
      const defaultHasMedia = captureRouter._defaultMediaCount > 0;
      const fastHasMedia = captureRouter._fastMediaCount > 0;
      if (defaultHasMedia) {
        captureRouter.setMode(CaptureMode.DEFAULT);
        console.log("ModesUI: Tab Capture disabled, returning to Default mode (has media)");
      } else if (fastHasMedia) {
        captureRouter.setMode(CaptureMode.FAST_CAPTURE);
        console.log("ModesUI: Tab Capture disabled, returning to Fast Capture mode (has media)");
      } else {
        captureRouter.setMode(CaptureMode.FAST_CAPTURE);
        console.log("ModesUI: Tab Capture disabled, defaulting to Fast Capture mode");
      }
      this.updateModesButton();
      if (this._onDisabled) {
        await this._onDisabled();
      }
      return true;
    } catch (e) {
      console.error("ModesUI: Error disabling:", e);
      return false;
    }
  }
  dismiss() {
    if (this._showingLimitations) {
      this.reloadTab();
      return;
    }
    this._saveAlwaysTabSetting(this.alwaysCheckbox?.checked ?? false);
    this._dismissModal();
  }
  dismissWithoutSaving() {
    this._dismissModal();
  }
  _dismissModal() {
    this.dismissed = true;
    this.hideModal();
    this.updateModesButton();
    console.log("ModesUI: Modal dismissed");
  }
  async checkIfActive(tabId) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "IS_TAB_CAPTURE_ACTIVE",
        tabId: tabId
      });
      if (response?.active) {
        captureRouter.setMode(CaptureMode.TAB_CAPTURE);
        this.updateModesButton();
        return true;
      }
      return false;
    } catch (e) {
      console.warn("ModesUI: Error checking status:", e);
      return false;
    }
  }
  onEnabled(callback) {
    this._onEnabled = callback;
  }
  onDisabled(callback) {
    this._onDisabled = callback;
  }
  isActive() {
    return captureRouter.isMode(CaptureMode.TAB_CAPTURE);
  }
  isDismissed() {
    return this.dismissed;
  }
  resetDismissed() {
    this.dismissed = false;
  }
  showActive() {
    this.updateModesButton();
  }
  hideActive() {
    this.updateModesButton();
  }
  setMediaCount(count, fastCount = undefined) {
    const previousDefaultCount = captureRouter._defaultMediaCount;
    const previousFastCount = captureRouter._fastMediaCount;
    const hadNoMedia = captureRouter.getActiveMediaCount() === 0;
    captureRouter.setMediaCount(CaptureMode.DEFAULT, count);
    if (fastCount !== undefined) {
      captureRouter.setMediaCount(CaptureMode.FAST_CAPTURE, fastCount);
    }
    const defaultJustDetected = previousDefaultCount === 0 && count > 0;
    const fastJustDetected = previousFastCount === 0 && (fastCount || 0) > 0;
    const modalVisible = this.overlay?.classList.contains("visible");
    const shouldDismiss = modalVisible && (defaultJustDetected || fastJustDetected);
    console.log("ModesUI.setMediaCount:", {
      count: count,
      fastCount: fastCount,
      previousDefaultCount: previousDefaultCount,
      previousFastCount: previousFastCount,
      hadNoMedia: hadNoMedia,
      defaultJustDetected: defaultJustDetected,
      fastJustDetected: fastJustDetected,
      _showingNoMedia: this._showingNoMedia,
      _showingLimitations: this._showingLimitations,
      modalVisible: modalVisible,
      shouldDismiss: shouldDismiss
    });
    if (shouldDismiss) {
      if (fastJustDetected && (fastCount || 0) > 0) {
        if (!captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
          captureRouter.setMode(CaptureMode.FAST_CAPTURE);
          console.log("ModesUI: Fast Capture detected media, switching to Fast Capture mode");
        }
        this._showDetectedAndFadeOut();
      } else if (defaultJustDetected && count > 0) {
        if (!captureRouter.isMode(CaptureMode.TAB_CAPTURE)) {
          captureRouter.setMode(CaptureMode.DEFAULT);
          console.log("ModesUI: Default mode detected media, switching to Default mode");
        }
        this._showDetectedAndFadeOut();
      }
    }
    this.updateModesButton();
  }
  getMediaCount() {
    return captureRouter.getActiveMediaCount();
  }
  shouldShowNoMediaPrompt() {
    return captureRouter.shouldShowNoMediaPrompt() && !this.dismissed;
  }
  dismissNoMediaPrompt() {
    captureRouter.dismissNoMediaPrompt();
  }
  _startMediaPolling() {
    this._stopMediaPolling();
    const tabId = captureRouter._tabId;
    if (!tabId) return;
    console.log("ModesUI: Starting media polling");
    this._mediaPollingInterval = setInterval(async () => {
      if (!this.overlay?.classList.contains("visible")) {
        this._stopMediaPolling();
        return;
      }
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          type: "GET_STATE"
        });
        if (response?.success) {
          const count = response.mediaCount || 0;
          const fastCount = response.fastMediaCount || 0;
          console.log("ModesUI: Media poll result:", {
            count: count,
            fastCount: fastCount
          });
          this.setMediaCount(count, fastCount);
        }
      } catch (e) {
        console.log("ModesUI: Media poll error:", e.message);
        this._stopMediaPolling();
      }
    }, 500);
  }
  _stopMediaPolling() {
    if (this._mediaPollingInterval) {
      console.log("ModesUI: Stopping media polling");
      clearInterval(this._mediaPollingInterval);
      this._mediaPollingInterval = null;
    }
  }
  _showDetectedAndFadeOut() {
    this._stopMediaPolling();
    const autoDismissNote = document.getElementById("auto-dismiss-note");
    const autoDismissEmoji = document.getElementById("auto-dismiss-emoji");
    if (autoDismissNote && autoDismissEmoji) {
      autoDismissNote.classList.add("detected");
      autoDismissEmoji.textContent = "✅";
      console.log("ModesUI: Showing detected state");
    }
    setTimeout(() => {
      this.overlay?.classList.add("fade-out");
      console.log("ModesUI: Starting fade-out animation");
      setTimeout(() => {
        this.overlay?.classList.remove("fade-out");
        this.hideModal();
        if (autoDismissNote && autoDismissEmoji) {
          autoDismissNote.classList.remove("detected");
          autoDismissEmoji.textContent = "⚠️";
        }
        console.log("ModesUI: Modal hidden after animation");
      }, 500);
    }, 800);
  }
}

window.modesUI = new ModesUI;

window.tabCaptureUI = window.modesUI;