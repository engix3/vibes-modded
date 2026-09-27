const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const workerSource = readFileSync(join(__dirname, "../backend/tabcapture.js"), "utf8");
const offscreenSource = readFileSync(join(__dirname, "../backend/offscreen.js"), "utf8");
const extensionId = "capture-test-extension";
const extensionURL = `chrome-extension://${extensionId}/`;
const trustedSender = { id: extensionId, url: `${extensionURL}background.js` };
const quietConsole = { log() {}, warn() {}, error() {} };

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function until(predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.ok(predicate(), "Expected async lifecycle milestone was not reached");
}

function makeStream() {
  const listeners = new Set();
  const track = {
    readyState: "live",
    stops: 0,
    listeners,
    addEventListener(type, listener) { assert.equal(type, "ended"); listeners.add(listener); },
    removeEventListener(type, listener) { assert.equal(type, "ended"); listeners.delete(listener); },
    stop() { this.stops++; this.readyState = "ended"; },
    end() {
      this.readyState = "ended";
      for (const listener of [...listeners]) listener();
    }
  };
  return { track, getTracks: () => [track] };
}

function harness(options = {}) {
  const h = {
    exists: options.exists || false,
    creates: 0,
    ids: [],
    gum: [],
    streams: [],
    contexts: [],
    dsps: [],
    messages: [],
    nextToken: 0,
    jungleCount: 0,
    muteCalls: [],
    muteStore: {},
    fail: options.fail,
    createGate: options.createGate,
    resumeGate: options.resumeGate,
    closeGate: options.closeGate
  };
  const getURL = path => extensionURL + path;
  function audioNode(context, kind) {
    if (h.fail === `create:${kind}`) throw new Error(`Failed ${kind}`);
    const node = {
      kind,
      connections: [],
      disconnects: 0,
      gain: { value: 1, calls: [], setTargetAtTime(...args) { this.calls.push(args); this.value = args[0]; } },
      connect(...args) {
        if (h.fail === `connect:${kind}`) throw new Error(`Failed ${kind} connection`);
        this.connections.push(args);
        return args[0];
      },
      disconnect() { this.disconnects++; }
    };
    context.nodes.push(node);
    return node;
  }
  class AudioContext {
    constructor() {
      if (h.fail === "context") throw new Error("Failed context");
      this.state = options.suspended ? "suspended" : "running";
      this.currentTime = h.contexts.length + 4;
      this.nodes = [];
      this.closes = 0;
      this.resumes = 0;
      this.destination = {};
      h.contexts.push(this);
    }
    createGain() { return audioNode(this, "gain"); }
    createMediaStreamSource(stream) { this.stream = stream; return audioNode(this, "source"); }
    createChannelSplitter(channels) { assert.equal(channels, 2); return audioNode(this, "splitter"); }
    createChannelMerger(channels) { assert.equal(channels, 2); return audioNode(this, "merger"); }
    async resume() {
      this.resumes++;
      if (h.resumeGate) await h.resumeGate.promise;
      if (this.state !== "closed") this.state = "running";
    }
    async close() {
      this.closes++;
      this.state = "closed";
      if (h.closeGate) await h.closeGate.promise;
    }
  }
  class Jungle {
    constructor(context) {
      this.context = context;
      this.input = audioNode(context, "jungle-input");
      this.output = audioNode(context, "jungle-output");
      if (++h.jungleCount === options.failJungleAt) throw new Error("Failed Jungle constructor");
      this.disposals = 0;
      this.semitones = [];
      h.dsps.push(this);
    }
    setSemitones(value) { this.semitones.push(value); }
    dispose() {
      this.disposals++;
      this.input.disconnect();
      this.output.disconnect();
      if (h.fail === "dispose:Jungle") throw new Error("Failed Jungle disposal");
    }
  }
  class Freeverb {
    constructor(context) {
      this.context = context;
      this.input = audioNode(context, "reverb-input");
      this.output = audioNode(context, "reverb-output");
      if (h.fail === "reverb") throw new Error("Failed Freeverb constructor");
      this.disposals = 0;
      h.dsps.push(this);
    }
    setEnabled(value) { this.enabled = value; }
    setAmount(value) { this.amount = value; }
    dispose() { this.disposals++; this.input.disconnect(); this.output.disconnect(); }
  }
  h.offscreen = vm.createContext({
    console: quietConsole,
    window: { __vibesJungle: Jungle },
    AudioContext,
    Freeverb,
    MAKEUP_GAIN: 1.25,
    MAKEUP_GAIN_PLUS_REVERB: 1.5,
    navigator: {
      mediaDevices: {
        getUserMedia(constraints) {
          const gate = deferred();
          h.gum.push({ constraints, ...gate });
          if (!options.deferGum) {
            const stream = makeStream();
            h.streams.push(stream);
            gate.resolve(stream);
          }
          return gate.promise;
        }
      }
    },
    chrome: { runtime: { id: extensionId, getURL, onMessage: { addListener(listener) { h.listener = listener; } } } }
  });
  vm.runInContext(offscreenSource, h.offscreen, { filename: "backend/offscreen.js" });
  h.deliver = (message, sender = trustedSender) => {
    let response;
    const reply = deferred();
    const keepAlive = h.listener(message, sender, value => { response = value; reply.resolve(value); });
    return { keepAlive, get response() { return response; }, promise: reply.promise };
  };
  h.send = (type, tabId, extra = {}) => h.deliver({ type, tabId, ...extra }).promise;
  h.status = tabId => h.send("OFFSCREEN_GET_CAPTURE_STATUS", tabId);
  h.processor = tabId => vm.runInContext(`activeProcessors.get(${tabId})`, h.offscreen);
  h.loadWorker = () => {
    const listeners = {};
    const runtime = {
      id: extensionId,
      getURL,
      lastError: null,
      async getContexts(filter) {
        assert.equal(filter.contextTypes[0], "OFFSCREEN_DOCUMENT");
        assert.equal(filter.documentUrls[0], `${extensionURL}offscreen.html`);
        if (h.contextGate) await h.contextGate.promise;
        return h.exists ? [{ documentUrl: `${extensionURL}offscreen.html` }] : [];
      },
      async sendMessage(message) {
        h.messages.push(message);
        if (!h.exists) throw new Error("No offscreen receiver");
        const response = await h.deliver(message).promise;
        return h.replyHook ? h.replyHook(message, response) : response;
      }
    };
    const context = vm.createContext({
      console: quietConsole,
      crypto: { randomUUID: () => `operation-${++h.nextToken}` },
      chrome: {
        runtime,
        tabCapture: { getMediaStreamId(request, callback) {
          h.ids.push({ tabId: request.targetTabId, callback, runtime });
          if (!options.deferIds) callback(`stream-${h.ids.length}`);
        } },
        offscreen: { async createDocument(settings) {
          h.creates++;
          assert.equal(settings.url, "offscreen.html");
          if (h.createGate) await h.createGate.promise;
          h.exists = true;
        } },
        tabs: {
          onRemoved: { addListener(listener) { listeners.removed = listener; } },
          onUpdated: { addListener(listener) { listeners.updated = listener; } },
          update: options.trackMute ? (tabId, props, callback) => {
            h.muteCalls.push({ tabId, muted: props.muted });
            if (typeof callback === "function") callback();
          } : undefined
        },
        storage: options.trackMute ? { local: {
          async get() { return h.muteStore; },
          async set(patch) { h.muteStore = { ...h.muteStore, ...patch }; }
        } } : undefined
      }
    });
    vm.runInContext(workerSource, context, { filename: "backend/tabcapture.js" });
    return { api: context.tabCapture, listeners };
  };
  h.worker = h.loadWorker();
  return h;
}

