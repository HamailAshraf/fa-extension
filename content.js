// content.js — runs in ISOLATED world
// Receives response bodies from injected.js (MAIN world) via postMessage,
// evaluates rules, and plays sound when a rule matches.
(function () {
  // ── State ────────────────────────────────────────────────────────────────────
  let audio = null;
  let isPlaying = false;
  let settings = {
    enabled: false,
    play200s: false,
    rules200s: [],
    customSoundBase64: null,
  };

  // ── Audio playback ────────────────────────────────────────────────────────────
  function buildAudioSrc() {
    if (settings.customSoundBase64) {
      return settings.customSoundBase64;
    }
    return chrome.runtime.getURL("fahhhhh.mp3");
  }

  function playFahhh() {
    if (isPlaying) return;
    const src = buildAudioSrc();

    if (!audio || audio.dataset.src !== src) {
      audio = new Audio(src);
      audio.dataset.src = src;
      audio.volume = 1.0;
      audio.onended = () => { isPlaying = false; };
      audio.onerror = () => { isPlaying = false; };
    }

    isPlaying = true;
    audio.currentTime = 0;
    audio.play().catch(() => { isPlaying = false; });
  }

  // ── Rule evaluation ────────────────────────────────────────────────────────────
  function shouldPlayFor200(body) {
    if (!settings.play200s) return false;
    if (!body || typeof body !== "object") return false;

    for (const rule of settings.rules200s) {
      if (!rule.key) continue;

      // Special built-in rule: detect any "error" key in root
      if (rule.key === "__hasErrorKey__") {
        if (Object.prototype.hasOwnProperty.call(body, "error")) return true;
        continue;
      }

      // Generic key-value rule
      const actual = body[rule.key];
      if (actual === undefined) continue;

      const actualStr = String(actual).toLowerCase().trim();
      const expectedStr = String(rule.value).toLowerCase().trim();

      // Handle array / object emptiness
      if (expectedStr === "[]" || expectedStr === "(empty)") {
        if (Array.isArray(actual) && actual.length === 0) return true;
        if (
          actual !== null &&
          typeof actual === "object" &&
          !Array.isArray(actual) &&
          Object.keys(actual).length === 0
        ) return true;
      } else if (actualStr === expectedStr) {
        return true;
      }
    }
    return false;
  }

  // ── Listen for response bodies from injected.js (MAIN world) ─────────────────
  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      !event.data ||
      event.data.type !== "__FA_RESPONSE__"
    ) return;

    if (!settings.enabled) return;

    const body = event.data.body;
    if (shouldPlayFor200(body)) {
      playFahhh();
    }
  });

  // ── Load settings ─────────────────────────────────────────────────────────────
  function applySettings(data) {
    settings.enabled = data.enabled ?? false;
    settings.play200s = data.play200s ?? false;
    settings.rules200s = data.rules200s ?? [];
    settings.customSoundBase64 = data.customSoundBase64 ?? null;
    audio = null; // Reset cached audio so next play picks up new source
  }

  chrome.storage.sync.get(
    ["enabled", "play200s", "rules200s", "customSoundName"],
    (syncData) => {
      chrome.storage.local.get("customSoundBase64", (localData) => {
        applySettings({ ...syncData, ...localData });
      });
    }
  );

  // ── Message listener (from background.js) ────────────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "PLAY_FAHHH") {
      // Triggered by background for non-2xx HTTP status codes
      if (settings.enabled) playFahhh();
    }
    if (message.action === "SETTINGS_UPDATED") {
      applySettings(message);
    }
  });
})();
