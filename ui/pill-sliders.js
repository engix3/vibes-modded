const SLIDER_EMOJI_CONFIG = {
  useSvg: true,
  icons: {
    volume: {
      emoji: "🔊",
      svg: "resources/emoji/sliders/volume.svg"
    },
    pitch: {
      emoji: "🎵",
      svg: "resources/emoji/sliders/pitch.svg"
    },
    speed: {
      emoji: "⚡",
      svg: "resources/emoji/sliders/speed.svg"
    },
    reverb: {
      emoji: "✨",
      svg: "resources/emoji/sliders/reverb.svg"
    }
  }
};

function renderSliderEmojis() {
  const groups = document.querySelectorAll(".pill-slider-group[data-slider]");
  groups.forEach(group => {
    const type = group.dataset.slider;
    const el = group.querySelector(".pill-slider-emoji");
    const config = SLIDER_EMOJI_CONFIG.icons[type];
    if (!el || !config) return;
    if (SLIDER_EMOJI_CONFIG.useSvg && config.svg) {
      el.innerHTML = "";
      const img = document.createElement("img");
      img.src = config.svg;
      img.alt = config.emoji;
      img.className = "pill-emoji-svg";
      img.draggable = false;
      el.appendChild(img);
    } else {
      el.textContent = config.emoji;
    }
  });
}

async function saveSliderStylePreference() {
  await chrome.storage.local.set({
    freePitch_sliderStyle: settings.sliderStyle
  });
}

async function loadSliderStylePreference() {
  const data = await chrome.storage.local.get("freePitch_sliderStyle");
  settings.sliderStyle = data.freePitch_sliderStyle || "pill";
  applySliderStyle();
}

function applySliderStyle() {
  document.body.classList.toggle("classic-slider-mode", settings.sliderStyle === "classic");
  if (pillSlidersToggle) {
    pillSlidersToggle.checked = settings.sliderStyle === "classic";
  }
  if (settings.sliderStyle === "pill") {
    updatePillSliders();
    syncPillButtonActivatedState();
  }
}

function applyFineTuneState() {
  document.body.classList.toggle("fine-tune-active", settings.fineTune);
  if (settings.sliderStyle === "pill") {
    syncPillButtonActivatedState();
  }
}

function syncPillButtonActivatedState() {
  const allPillBtns = document.querySelectorAll(".pill-btn");
  if (settings.fineTune) {
    allPillBtns.forEach(btn => {
      if (btn.classList.contains("disabled")) {
        btn.classList.remove("activated");
      } else {
        btn.classList.add("activated");
      }
    });
  } else {
    allPillBtns.forEach(btn => btn.classList.remove("activated", "deactivating"));
  }
}

function updatePillSliders() {
  updatePillVolumeSlider();
  updatePillPitchSlider();
  updatePillSpeedSlider();
  updatePillReverbSlider();
  if (volumePillGroup) volumePillGroup.classList.toggle("active", settings.enabled);
  if (pitchPillGroup) pitchPillGroup.classList.toggle("active", settings.enabled);
  if (speedPillGroup) speedPillGroup.classList.toggle("active", settings.enabled);
  if (reverbPillGroup) reverbPillGroup.classList.toggle("active", settings.enabled);
}

function updatePillVolumeSlider() {
  if (!volumePillFill) return;
  const fillPercent = volumeToPosition(settings.volume) * 100;
  const isAtCenter = settings.volume === 100;
  volumePillFill.style.width = fillPercent + "%";
  volumePillTextClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const labelClip = document.getElementById("volume-pill-label-clip");
  if (labelClip) labelClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const text = formatVolume(settings.volume);
  volumePillTextBase.textContent = text;
  volumePillTextClip.textContent = text;
  const labelBase = document.getElementById("volume-pill-label-text");
  if (isAtCenter) {
    volumePillFill.style.background = "";
    volumePillSlider.style.background = "";
    volumePillTextBase.style.color = "";
    if (labelBase) labelBase.style.color = "";
  } else {
    const brightColor = getVolumeColor(settings.volume, false);
    const darkColor = getVolumeColor(settings.volume, true);
    volumePillFill.style.background = brightColor;
    volumePillSlider.style.background = darkColor;
    volumePillTextBase.style.color = brightColor;
    if (labelBase) labelBase.style.color = brightColor;
  }
  volumePillSlider.classList.toggle("at-center", isAtCenter);
}