async function active(h, tabId = 1) {
  await h.worker.api.startTabCapture(tabId);
  assert.equal(await h.worker.api.isTabCaptureActive(tabId), true);
  return h.processor(tabId);
}

function assertDisposed(h, processor) {
  assert.equal(processor.source.disconnects, 1);
  assert.equal(processor.upmix.disconnects, 1);
  assert.equal(processor.splitter.disconnects, 1);
  assert.equal(processor.merger.disconnects, 1);
  assert.equal(processor.bypassGain.disconnects, 1);
  assert.equal(processor.processedGain.disconnects, 1);
  assert.equal(processor.volumeGain.disconnects, 1);
  for (const dsp of h.dsps.filter(dsp => dsp.context === processor.jungleL.context)) {
    assert.equal(dsp.disposals, 1);
  }
}

test("status, settings and stop do not create an offscreen document", async () => {
  const h = harness();
  const status = h.worker.api.isTabCaptureActive(1);
  assert.equal(typeof status.then, "function");
  assert.equal(await status, false);
  assert.equal(await h.worker.api.updateTabCaptureSettings(1, { pitch: 2 }), false);
  assert.equal(await h.worker.api.stopTabCapture(1), false);
  assert.equal(h.creates, 0);
  assert.equal(h.messages.length, 0);
});

