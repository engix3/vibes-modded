class Freeverb {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.enabled = false;
    this._amount = 50;
    this._workletReady = false;
    this._workletNode = null;
    this._pendingMessages = [];
    this._mapping = window.__vibesAudioConfig?.freeverbMapping || {
      roomSizeScale: .29,
      dampingWarm: .85,
      dampingMid: .7,
      dampingBright: .385,
      dampingTransition: .2,
      wetMin: .225,
      wetMax: .4,
      wetGainMultiplier: 2.2,
      dryReduction: .2,
      widthMin: .4,
      widthMax: 1
    };
    this.input = this.ctx.createGain();
    this.output = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    this.dryGain = this.ctx.createGain();
    this.wetGain.gain.value = 0;
    this.dryGain.gain.value = 1;
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);
    this._initWorklet();
  }
  async _initWorklet() {
    try {
      const processorUrl = typeof chrome !== "undefined" && chrome.runtime ? chrome.runtime.getURL("backend/audio/freeverb-processor.js") : "backend/audio/freeverb-processor.js";
      await this.ctx.audioWorklet.addModule(processorUrl);
      this._workletNode = new AudioWorkletNode(this.ctx, "freeverb-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [ 2 ]
      });
      this.input.connect(this._workletNode);
      this._workletNode.connect(this.wetGain);
      this.wetGain.connect(this.output);
      this._workletReady = true;
      this._pendingMessages.forEach(msg => {
        this._workletNode.port.postMessage(msg);
      });
      this._pendingMessages = [];
      if (this.enabled) {
        this._applyAmount(this._amount);
      }
      console.log("Freeverb: AudioWorklet initialized successfully");
    } catch (e) {
      console.warn("Freeverb: AudioWorklet failed to initialize", e);
      this._workletReady = false;
    }
  }
  _sendMessage(type, value) {
    const msg = {
      type: type,
      value: value
    };
    if (this._workletNode && this._workletReady) {
      this._workletNode.port.postMessage(msg);
    } else {
      this._pendingMessages.push(msg);
    }
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    const now = this.ctx.currentTime;
    if (enabled) {
      this._applyAmount(this._amount);
    } else {
      this.wetGain.gain.cancelScheduledValues(now);
      this.wetGain.gain.setValueAtTime(0, now);
      this.dryGain.gain.cancelScheduledValues(now);
      this.dryGain.gain.setValueAtTime(1, now);
      this._sendMessage("setWet", 0);
      this._sendMessage("mute", null);
    }
  }
  setAmount(amount) {
    this._amount = Math.max(0, Math.min(100, amount));
    if (this.enabled) {
      this._applyAmount(this._amount);
    }
  }
  getAmount() {
    return this._amount;
  }
  _applyAmount(amount) {
    const t = amount / 100;
    const now = this.ctx.currentTime;
    const m = this._mapping;
    const roomSize = t * m.roomSizeScale;
    let damping;
    if (t <= m.dampingTransition) {
      const localT = t / m.dampingTransition;
      damping = m.dampingWarm - localT * (m.dampingWarm - m.dampingMid);
    } else {
      const localT = (t - m.dampingTransition) / (1 - m.dampingTransition);
      damping = m.dampingMid - localT * (m.dampingMid - m.dampingBright);
    }
    const wetRange = m.wetMax - m.wetMin;
    const wetLevel = m.wetMin + t * wetRange;
    const widthRange = m.widthMax - m.widthMin;
    const width = m.widthMin + t * widthRange;
    this._sendMessage("setRoomSize", roomSize);
    this._sendMessage("setDamp", damping);
    this._sendMessage("setWet", wetLevel);
    this._sendMessage("setDry", 0);
    this._sendMessage("setWidth", width);
    this.wetGain.gain.setTargetAtTime(wetLevel * m.wetGainMultiplier, now, .03);
    this.dryGain.gain.setTargetAtTime(1 - wetLevel * m.dryReduction, now, .03);
  }
  setRoomSize(size) {
    this._sendMessage("setRoomSize", Math.max(0, Math.min(1, size)));
  }
  setDamping(damping) {
    this._sendMessage("setDamp", Math.max(0, Math.min(1, damping)));
  }
  setWet(wet) {
    this._sendMessage("setWet", Math.max(0, Math.min(1, wet)));
  }
  setDry(dry) {
    this._sendMessage("setDry", Math.max(0, Math.min(1, dry)));
  }
  setWidth(width) {
    this._sendMessage("setWidth", Math.max(0, Math.min(1, width)));
  }
  setFreeze(enabled) {
    this._sendMessage("setMode", enabled ? 1 : 0);
  }
  setWetDry(wet) {
    const now = this.ctx.currentTime;
    this.wetGain.gain.setTargetAtTime(wet, now, .02);
    this.dryGain.gain.setTargetAtTime(1 - wet * .25, now, .02);
  }
  mute() {
    this._sendMessage("mute", null);
  }
  connect(destination) {
    this.output.connect(destination);
    return destination;
  }
  disconnect() {
    this.output.disconnect();
  }
}

window.Freeverb = Freeverb;

if (typeof module !== "undefined" && module.exports) {
  module.exports = Freeverb;
}