function updatePillPitchSlider() {
  if (!pitchPillFill) return;
  const fillPercent = (settings.pitch + 12) / 24 * 100;
  const isAtCenter = settings.pitch === 0;
  pitchPillFill.style.width = fillPercent + "%";
  pitchPillTextClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const labelClip = document.getElementById("pitch-pill-label-clip");
  if (labelClip) labelClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const text = formatPitch(settings.pitch);
  pitchPillTextBase.textContent = text;
  pitchPillTextClip.textContent = text;
  const labelBase = document.getElementById("pitch-pill-label-text");
  if (isAtCenter) {
    pitchPillFill.style.background = "";
    pitchPillSlider.style.background = "";
    pitchPillTextBase.style.color = "";
    if (labelBase) labelBase.style.color = "";
  } else {
    const brightColor = getPitchColor(settings.pitch, false);
    const darkColor = getPitchColor(settings.pitch, true);
    pitchPillFill.style.background = brightColor;
    pitchPillSlider.style.background = darkColor;
    pitchPillTextBase.style.color = brightColor;
    if (labelBase) labelBase.style.color = brightColor;
  }
  pitchPillSlider.classList.toggle("at-center", isAtCenter);
}

function updatePillSpeedSlider() {
  if (!speedPillFill) return;
  const fillPercent = speedToPosition(settings.speed) * 100;
  const isAtCenter = settings.speed === 100;
  speedPillFill.style.width = fillPercent + "%";
  speedPillTextClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const labelClip = document.getElementById("speed-pill-label-clip");
  if (labelClip) labelClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const text = formatSpeed(settings.speed);
  speedPillTextBase.textContent = text;
  speedPillTextClip.textContent = text;
  const labelBase = document.getElementById("speed-pill-label-text");
  if (isAtCenter) {
    speedPillFill.style.background = "";
    speedPillSlider.style.background = "";
    speedPillTextBase.style.color = "";
    if (labelBase) labelBase.style.color = "";
  } else {
    const brightColor = getSpeedColor(settings.speed, false);
    const darkColor = getSpeedColor(settings.speed, true);
    speedPillFill.style.background = brightColor;
    speedPillSlider.style.background = darkColor;
    speedPillTextBase.style.color = brightColor;
    if (labelBase) labelBase.style.color = brightColor;
  }
  speedPillSlider.classList.toggle("at-center", isAtCenter);
}

function updatePillReverbSlider() {
  if (!reverbPillFill) return;
  const fillPercent = settings.reverbAmount;
  reverbPillFill.style.width = fillPercent + "%";
  reverbPillTextClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const labelClip = document.getElementById("reverb-pill-label-clip");
  if (labelClip) labelClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const text = formatReverb(settings.reverbAmount);
  reverbPillTextBase.textContent = text;
  reverbPillTextClip.textContent = text;
  const brightColor = getReverbColor(settings.reverbAmount, false);
  const darkColor = getReverbColor(settings.reverbAmount, true);
  reverbPillFill.style.background = brightColor;
  reverbPillSlider.style.background = darkColor;
  reverbPillTextBase.style.color = brightColor;
  const labelBase = document.getElementById("reverb-pill-label-text");
  if (labelBase) labelBase.style.color = brightColor;
  reverbPillSlider.classList.toggle("at-center", settings.reverbAmount === 50);
  if (reverbPillToggle) reverbPillToggle.checked = settings.reverbEnabled;
  const reverbPillMinusBtn = document.getElementById("reverb-pill-minus");
  const reverbPillPlusBtn = document.getElementById("reverb-pill-plus");
  if (settings.reverbEnabled) {
    reverbPillSlider.classList.remove("disabled");
    if (reverbPillMinusBtn) reverbPillMinusBtn.classList.remove("disabled");
    if (reverbPillPlusBtn) reverbPillPlusBtn.classList.remove("disabled");
  } else {
    reverbPillSlider.classList.add("disabled");
    if (reverbPillMinusBtn) reverbPillMinusBtn.classList.add("disabled");
    if (reverbPillPlusBtn) reverbPillPlusBtn.classList.add("disabled");
  }
}