test("capture status becomes active only after getUserMedia and graph startup", async () => {
  const h = harness({ deferGum: true });
  const start = h.worker.api.startTabCapture(1);
  await until(() => h.gum.length === 1);
  assert.equal(await h.worker.api.isTabCaptureActive(1), false);
  assert.equal((await h.status(1)).pending, true);
  assert.equal(await h.worker.api.updateTabCaptureSettings(1, { pitch: 2 }), false);
  h.gum[0].resolve(makeStream());
  assert.equal(await start, "stream-1");
  assert.equal(await h.worker.api.isTabCaptureActive(1), true);
  assert.equal((await h.status(1)).pending, false);
  await h.worker.api.stopTabCapture(1);
});

test("a restarted worker can query, update, reuse and stop a live capture", async () => {
  const h = harness();
  const processor = await active(h);
  const context = processor.audioContext;
  h.worker = h.loadWorker();
  assert.equal(await h.worker.api.isTabCaptureActive(1), true);
  assert.equal(await h.worker.api.updateTabCaptureSettings(1, { pitch: 3, volume: .7 }), true);
  assert.equal(processor.jungleL.semitones.at(-1), 3);
  assert.equal(await h.worker.api.startTabCapture(1), "stream-1");
  assert.equal(h.ids.length, 1);
  assert.equal(h.gum.length, 1);
  assert.equal(await h.worker.api.stopTabCapture(1), true);
  assert.equal(context.closes, 1);
  assert.equal(await h.worker.api.isTabCaptureActive(1), false);
  assert.equal(await h.worker.api.updateTabCaptureSettings(1, {}), false);
});

test("tab is muted while capture runs and unmuted after stop", async () => {
  const h = harness({ trackMute: true });
  await h.worker.api.startTabCapture(7);
  assert.deepEqual(h.muteCalls, [{ tabId: 7, muted: true }]);
  await until(() => (h.muteStore["vibes_muted_tabs"] || []).includes(7));
  assert.equal(await h.worker.api.stopTabCapture(7), true);
  assert.deepEqual(h.muteCalls, [{ tabId: 7, muted: true }, { tabId: 7, muted: false }]);
  await until(() => !(h.muteStore["vibes_muted_tabs"] || []).includes(7));
});

test("duplicate starts coalesce and concurrent tabs share document creation", async () => {
  const gate = deferred();
  const h = harness({ createGate: gate });
  const first = h.worker.api.startTabCapture(1);
  assert.equal(h.worker.api.startTabCapture(1), first);
  const second = h.worker.api.startTabCapture(2);
  await until(() => h.creates === 1);
  assert.equal(h.ids.length, 0);
  gate.resolve();
  assert.deepEqual(await Promise.all([first, second]), ["stream-1", "stream-2"]);
  assert.equal(h.creates, 1);
  assert.equal(h.gum.length, 2);
  assert.notEqual(h.processor(1).audioContext, h.processor(2).audioContext);
  await Promise.all([h.worker.api.stopTabCapture(1), h.worker.api.stopTabCapture(2)]);
});

test("failed shared document creation releases the in-flight promise for retry", async () => {
  const gate = deferred();
  const h = harness({ createGate: gate });
  const a = assert.rejects(h.worker.api.startTabCapture(1), /creation failed/);
  const b = assert.rejects(h.worker.api.startTabCapture(2), /creation failed/);
  await until(() => h.creates === 1);
  gate.reject(new Error("creation failed"));
  await Promise.all([a, b]);
  h.createGate = null;
  await active(h);
  assert.equal(h.creates, 2);
  await h.worker.api.stopTabCapture(1);
});

test("an immediate stop cancels a start before any startup await", async () => {
  const h = harness();
  const canceled = assert.rejects(h.worker.api.startTabCapture(1), /canceled/);
  assert.equal(await h.worker.api.stopTabCapture(1), false);
  await canceled;
  assert.equal(h.creates, 0);
  assert.equal(h.ids.length, 0);
});

