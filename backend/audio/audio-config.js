(function() {
  "use strict";
  window.__vibesAudioConfig = {
    jungle: {
      delayTime: .1,
      fadeTime: .05,
      bufferTime: .1,
      maxSemitones: 12,
      smoothingTime: .01,
      modulationDepth: .5
    },
    freeverb: {
      numCombs: 8,
      numAllpasses: 4,
      stereoSpread: 23,
      combTuningsL: [ 1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617 ],
      allpassTuningsL: [ 556, 441, 341, 225 ],
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
      freezeMode: .5
    },
    freeverbMapping: {
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
    },
    makeupGain: {
      pitchOnly: 1.2625,
      pitchPlusReverb: 1.29
    }
  };
  window.dispatchEvent(new CustomEvent("vibes_audioConfigReady"));
  if (window.__vibesDebug) {
    console.log("[Vibes] Audio config loaded:", window.__vibesAudioConfig);
  }
})();