function setupPillSliderDrag(sliderEl, type) {
  if (!sliderEl) return;
  let dragging = false;
  const getValue = clientX => {
    const rect = sliderEl.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (type === "volume") {
      return positionToVolume(percent);
    } else if (type === "pitch") {
      return percent * 24 - 12;
    } else if (type === "speed") {
      return positionToSpeed(percent);
    } else if (type === "reverb") {
      return percent * 100;
    }
  };
  const snapValue = (raw, type) => {
    if (type === "volume") {
      if (settings.fineTune) {
        return Math.round(raw);
      }
      return Math.round(raw / 5) * 5;
    } else if (type === "pitch") {
      if (settings.fineTune) {
        return Math.round(raw * 100) / 100;
      }
      return Math.round(raw);
    } else if (type === "speed") {
      if (settings.fineTune) {
        return Math.round(raw);
      }
      return Math.round(raw / 5) * 5;
    } else if (type === "reverb") {
      if (settings.fineTune) {
        return Math.round(raw);
      }
      return Math.round(raw / 5) * 5;
    }
  };
  const onDrag = clientX => {
    if (type === "speed" && typeof captureRouter !== "undefined" && captureRouter.isSpeedDisabled()) {
      return;
    }
    const raw = getValue(clientX);
    const snapped = snapValue(raw, type);
    if (type === "volume") {
      settings.volume = Math.max(0, Math.min(600, snapped));
    } else if (type === "pitch") {
      settings.pitch = Math.max(-12, Math.min(12, snapped));
      if (typeof applyAutoSpeedForPitch === "function") applyAutoSpeedForPitch();
    } else if (type === "speed") {
      settings.speed = Math.max(25, Math.min(200, snapped));
    } else if (type === "reverb") {
      settings.reverbAmount = Math.max(0, Math.min(100, snapped));
      if (!settings.reverbEnabled) {
        settings.reverbEnabled = true;
        reverbToggle.checked = true;
        if (reverbPillToggle) reverbPillToggle.checked = true;
      }
    }
    updateUI();
    updatePillSliders();
    if (settings.sliderStyle === "pill") {
      syncPillButtonActivatedState();
    }
    updateShortcutSelection();
    sendSettings();
  };
  const startDrag = () => {
    dragging = true;
    sliderEl.classList.add("dragging");
  };
  const endDrag = () => {
    if (dragging) {
      dragging = false;
      sliderEl.classList.remove("dragging");
      showNewQuote();
    }
  };
  sliderEl.addEventListener("mousedown", e => {
    if (e.target.closest(".pill-btn")) return;
    if (type === "speed" && typeof captureRouter !== "undefined" && captureRouter.isSpeedDisabled()) {
      return;
    }
    if ((type === "pitch" || type === "reverb") && typeof modesUI !== "undefined" && modesUI.shouldAutoSwitchForCors()) {
      modesUI.autoSwitchToTabCapture();
    }
    if (typeof modesUI !== "undefined" && modesUI.shouldShowNoMediaPrompt()) {
      if (modesUI.isAlwaysTabEnabled() && modesUI._tabCaptureAvailable) {
        modesUI.autoSwitchToTabCapture();
      } else {
        setTimeout(() => modesUI.showModalForNoMedia(), 300);
        return;
      }
    }
    startDrag();
    onDrag(e.clientX);
    e.preventDefault();
  });
  document.addEventListener("mousemove", e => {
    if (dragging) onDrag(e.clientX);
  });
  document.addEventListener("mouseup", endDrag);
  sliderEl.addEventListener("touchstart", e => {
    if (e.target.closest(".pill-btn")) return;
    if (type === "speed" && typeof captureRouter !== "undefined" && captureRouter.isSpeedDisabled()) {
      return;
    }
    if ((type === "pitch" || type === "reverb") && typeof modesUI !== "undefined" && modesUI.shouldAutoSwitchForCors()) {
      modesUI.autoSwitchToTabCapture();
    }
    if (typeof modesUI !== "undefined" && modesUI.shouldShowNoMediaPrompt()) {
      if (modesUI.isAlwaysTabEnabled() && modesUI._tabCaptureAvailable) {
        modesUI.autoSwitchToTabCapture();
      } else {
        setTimeout(() => modesUI.showModalForNoMedia(), 300);
        return;
      }
    }
    startDrag();
    onDrag(e.touches[0].clientX);
    e.preventDefault();
  }, {
    passive: false
  });
  document.addEventListener("touchmove", e => {
    if (dragging) onDrag(e.touches[0].clientX);
  });
  document.addEventListener("touchend", endDrag);
}