test("stop during document creation prevents stream ID acquisition", async () => {
  const gate = deferred();
  const h = harness({ createGate: gate });
  const canceled = assert.rejects(h.worker.api.startTabCapture(1), /canceled/);
  await until(() => h.creates === 1);
  await h.worker.api.stopTabCapture(1);
  gate.resolve();
  await canceled;
  assert.equal(h.ids.length, 0);
  assert.equal(h.gum.length, 0);
});

test("stop before stream ID rejects the stale start without erasing its replacement", async () => {
  const h = harness({ deferIds: true });
  const canceled = assert.rejects(h.worker.api.startTabCapture(1), /canceled/);
  await until(() => h.ids.length === 1);
  await h.worker.api.stopTabCapture(1);
  const replacement = h.worker.api.startTabCapture(1);
  await until(() => h.ids.length === 2);
  h.ids[0].callback("old-stream");
  await canceled;
  assert.equal(h.gum.length, 0);
  assert.equal(h.worker.api.startTabCapture(1), replacement);
  h.ids[1].callback("new-stream");
  assert.equal(await replacement, "new-stream");
  assert.equal(h.gum.length, 1);
  await h.worker.api.stopTabCapture(1);
});

test("getMediaStreamId failures roll back worker operations and permit retry", async () => {
  const h = harness({ deferIds: true });
  const failed = assert.rejects(h.worker.api.startTabCapture(1), /permission denied/);
  await until(() => h.ids.length === 1);
  h.ids[0].runtime.lastError = { message: "permission denied" };
  h.ids[0].callback();
  h.ids[0].runtime.lastError = null;
  await failed;
  const empty = assert.rejects(h.worker.api.startTabCapture(1), /No stream ID/);
  await until(() => h.ids.length === 2);
  h.ids[1].callback("");
  await empty;
  const retry = h.worker.api.startTabCapture(1);
  await until(() => h.ids.length === 3);
  h.ids[2].callback("retry-stream");
  await retry;
  assert.equal(h.gum.length, 1);
  await h.worker.api.stopTabCapture(1);
});

test("stop during getUserMedia disposes late streams without disturbing a newer start", async () => {
  const h = harness({ deferGum: true });
  const canceled = assert.rejects(h.worker.api.startTabCapture(1), /canceled/);
  await until(() => h.gum.length === 1);
  assert.equal(await h.worker.api.stopTabCapture(1), true);
  assert.equal((await h.status(1)).pending, false);
  const replacement = h.worker.api.startTabCapture(1);
  await until(() => h.gum.length === 2);
  const newer = makeStream();
  h.gum[1].resolve(newer);
  await replacement;
  const context = h.processor(1).audioContext;
  const older = makeStream();
  h.gum[0].resolve(older);
  await canceled;
  assert.equal(older.track.stops, 1);
  assert.equal(newer.track.stops, 0);
  assert.equal(context.closes, 0);
  assert.equal(h.contexts.length, 1);
  assert.equal(await h.worker.api.isTabCaptureActive(1), true);
  await h.worker.api.stopTabCapture(1);
});

test("a restarted worker can cancel pending offscreen getUserMedia", async () => {
  const h = harness({ deferGum: true });
  const canceled = assert.rejects(h.worker.api.startTabCapture(1), /canceled/);
  await until(() => h.gum.length === 1);
  h.worker = h.loadWorker();
  assert.equal(await h.worker.api.isTabCaptureActive(1), false);
  assert.equal(await h.worker.api.stopTabCapture(1), true);
  const stream = makeStream();
  h.gum[0].resolve(stream);
  await canceled;
  assert.equal(stream.track.stops, 1);
});

test("a restarted worker coalesces an already pending offscreen start", async () => {
  const h = harness({ deferGum: true });
  const original = h.worker.api.startTabCapture(1);
  await until(() => h.gum.length === 1);
  h.worker = h.loadWorker();
  const resumed = h.worker.api.startTabCapture(1);
  await until(() => h.messages.filter(message => message.type === "OFFSCREEN_START_CAPTURE").length === 2);
  assert.equal(h.ids.length, 1);
  assert.equal(h.gum.length, 1);
  h.gum[0].resolve(makeStream());
  assert.deepEqual(await Promise.all([original, resumed]), ["stream-1", "stream-1"]);
  await h.worker.api.stopTabCapture(1);
});

