const VIBES_DEBUG = true;

const VIBES_PLUS_OR_DONATE_TOGGLE = false;

const MAKEUP_GAIN = 1.2625;

const MAKEUP_GAIN_PLUS_REVERB = 1.29;

if (!VIBES_DEBUG) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
}

if (typeof window !== "undefined") {
  window.VIBES_DEBUG = VIBES_DEBUG;
  window.MAKEUP_GAIN = MAKEUP_GAIN;
  window.MAKEUP_GAIN_PLUS_REVERB = MAKEUP_GAIN_PLUS_REVERB;
  window.VIBES_PLUS_OR_DONATE_TOGGLE = VIBES_PLUS_OR_DONATE_TOGGLE;
}

if (typeof globalThis !== "undefined") {
  globalThis.VIBES_DEBUG = VIBES_DEBUG;
  globalThis.MAKEUP_GAIN = MAKEUP_GAIN;
  globalThis.MAKEUP_GAIN_PLUS_REVERB = MAKEUP_GAIN_PLUS_REVERB;
  globalThis.VIBES_PLUS_OR_DONATE_TOGGLE = VIBES_PLUS_OR_DONATE_TOGGLE;
}