const HOLD_DURATION = 1e3;

function setupPillButtonHold(buttonEl, sliderType, action) {
  if (!buttonEl) return;
  let holdStartTime = null;
  let holdTimeout = null;
  let isHolding = false;
  let wasDeactivating = false;
  const getCircle = () => buttonEl.querySelector(".pill-btn-hold-circle");
  const startHold = e => {
    e.preventDefault();
    holdStartTime = Date.now();
    isHolding = true;
    wasDeactivating = settings.fineTune;
    const circle = getCircle();
    if (wasDeactivating) {
      if (circle) {
        circle.style.transition = "none";
        circle.style.width = "36px";
        circle.style.height = "36px";
        circle.style.background = "#000";
        circle.offsetHeight;
        circle.style.transition = "width 1s linear, height 1s linear";
        requestAnimationFrame(() => {
          circle.style.width = "0";
          circle.style.height = "0";
        });
      }
      buttonEl.classList.add("holding", "holding-deactivate");
    } else {
      if (circle) {
        circle.style.transition = "none";
        circle.style.width = "0";
        circle.style.height = "0";
        circle.style.background = "#000";
        circle.offsetHeight;
        circle.style.transition = "width 1s linear, height 1s linear";
        requestAnimationFrame(() => {
          circle.style.width = "36px";
          circle.style.height = "36px";
        });
      }
      buttonEl.classList.add("holding");
    }
    holdTimeout = setTimeout(() => {
      if (isHolding) {
        activateFineTuneFromButton(buttonEl);
        isHolding = false;
      }
    }, HOLD_DURATION);
  };
  const cleanupHoldState = (bounceBack = false) => {
    buttonEl.classList.remove("holding", "holding-deactivate");
    const circle = getCircle();
    if (circle) {
      if (bounceBack) {
        circle.style.transition = "width 0.2s ease-out, height 0.2s ease-out";
        if (wasDeactivating) {
          circle.style.width = "36px";
          circle.style.height = "36px";
        } else {
          circle.style.width = "0";
          circle.style.height = "0";
        }
        setTimeout(() => {
          circle.style.width = "";
          circle.style.height = "";
          circle.style.transition = "";
          circle.style.background = "";
        }, 250);
      } else {
        circle.style.width = "";
        circle.style.height = "";
        circle.style.transition = "";
        circle.style.background = "";
      }
    }
  };
  const endHold = () => {
    if (!holdStartTime) return;
    const elapsed = Date.now() - holdStartTime;
    const wasHolding = isHolding;
    isHolding = false;
    if (holdTimeout) {
      clearTimeout(holdTimeout);
      holdTimeout = null;
    }
    if (elapsed < HOLD_DURATION && wasHolding) {
      cleanupHoldState(true);
      handlePillButtonClick(sliderType, action);
    } else {
      cleanupHoldState(false);
    }
    holdStartTime = null;
  };
  const cancelHold = () => {
    if (isHolding) {
      isHolding = false;
      cleanupHoldState(true);
      if (holdTimeout) {
        clearTimeout(holdTimeout);
        holdTimeout = null;
      }
    }
    holdStartTime = null;
  };
  buttonEl.addEventListener("mousedown", startHold);
  buttonEl.addEventListener("mouseup", endHold);
  buttonEl.addEventListener("mouseleave", cancelHold);
  buttonEl.addEventListener("touchstart", startHold, {
    passive: false
  });
  buttonEl.addEventListener("touchend", endHold);
  buttonEl.addEventListener("touchcancel", cancelHold);
}