test("stop during AudioContext.resume rolls back the context and stream", async () => {
  const gate = deferred();
  const h = harness({ suspended: true, resumeGate: gate });
  const canceled = assert.rejects(h.worker.api.startTabCapture(1), /canceled/);
  await until(() => h.contexts[0]?.resumes === 1);
  await h.worker.api.stopTabCapture(1);
  assert.equal(h.contexts[0].closes, 1);
  assert.equal(h.streams[0].track.stops, 1);
  gate.resolve();
  await canceled;
  assert.equal(h.contexts[0].nodes.length, 0);
  assert.equal(h.contexts[0].closes, 1);
  assert.equal(h.streams[0].track.listeners.size, 0);
});

test("getUserMedia rejection removes pending ownership and allows a retry", async () => {
  const h = harness({ deferGum: true });
  const failed = assert.rejects(h.worker.api.startTabCapture(1), /media denied/);
  await until(() => h.gum.length === 1);
  h.gum[0].reject(new Error("media denied"));
  await failed;
  assert.equal((await h.status(1)).pending, false);
  const retry = h.worker.api.startTabCapture(1);
  await until(() => h.gum.length === 2);
  h.gum[1].resolve(makeStream());
  await retry;
  await h.worker.api.stopTabCapture(1);
});

test("AudioContext.resume rejection closes the context and stops its stream", async () => {
  const gate = deferred();
  const h = harness({ suspended: true, resumeGate: gate });
  const failed = assert.rejects(h.worker.api.startTabCapture(1), /resume failed/);
  await until(() => h.contexts.length === 1);
  gate.reject(new Error("resume failed"));
  await failed;
  assert.equal(h.contexts[0].closes, 1);
  assert.equal(h.streams[0].track.stops, 1);
  assert.equal((await h.status(1)).captureId, null);
});

for (const failure of ["context", "create:source", "reverb", "connect:merger"]) {
  test(`startup failure (${failure}) releases all acquired resources`, async () => {
    const h = harness({ fail: failure });
    await assert.rejects(h.worker.api.startTabCapture(1), /Failed/);
    assert.equal(h.streams[0].track.stops, 1);
    assert.equal(h.streams[0].track.listeners.size, 0);
    for (const context of h.contexts) assert.equal(context.closes, 1);
    for (const dsp of h.dsps) assert.equal(dsp.disposals, 1);
    const status = await h.status(1);
    assert.equal(status.active, false);
    assert.equal(status.pending, false);
    h.fail = null;
    await active(h);
    await h.worker.api.stopTabCapture(1);
  });
}

test("a partial Jungle constructor failure disposes earlier DSP and closes the graph", async () => {
  const h = harness({ failJungleAt: 2 });
  await assert.rejects(h.worker.api.startTabCapture(1), /Jungle constructor/);
  assert.equal(h.dsps.length, 1);
  assert.equal(h.dsps[0].disposals, 1);
  assert.equal(h.contexts[0].closes, 1);
  assert.equal(h.streams[0].track.stops, 1);
});

test("stopping a capture disconnects its graph and disposes DSP exactly once", async () => {
  const h = harness();
  const processor = await active(h);
  const context = processor.audioContext;
  const stream = processor.stream;
  await h.worker.api.stopTabCapture(1);
  assertDisposed(h, processor);
  assert.equal(context.closes, 1);
  assert.equal(stream.track.stops, 1);
  assert.equal(stream.track.listeners.size, 0);
  assert.equal(await h.worker.api.stopTabCapture(1), false);
  assertDisposed(h, processor);
  assert.equal(context.closes, 1);
});

test("one failing disposer does not prevent remaining DSP or context cleanup", async () => {
  const h = harness();
  await active(h);
  h.fail = "dispose:Jungle";
  assert.equal(await h.worker.api.stopTabCapture(1), true);
  assert.ok(h.dsps.every(dsp => dsp.disposals === 1));
  assert.equal(h.contexts[0].closes, 1);
});

