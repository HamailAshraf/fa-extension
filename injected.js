// injected.js — runs in MAIN world (real page context)
// Patches window.fetch and window.XMLHttpRequest, then posts response bodies
// to the isolated content script via postMessage.
(function () {
  const TARGET_MSG = "__FA_RESPONSE__";

  // ── Fetch interceptor ────────────────────────────────────────────────────────
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      if (response.status >= 200 && response.status < 300) {
        const clone = response.clone();
        clone.json().then((body) => {
          window.postMessage({ type: TARGET_MSG, body }, "*");
        }).catch(() => {});
      }
    } catch (_) {}
    return response;
  };

  // ── XHR interceptor ──────────────────────────────────────────────────────────
  const OriginalXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OriginalXHR();
    xhr.addEventListener("readystatechange", function () {
      if (
        xhr.readyState === 4 &&
        xhr.status >= 200 &&
        xhr.status < 300
      ) {
        try {
          const body = JSON.parse(xhr.responseText);
          window.postMessage({ type: TARGET_MSG, body }, "*");
        } catch (_) {}
      }
    });
    return xhr;
  }
  PatchedXHR.prototype = OriginalXHR.prototype;
  window.XMLHttpRequest = PatchedXHR;
})();
