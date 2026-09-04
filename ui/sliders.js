function refreshSliderColors() {
  updateVolumeSlider();
  updatePitchSlider();
  updateSpeedSlider();
  updateReverbSlider();
  if (settings.sliderStyle === "pill") {
    updatePillSliders();
  }
}

function updateVolumeSlider() {
  const fillPercent = volumeToPosition(settings.volume) * 100;
  const isAtCenter = settings.volume === 100;
  volumeFill.style.width = fillPercent + "%";
  volumeTextClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const text = formatVolume(settings.volume);
  volumeTextBase.textContent = text;
  volumeTextClip.textContent = text;
  if (isAtCenter) {
    volumeFill.style.background = "";
    volumeSlider.style.background = "";
    volumeTextBase.style.color = "";
  } else {
    const brightColor = getVolumeColor(settings.volume, false);
    const darkColor = getVolumeColor(settings.volume, true);
    volumeFill.style.background = brightColor;
    volumeSlider.style.background = darkColor;
    volumeTextBase.style.color = brightColor;
  }
  volumeSlider.classList.toggle("at-center", isAtCenter);
}

function updatePitchSlider() {
  const fillPercent = (settings.pitch + 12) / 24 * 100;
  const isAtCenter = settings.pitch === 0;
  pitchFill.style.width = fillPercent + "%";
  pitchTextClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const text = formatPitch(settings.pitch);
  pitchTextBase.textContent = text;
  pitchTextClip.textContent = text;
  if (isAtCenter) {
    pitchFill.style.background = "";
    pitchSlider.style.background = "";
    pitchTextBase.style.color = "";
  } else {
    const brightColor = getPitchColor(settings.pitch, false);
    const darkColor = getPitchColor(settings.pitch, true);
    pitchFill.style.background = brightColor;
    pitchSlider.style.background = darkColor;
    pitchTextBase.style.color = brightColor;
  }
  pitchSlider.classList.toggle("at-center", isAtCenter);
}

function updateSpeedSlider() {
  const fillPercent = speedToPosition(settings.speed) * 100;
  const isAtCenter = settings.speed === 100;
  speedFill.style.width = fillPercent + "%";
  speedTextClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const text = formatSpeed(settings.speed);
  speedTextBase.textContent = text;
  speedTextClip.textContent = text;
  if (isAtCenter) {
    speedFill.style.background = "";
    speedSlider.style.background = "";
    speedTextBase.style.color = "";
  } else {
    const brightColor = getSpeedColor(settings.speed, false);
    const darkColor = getSpeedColor(settings.speed, true);
    speedFill.style.background = brightColor;
    speedSlider.style.background = darkColor;
    speedTextBase.style.color = brightColor;
  }
  speedSlider.classList.toggle("at-center", isAtCenter);
}

function updateReverbSlider() {
  const fillPercent = settings.reverbAmount;
  reverbFill.style.width = fillPercent + "%";
  reverbTextClip.style.clipPath = `inset(0 ${100 - fillPercent}% 0 0)`;
  const text = formatReverb(settings.reverbAmount);
  reverbTextBase.textContent = text;
  reverbTextClip.textContent = text;
  const brightColor = getReverbColor(settings.reverbAmount, false);
  const darkColor = getReverbColor(settings.reverbAmount, true);
  reverbFill.style.background = brightColor;
  reverbSlider.style.background = darkColor;
  reverbTextBase.style.color = brightColor;
  if (settings.reverbAmount === 50) {
    reverbSlider.classList.add("at-center");
  } else {
    reverbSlider.classList.remove("at-center");
  }
  reverbToggle.checked = settings.reverbEnabled;
  const reverbMinusBtn = document.getElementById("reverb-minus");
  const reverbPlusBtn = document.getElementById("reverb-plus");
  const reverbResetBtn = document.getElementById("reverb-reset");
  if (settings.reverbEnabled) {
    reverbSlider.classList.remove("disabled");
    reverbMinusBtn.classList.remove("disabled");
    reverbPlusBtn.classList.remove("disabled");
    reverbResetBtn.classList.remove("disabled");
  } else {
    reverbSlider.classList.add("disabled");
    reverbMinusBtn.classList.add("disabled");
    reverbPlusBtn.classList.add("disabled");
    reverbResetBtn.classList.add("disabled");
  }
}

function setupSliderDrag(sliderEl, type) {
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
      updateVolumeSlider();
    } else if (type === "pitch") {
      settings.pitch = Math.max(-12, Math.min(12, snapped));
      if (typeof applyAutoSpeedForPitch === "function") applyAutoSpeedForPitch();
      updateUI();
    } else if (type === "speed") {
      settings.speed = Math.max(25, Math.min(200, snapped));
      updateSpeedSlider();
    } else if (type === "reverb") {
      settings.reverbAmount = Math.max(0, Math.min(100, snapped));
      if (!settings.reverbEnabled) {
        settings.reverbEnabled = true;
        reverbToggle.checked = true;
        if (reverbPillToggle) reverbPillToggle.checked = true;
      }
      updateReverbSlider();
    }
    updateShortcutSelection();
    sendSettings();
  };
  sliderEl.addEventListener("mousedown", e => {
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
    dragging = true;
    sliderEl.classList.add("dragging");
    onDrag(e.clientX);
    e.preventDefault();
  });
  document.addEventListener("mousemove", e => {
    if (dragging) onDrag(e.clientX);
  });
  document.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      sliderEl.classList.remove("dragging");
      showNewQuote();
    }
  });
  sliderEl.addEventListener("touchstart", e => {
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
    dragging = true;
    sliderEl.classList.add("dragging");
    onDrag(e.touches[0].clientX);
    e.preventDefault();
  }, {
    passive: false
  });
  document.addEventListener("touchmove", e => {
    if (dragging) onDrag(e.touches[0].clientX);
  });
  document.addEventListener("touchend", () => {
    if (dragging) {
      dragging = false;
      sliderEl.classList.remove("dragging");
      showNewQuote();
    }
  });
}

function updateSpeedSliderDisabled(isDisabled) {
  const speedGroup = document.getElementById("speed-group");
  if (speedGroup) {
    speedGroup.classList.toggle("speed-disabled", isDisabled);
  }
}

window.refreshSliderColors = refreshSliderColors;

window.updateVolumeSlider = updateVolumeSlider;

window.updatePitchSlider = updatePitchSlider;

window.updateSpeedSlider = updateSpeedSlider;

window.updateReverbSlider = updateReverbSlider;

window.setupSliderDrag = setupSliderDrag;

window.updateSpeedSliderDisabled = updateSpeedSliderDisabled;