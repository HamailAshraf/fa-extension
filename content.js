// content.js
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
      return settings.customSoundBase64; // already a data: URL stored as base64 data URI
    }
    return chrome.runtime.getURL("fahhhhh.mp3");
  }

  function playFahhh() {
    if (isPlaying) return;
    const src = buildAudioSrc();

    // Re-create audio if source changed or first time
    if (!audio || audio.dataset.src !== src) {
      audio = new Audio(src);
      audio.dataset = audio.dataset || {};
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

      // Normalise to string for comparison (handles booleans, numbers, strings)
      const actualStr = String(actual).toLowerCase().trim();
      const expectedStr = String(rule.value).toLowerCase().trim();

      // Also handle array / object emptiness: value "[]" or "(empty)"
      if (expectedStr === "[]" || expectedStr === "(empty)") {
        if (Array.isArray(actual) && actual.length === 0) return true;
        if (actual !== null && typeof actual === "object" && !Array.isArray(actual) && Object.keys(actual).length === 0) return true;
      } else if (actualStr === expectedStr) {
        return true;
      }
    }
    return false;
  }

  // ── Fetch/XHR interceptor for 2xx responses ───────────────────────────────────
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      if (settings.play200s && response.status >= 200 && response.status < 300) {
        const clone = response.clone();
        clone.json().then((body) => {
          if (shouldPlayFor200(body)) playFahhh();
        }).catch(() => {});
      }
    } catch (_) {}
    return response;
  };

  const OriginalXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OriginalXHR();
    xhr.addEventListener("readystatechange", function () {
      if (xhr.readyState === 4 && settings.play200s && xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText);
          if (shouldPlayFor200(body)) playFahhh();
        } catch (_) {}
      }
    });
    return xhr;
  }
  PatchedXHR.prototype = OriginalXHR.prototype;
  window.XMLHttpRequest = PatchedXHR;

  // ── Load settings ─────────────────────────────────────────────────────────────
  function applySettings(data) {
    settings.enabled = data.enabled ?? false;
    settings.play200s = data.play200s ?? false;
    settings.rules200s = data.rules200s ?? [];
    settings.customSoundBase64 = data.customSoundBase64 ?? null;
    // Reset cached audio so next play picks up new source
    audio = null;
  }

  chrome.storage.sync.get(
    ["enabled", "play200s", "rules200s", "customSoundName"],
    (syncData) => {
      chrome.storage.local.get("customSoundBase64", (localData) => {
        applySettings({ ...syncData, ...localData });
      });
    }
  );

  // ── Message listener ──────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "PLAY_FAHHH") {
      // Triggered by background for non-2xx
      playFahhh();
    }
    if (message.action === "SETTINGS_UPDATED") {
      applySettings(message);
    }
  });
})();