test("track-ended cleanup is token-scoped and cannot disturb another tab or replacement", async () => {
  const h = harness();
  const first = await active(h, 1);
  const second = await active(h, 2);
  const oldContext = first.audioContext;
  const otherContext = second.audioContext;
  const staleListener = [...first.stream.track.listeners][0];
  first.stream.track.end();
  await until(() => oldContext.closes === 1);
  assert.equal(await h.worker.api.isTabCaptureActive(1), false);
  assert.equal(await h.worker.api.isTabCaptureActive(2), true);
  assert.equal(otherContext.closes, 0);
  const replacement = await active(h, 1);
  staleListener();
  assert.equal(await h.worker.api.isTabCaptureActive(1), true);
  assert.equal(replacement.audioContext.closes, 0);
  assert.equal(await h.worker.api.updateTabCaptureSettings(2, { pitch: -4 }), true);
  assert.equal(second.processedGain.gain.calls.at(-1)[1], otherContext.currentTime);
  await Promise.all([h.worker.api.stopTabCapture(1), h.worker.api.stopTabCapture(2)]);
});

test("track ending while startup is suspended cancels and cleans the pending capture", async () => {
  const gate = deferred();
  const h = harness({ suspended: true, resumeGate: gate });
  const canceled = assert.rejects(h.worker.api.startTabCapture(1), /canceled/);
  await until(() => h.contexts[0]?.resumes === 1);
  h.streams[0].track.end();
  await until(() => h.contexts[0].closes === 1);
  gate.resolve();
  await canceled;
  assert.equal((await h.status(1)).pending, false);
});

test("an already-ended acquired track rolls back before creating audio resources", async () => {
  const h = harness({ deferGum: true });
  const failed = assert.rejects(h.worker.api.startTabCapture(1), /already ended/);
  await until(() => h.gum.length === 1);
  const stream = makeStream();
  stream.track.readyState = "ended";
  h.gum[0].resolve(stream);
  await failed;
  assert.equal(stream.track.stops, 1);
  assert.equal(stream.track.listeners.size, 0);
  assert.equal(h.contexts.length, 0);
});

test("settings preserve gain constants, disabled bypass, volume and shared semitone API", async () => {
  const h = harness();
  const processor = await active(h);
  assert.equal(vm.runInContext("Jungle === window.__vibesJungle", h.offscreen), true);
  await h.worker.api.updateTabCaptureSettings(1, { pitch: 6, volume: .4, reverbEnabled: false });
  assert.equal(processor.processedGain.gain.value, 1.25);
  assert.equal(processor.bypassGain.gain.value, 0);
  assert.equal(processor.volumeGain.gain.value, .4);
  assert.equal(processor.jungleL.semitones.at(-1), 6);
  assert.equal(processor.jungleR.semitones.at(-1), 6);
  await h.worker.api.updateTabCaptureSettings(1, { reverbEnabled: true, reverbAmount: 23 });
  assert.equal(processor.processedGain.gain.value, 1.5);
  assert.equal(processor.reverb.amount, 23);
  await h.worker.api.updateTabCaptureSettings(1, { pitch: 0 });
  assert.equal(processor.processedGain.gain.value, 1);
  assert.equal(processor.jungleL.semitones.at(-1), 0);
  await h.worker.api.updateTabCaptureSettings(1, { reverbEnabled: false });
  assert.equal(processor.bypassGain.gain.value, 1);
  assert.equal(processor.processedGain.gain.value, 0);
  assert.equal(await h.worker.api.updateTabCaptureSettings(1, { enabled: false }), true);
  assert.equal(processor.volumeGain.gain.value, 1);
  assert.equal(processor.reverb.enabled, false);
  await h.worker.api.stopTabCapture(1);
});

test("mono input is explicitly upmixed before the stereo splitter", async () => {
  const h = harness();
  const processor = await active(h);
  assert.equal(processor.upmix.channelCount, 2);
  assert.equal(processor.upmix.channelCountMode, "explicit");
  assert.equal(processor.upmix.channelInterpretation, "speakers");
  assert.equal(processor.source.connections[0][0], processor.upmix);
  assert.equal(processor.upmix.connections[0][0], processor.splitter);
  assert.equal(processor.splitter.connections[0][0], processor.jungleL.input);
  assert.equal(processor.splitter.connections[0][1], 0);
  assert.equal(processor.splitter.connections[1][0], processor.jungleR.input);
  assert.equal(processor.splitter.connections[1][1], 1);
  assert.equal(processor.source.connections[1][0], processor.bypassGain);
  await h.worker.api.stopTabCapture(1);
});