function activateFineTuneFromButton(buttonEl) {
  settings.fineTune = !settings.fineTune;
  buttonEl.classList.remove("holding");
  const allPillBtns = document.querySelectorAll(".pill-btn:not(.disabled)");
  if (settings.fineTune) {
    allPillBtns.forEach(btn => {
      btn.classList.remove("deactivating");
      btn.classList.add("activated");
    });
  } else {
    allPillBtns.forEach(btn => {
      btn.classList.remove("activated");
      btn.classList.add("deactivating");
    });
    setTimeout(() => {
      allPillBtns.forEach(btn => btn.classList.remove("deactivating"));
    }, 300);
    settings.volume = Math.round(settings.volume / 5) * 5;
    settings.pitch = Math.round(settings.pitch);
    settings.speed = Math.round(settings.speed / 5) * 5;
    settings.reverbAmount = Math.round(settings.reverbAmount / 5) * 5;
  }
  fineTuneToggle.checked = settings.fineTune;
  applyFineTuneState();
  updateUI();
  if (settings.sliderStyle === "pill") updatePillSliders();
  sendSettings();
  saveFineTunePreference();
  showNotification(settings.fineTune ? "fineTuneEnabled" : "fineTuneDisabled");
}

function handlePillButtonClick(sliderType, action) {
  const step = {
    volume: settings.fineTune ? 1 : 5,
    pitch: settings.fineTune ? .01 : 1,
    speed: settings.fineTune ? 1 : 5,
    reverb: settings.fineTune ? 1 : 5
  }[sliderType];
  const multiplier = action === "plus" ? 1 : -1;
  if (sliderType === "volume") {
    settings.volume = Math.max(0, Math.min(600, settings.volume + step * multiplier));
  } else if (sliderType === "pitch") {
    settings.pitch = Math.max(-12, Math.min(12, settings.pitch + step * multiplier));
    settings.pitch = Math.round(settings.pitch * 100) / 100;
    if (typeof applyAutoSpeedForPitch === "function") applyAutoSpeedForPitch();
  } else if (sliderType === "speed") {
    settings.speed = Math.max(25, Math.min(200, settings.speed + step * multiplier));
  } else if (sliderType === "reverb") {
    settings.reverbAmount = Math.max(0, Math.min(100, settings.reverbAmount + step * multiplier));
  }
  updateUI();
  if (settings.sliderStyle === "pill") updatePillSliders();
  updateShortcutSelection();
  sendSettings();
  showNewQuote();
}

function updatePillSpeedSliderDisabled(isDisabled) {
  const speedPillGroup = document.getElementById("speed-pill-group");
  if (speedPillGroup) {
    speedPillGroup.classList.toggle("speed-disabled", isDisabled);
  }
}

window.saveSliderStylePreference = saveSliderStylePreference;

window.loadSliderStylePreference = loadSliderStylePreference;

window.applySliderStyle = applySliderStyle;

window.applyFineTuneState = applyFineTuneState;

window.syncPillButtonActivatedState = syncPillButtonActivatedState;

window.updatePillSliders = updatePillSliders;

window.updatePillVolumeSlider = updatePillVolumeSlider;

window.updatePillPitchSlider = updatePillPitchSlider;

window.updatePillSpeedSlider = updatePillSpeedSlider;

window.updatePillReverbSlider = updatePillReverbSlider;

window.setupPillSliderDrag = setupPillSliderDrag;

window.setupPillButtonHold = setupPillButtonHold;

window.activateFineTuneFromButton = activateFineTuneFromButton;

window.handlePillButtonClick = handlePillButtonClick;

window.updatePillSpeedSliderDisabled = updatePillSpeedSliderDisabled;

window.SLIDER_EMOJI_CONFIG = SLIDER_EMOJI_CONFIG;

window.renderSliderEmojis = renderSliderEmojis;