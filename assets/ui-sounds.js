/* Quiet, original interface foley. No downloads, autoplay, music, or oscillators.
 * Public API: NoirSound.playUiSound(name), getAudioEnabled(), setAudioEnabled(bool),
 * subscribeAudioEnabled(listener), toggle(), install(document).
 * data-sound="none" silences a control; data-sound="open" chooses a cue.
 */
(function (window, document) {
  'use strict';
  if (window.NoirSound) return;

  const KEY = 'detective-ui-audio-v1';
  const durations = { tap: .045, navigate: .075, open: .115, close: .085, discover: .21, success: .24, error: .105 };
  const priorities = { tap: 0, navigate: 1, open: 2, close: 2, discover: 3, success: 4, error: 4 };
  const listeners = new Set();
  const buffers = new Map();
  const sources = new Set();
  let enabled = true;
  let context = null;
  let resuming = null;
  let pending = null;
  let scheduled = false;
  let generation = 0;
  let lastPlayedAt = -Infinity;
  let lastPriority = -1;
  let gestureAt = -Infinity;
  let installed = false;
  try { enabled = window.localStorage.getItem(KEY) !== 'false'; } catch (_) {}

  function publish() { listeners.forEach(function (listener) { listener(enabled); }); }

  function stop() {
    generation += 1;
    pending = null;
    scheduled = false;
    sources.forEach(function (source) { try { source.stop(); } catch (_) {} });
    sources.clear();
  }

  function setAudioEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) stop();
    try { window.localStorage.setItem(KEY, String(enabled)); } catch (_) {}
    if (enabled) unlock();
    publish();
  }

  function synthesize(name) {
    if (buffers.has(name)) return buffers.get(name);
    const rate = context.sampleRate;
    const duration = durations[name];
    const buffer = context.createBuffer(1, Math.ceil(rate * duration), rate);
    const samples = buffer.getChannelData(0);
    let noise = 0;
    let seed = name.split('').reduce(function (value, letter) { return (value * 31 + letter.charCodeAt(0)) >>> 0; }, 7);
    let peak = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const t = i / rate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      noise += .18 * ((seed / 4294967296) * 2 - 1 - noise);
      let value;
      if (name === 'tap') {
        value = (.65 * Math.sin(2 * Math.PI * 380 * t) + noise) * Math.exp(-t * 78);
      } else if (name === 'navigate') {
        value = (noise * .9 + Math.sin(2 * Math.PI * 310 * t) * .22) * Math.exp(-t * 31);
      } else if (name === 'open' || name === 'close') {
        value = noise * Math.pow(Math.sin(Math.PI * t / duration), 1.2) * .8 + Math.sin(2 * Math.PI * 230 * t) * Math.exp(-t * 60) * .17;
      } else if (name === 'discover' || name === 'success') {
        const first = name === 'discover' ? 392 : 440;
        const second = name === 'discover' ? 523.25 : 587.33;
        value = Math.sin(2 * Math.PI * first * t) * Math.exp(-t * 22) * .27;
        if (t > .055) value += Math.sin(2 * Math.PI * second * (t - .055)) * Math.exp(-(t - .055) * 25) * .22;
        value += noise * Math.exp(-t * 40) * .2;
      } else {
        value = (Math.sin(2 * Math.PI * 175 * t) * .25 + noise * .5) * Math.exp(-t * 24);
      }
      samples[i] = value * Math.min(1, t / .003) * Math.min(1, (duration - t) / .012);
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    for (let i = 0; i < samples.length; i += 1) samples[i] *= .22 / (peak || 1);
    buffers.set(name, buffer);
    return buffer;
  }

  function unlock(event) {
    if (event && event.isTrusted) gestureAt = Date.now();
    const hasGesture = (window.navigator.userActivation && window.navigator.userActivation.isActive) || Date.now() - gestureAt < 100;
    if (!enabled || !hasGesture) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      if (!context) context = new AudioContext();
      if (context.state === 'suspended') {
        resuming = Promise.resolve(context.resume()).catch(function () {});
      }
    } catch (_) { context = null; }
  }

  function flush() {
    scheduled = false;
    const request = pending;
    pending = null;
    if (!request || !context || !enabled || context.state !== 'running' || document.hidden) return;
    const now = Date.now();
    if (now - lastPlayedAt < 75 && priorities[request.name] <= lastPriority) return;
    try {
      // A meaningful result replaces the button tap instead of stacking with it.
      sources.forEach(function (source) { try { source.stop(); } catch (_) {} });
      sources.clear();
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = synthesize(request.name);
      gain.gain.value = .32;
      source.connect(gain);
      gain.connect(context.destination);
      sources.add(source);
      source.onended = function () { sources.delete(source); source.disconnect(); gain.disconnect(); };
      source.start();
      lastPlayedAt = now;
      lastPriority = priorities[request.name];
    } catch (_) { /* Audio must never interrupt an action. */ }
  }

  function playUiSound(name) {
    name = name || 'tap';
    if (!enabled || !Object.prototype.hasOwnProperty.call(durations, name)) return;
    if (!context || context.state === 'suspended') unlock();
    if (!context) return;
    if (!pending || priorities[name] >= priorities[pending.name]) pending = { name: name, at: Date.now() };
    if (!scheduled) {
      scheduled = true;
      const requestGeneration = generation;
      Promise.resolve().then(function () { return resuming; }).then(function () {
        if (requestGeneration !== generation) return;
        if (pending && Date.now() - pending.at > 350) { pending = null; scheduled = false; return; }
        flush();
      });
    }
  }

  function soundFor(control) {
    if (control.dataset.sound) return control.dataset.sound;
    const action = control.dataset.action || '';
    if (/^(sound|audio|toggle-sound|toggle-audio)$/.test(action) || /sound|audio/.test(control.id || '')) return 'none';
    if (/close|cancel|dismiss|back/.test(action)) return 'close';
    if (/tab|navigate|screen|home|catalog|map|notebook/.test(action)) return 'navigate';
    return 'tap';
  }

  function install(target) {
    if (installed) return;
    installed = true;
    target.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    target.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') unlock(event);
    }, true);
    target.addEventListener('click', function (event) {
      if (!event.isTrusted) return;
      unlock(event);
      const control = event.target && event.target.closest && event.target.closest('button, a[href], summary, [role="button"], [data-action]');
      if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true' || control.closest('[inert]')) return;
      const name = soundFor(control);
      if (name !== 'none') playUiSound(name);
    });
    target.addEventListener('visibilitychange', function () { if (target.hidden) stop(); });
    window.addEventListener('storage', function (event) {
      if (event.key !== KEY) return;
      enabled = event.newValue !== 'false';
      if (!enabled) stop();
      publish();
    });
  }

  window.NoirSound = {
    playUiSound: playUiSound,
    getAudioEnabled: function () { return enabled; },
    setAudioEnabled: setAudioEnabled,
    subscribeAudioEnabled: function (listener) { listeners.add(listener); return function () { listeners.delete(listener); }; },
    toggle: function () { setAudioEnabled(!enabled); return enabled; },
    install: install,
  };
  install(document);
})(window, document);