test("tab removal after worker restart stops offscreen capture without a cache", async () => {
  const h = harness();
  await active(h);
  h.worker = h.loadWorker();
  h.worker.listeners.removed(1);
  await until(() => h.contexts[0].closes === 1);
  assert.equal(await h.worker.api.isTabCaptureActive(1), false);
  assert.equal(h.streams[0].track.stops, 1);
});

test("tab closure before a stream ID arrives cancels startup", async () => {
  const h = harness({ deferIds: true });
  const canceled = assert.rejects(h.worker.api.startTabCapture(1), /canceled/);
  await until(() => h.ids.length === 1);
  h.worker.listeners.removed(1);
  h.ids[0].callback("closed-tab-stream");
  await canceled;
  assert.equal(h.gum.length, 0);
});

for (const change of [{ status: "loading" }, { status: "loading", url: "https://example.test/new-page" }]) {
  test(`loading stops capture ${change.url ? "on navigation" : "on refresh"} after restart`, async () => {
    const h = harness();
    await active(h);
    h.worker = h.loadWorker();
    h.worker.listeners.updated(1, { status: "complete" });
    assert.equal(await h.worker.api.isTabCaptureActive(1), true);
    h.worker.listeners.updated(1, change);
    await until(() => h.contexts[0].closes === 1);
    assert.equal(await h.worker.api.isTabCaptureActive(1), false);
  });
}

test("unrelated and untrusted messages are ignored without claiming a response", () => {
  const h = harness();
  for (const message of [null, {}, { type: "UNRELATED" }]) {
    const result = h.deliver(message);
    assert.equal(result.keepAlive, false);
    assert.equal(result.response, undefined);
  }
  const senders = [
    {},
    { ...trustedSender, id: "other-extension" },
    { ...trustedSender, tab: { id: 1 } },
    { ...trustedSender, url: "https://example.test/" },
    { ...trustedSender, url: `chrome-extension://${extensionId}-spoof/background.js` },
    { ...trustedSender, url: undefined }
  ];
  for (const sender of senders) {
    for (const type of ["OFFSCREEN_START_CAPTURE", "OFFSCREEN_STOP_CAPTURE", "OFFSCREEN_UPDATE_SETTINGS", "OFFSCREEN_GET_CAPTURE_STATUS"]) {
      const result = h.deliver({ type, tabId: 1, captureId: "token", streamId: "stream" }, sender);
      assert.equal(result.keepAlive, false);
      assert.equal(result.response, undefined);
    }
  }
  assert.equal(h.gum.length, 0);
});

