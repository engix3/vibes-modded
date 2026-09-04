const TUNING = {
  numCombs: 8,
  numAllpasses: 4,
  fixedGain: .015,
  scaleWet: 3,
  scaleDry: 2,
  scaleDamp: .4,
  scaleRoom: .28,
  offsetRoom: .7,
  initialRoom: .5,
  initialDamp: .5,
  initialWet: 1 / 3,
  initialDry: 0,
  initialWidth: 1,
  initialMode: 0,
  freezeMode: .5,
  stereoSpread: 23,
  combTuningsL: [ 1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617 ],
  allpassTuningsL: [ 556, 441, 341, 225 ]
};

class CombFilter {
  constructor(bufferSize) {
    this.buffer = new Float32Array(bufferSize);
    this.bufferSize = bufferSize;
    this.bufferIndex = 0;
    this.filterStore = 0;
    this.feedback = 0;
    this.damp1 = 0;
    this.damp2 = 1;
  }
  setDamp(val) {
    this.damp1 = val;
    this.damp2 = 1 - val;
  }
  setFeedback(val) {
    this.feedback = val;
  }
  process(input) {
    let output = this.buffer[this.bufferIndex];
    if (Math.abs(output) < 1e-18) output = 0;
    this.filterStore = output * this.damp2 + this.filterStore * this.damp1;
    if (Math.abs(this.filterStore) < 1e-18) this.filterStore = 0;
    this.buffer[this.bufferIndex] = input + this.filterStore * this.feedback;
    if (++this.bufferIndex >= this.bufferSize) this.bufferIndex = 0;
    return output;
  }
  mute() {
    this.buffer.fill(0);
    this.filterStore = 0;
  }
}

class AllpassFilter {
  constructor(bufferSize) {
    this.buffer = new Float32Array(bufferSize);
    this.bufferSize = bufferSize;
    this.bufferIndex = 0;
    this.feedback = .5;
  }
  setFeedback(val) {
    this.feedback = val;
  }
  process(input) {
    let bufout = this.buffer[this.bufferIndex];
    if (Math.abs(bufout) < 1e-18) bufout = 0;
    const output = -input + bufout;
    this.buffer[this.bufferIndex] = input + bufout * this.feedback;
    if (++this.bufferIndex >= this.bufferSize) this.bufferIndex = 0;
    return output;
  }
  mute() {
    this.buffer.fill(0);
  }
}

class FreeverbProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    const sampleRatio = sampleRate / 44100;
    this.combsL = TUNING.combTuningsL.map(size => new CombFilter(Math.round(size * sampleRatio)));
    this.combsR = TUNING.combTuningsL.map(size => new CombFilter(Math.round((size + TUNING.stereoSpread) * sampleRatio)));
    this.allpassesL = TUNING.allpassTuningsL.map(size => new AllpassFilter(Math.round(size * sampleRatio)));
    this.allpassesR = TUNING.allpassTuningsL.map(size => new AllpassFilter(Math.round((size + TUNING.stereoSpread) * sampleRatio)));
    [ ...this.allpassesL, ...this.allpassesR ].forEach(ap => ap.setFeedback(.5));
    this.gain = TUNING.fixedGain;
    this.roomSize = 0;
    this.roomSize1 = 0;
    this.damp = 0;
    this.damp1 = 0;
    this.wet = 0;
    this.wet1 = 0;
    this.wet2 = 0;
    this.dry = 0;
    this.width = 1;
    this.mode = 0;
    this.setRoomSize(TUNING.initialRoom);
    this.setDamp(TUNING.initialDamp);
    this.setWet(TUNING.initialWet);
    this.setDry(TUNING.initialDry);
    this.setWidth(TUNING.initialWidth);
    this.setMode(TUNING.initialMode);
    this.mute();
    this.port.onmessage = e => this.handleMessage(e.data);
  }
  handleMessage(data) {
    switch (data.type) {
     case "setRoomSize":
      this.setRoomSize(data.value);
      break;

     case "setDamp":
      this.setDamp(data.value);
      break;

     case "setWet":
      this.setWet(data.value);
      break;

     case "setDry":
      this.setDry(data.value);
      break;

     case "setWidth":
      this.setWidth(data.value);
      break;

     case "setMode":
      this.setMode(data.value);
      break;

     case "mute":
      this.mute();
      break;
    }
  }
  update() {
    this.wet1 = this.wet * (this.width / 2 + .5);
    this.wet2 = this.wet * ((1 - this.width) / 2);
    if (this.mode >= TUNING.freezeMode) {
      this.roomSize1 = 1;
      this.damp1 = 0;
      this.gain = 0;
    } else {
      this.roomSize1 = this.roomSize;
      this.damp1 = this.damp;
      this.gain = TUNING.fixedGain;
    }
    for (let i = 0; i < TUNING.numCombs; i++) {
      this.combsL[i].setFeedback(this.roomSize1);
      this.combsR[i].setFeedback(this.roomSize1);
      this.combsL[i].setDamp(this.damp1);
      this.combsR[i].setDamp(this.damp1);
    }
  }
  setRoomSize(value) {
    this.roomSize = value * TUNING.scaleRoom + TUNING.offsetRoom;
    this.update();
  }
  setDamp(value) {
    this.damp = value * TUNING.scaleDamp;
    this.update();
  }
  setWet(value) {
    this.wet = value * TUNING.scaleWet;
    this.update();
  }
  setDry(value) {
    this.dry = value * TUNING.scaleDry;
  }
  setWidth(value) {
    this.width = value;
    this.update();
  }
  setMode(value) {
    this.mode = value;
    this.update();
  }
  mute() {
    if (this.mode >= TUNING.freezeMode) return;
    for (let i = 0; i < TUNING.numCombs; i++) {
      this.combsL[i].mute();
      this.combsR[i].mute();
    }
    for (let i = 0; i < TUNING.numAllpasses; i++) {
      this.allpassesL[i].mute();
      this.allpassesR[i].mute();
    }
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0]) {
      return true;
    }
    const inputL = input[0];
    const inputR = input[1] || input[0];
    const outputL = output[0];
    const outputR = output[1] || output[0];
    const numSamples = inputL.length;
    const combsL = this.combsL;
    const combsR = this.combsR;
    const allpassesL = this.allpassesL;
    const allpassesR = this.allpassesR;
    const numCombs = TUNING.numCombs;
    const numAllpasses = TUNING.numAllpasses;
    const gain = this.gain;
    const wet1 = this.wet1;
    const wet2 = this.wet2;
    const dry = this.dry;
    for (let n = 0; n < numSamples; n++) {
      const inp = (inputL[n] + inputR[n]) * gain;
      let outL = 0;
      let outR = 0;
      for (let i = 0; i < numCombs; i++) {
        outL += combsL[i].process(inp);
        outR += combsR[i].process(inp);
      }
      for (let i = 0; i < numAllpasses; i++) {
        outL = allpassesL[i].process(outL);
        outR = allpassesR[i].process(outR);
      }
      outputL[n] = outL * wet1 + outR * wet2 + inputL[n] * dry;
      outputR[n] = outR * wet1 + outL * wet2 + inputR[n] * dry;
    }
    return true;
  }
}

registerProcessor("freeverb-processor", FreeverbProcessor);