test("capture commands validate tab IDs, capture tokens and stream IDs", async () => {
  const h = harness();
  for (const tabId of [-1, 1.5, "1", null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    for (const type of ["OFFSCREEN_START_CAPTURE", "OFFSCREEN_STOP_CAPTURE", "OFFSCREEN_UPDATE_SETTINGS", "OFFSCREEN_GET_CAPTURE_STATUS"]) {
      const result = h.deliver({ type, tabId, captureId: "token", streamId: "stream" });
      assert.equal(result.keepAlive, false);
      assert.equal(result.response.success, false);
      assert.match(result.response.error, /tab ID/);
    }
    await assert.rejects(h.worker.api.startTabCapture(tabId), /tab ID/);
    assert.equal(await h.worker.api.stopTabCapture(tabId), false);
    assert.equal(await h.worker.api.isTabCaptureActive(tabId), false);
    assert.equal(await h.worker.api.updateTabCaptureSettings(tabId, {}), false);
  }
  assert.equal(h.deliver({ type: "OFFSCREEN_START_CAPTURE", tabId: 1, streamId: "stream" }).response.success, false);
  assert.equal(h.deliver({ type: "OFFSCREEN_START_CAPTURE", tabId: 1, captureId: "token" }).response.success, false);
  assert.equal(h.deliver({ type: "OFFSCREEN_STOP_CAPTURE", tabId: 1 }).response.success, false);
  assert.equal(h.creates, 0);
  assert.equal(h.gum.length, 0);
});

test("offscreen duplicate starts coalesce, and stale stop tokens cannot stop newer captures", async () => {
  const h = harness({ exists: true, deferGum: true });
  const a = h.send("OFFSCREEN_START_CAPTURE", 1, { streamId: "first", captureId: "first-token" });
  const b = h.send("OFFSCREEN_START_CAPTURE", 1, { streamId: "duplicate", captureId: "duplicate-token" });
  await until(() => h.gum.length === 1);
  h.gum[0].resolve(makeStream());
  assert.equal((await a).captureId, "first-token");
  assert.equal((await b).captureId, "first-token");
  assert.equal((await h.send("OFFSCREEN_START_CAPTURE", 1, { streamId: "third", captureId: "third-token" })).streamId, "first");
  assert.equal((await h.send("OFFSCREEN_STOP_CAPTURE", 1, { captureId: "stale-token" })).success, false);
  assert.equal((await h.status(1)).active, true);
  assert.equal((await h.send("OFFSCREEN_STOP_CAPTURE", 1, { captureId: "first-token" })).success, true);
  const newer = h.send("OFFSCREEN_START_CAPTURE", 1, { streamId: "new", captureId: "new-token" });
  await until(() => h.gum.length === 2);
  assert.equal((await h.send("OFFSCREEN_STOP_CAPTURE", 1, { captureId: "first-token" })).success, false);
  h.gum[1].resolve(makeStream());
  await newer;
  assert.equal((await h.status(1)).captureId, "new-token");
  await h.worker.api.stopTabCapture(1);
});

test("a delayed old stop cannot delete or stop a newer worker start", async () => {
  const gate = deferred();
  const h = harness({ closeGate: gate });
  await active(h);
  const stop = h.worker.api.stopTabCapture(1);
  await until(() => h.contexts[0].closes === 1);
  const replacement = h.worker.api.startTabCapture(1);
  assert.equal(h.worker.api.startTabCapture(1), replacement);
  assert.equal(h.ids.length, 1);
  gate.resolve();
  assert.equal(await stop, true);
  await replacement;
  assert.equal(await h.worker.api.isTabCaptureActive(1), true);
  assert.equal(h.contexts[1].closes, 0);
  await h.worker.api.stopTabCapture(1);
});

test("stop-start-stop-start preserves stop ordering and cancels the superseded start", async () => {
  const gate = deferred();
  const h = harness({ closeGate: gate });
  await active(h);
  const firstStop = h.worker.api.stopTabCapture(1);
  await until(() => h.contexts[0].closes === 1);
  const canceled = assert.rejects(h.worker.api.startTabCapture(1), /canceled/);
  const secondStop = h.worker.api.stopTabCapture(1);
  const latest = h.worker.api.startTabCapture(1);
  gate.resolve();
  await Promise.all([firstStop, canceled, secondStop, latest]);
  assert.equal(h.ids.length, 2);
  assert.equal(await h.worker.api.isTabCaptureActive(1), true);
  await h.worker.api.stopTabCapture(1);
});

test("false and missing update responses propagate to the worker", async () => {
  const h = harness();
  await active(h);
  h.replyHook = (message, response) => message.type === "OFFSCREEN_UPDATE_SETTINGS" ? { success: false } : response;
  assert.equal(await h.worker.api.updateTabCaptureSettings(1, {}), false);
  h.replyHook = (message, response) => message.type === "OFFSCREEN_UPDATE_SETTINGS" ? undefined : response;
  assert.equal(await h.worker.api.updateTabCaptureSettings(1, {}), false);
  h.replyHook = (message, response) => {
    if (message.type === "OFFSCREEN_UPDATE_SETTINGS") throw new Error("Receiver closed");
    return response;
  };
  assert.equal(await h.worker.api.updateTabCaptureSettings(1, {}), false);
  await h.worker.api.stopTabCapture(1);
});

for (const reply of ["failure", "missing", "rejection"]) {
  test(`a ${reply} start response triggers token-scoped resource rollback`, async () => {
    const h = harness();
    h.replyHook = (message, response) => {
      if (message.type !== "OFFSCREEN_START_CAPTURE") return response;
      if (reply === "rejection") throw new Error("Reply lost");
      return reply === "failure" ? { success: false, error: "Start failed" } : undefined;
    };
    await assert.rejects(h.worker.api.startTabCapture(1), /Start failed|Failed to start|Reply lost/);
    assert.equal(h.contexts[0].closes, 1);
    assert.equal(h.streams[0].track.stops, 1);
    assert.equal((await h.status(1)).active, false);
  });
}
