// background.js

// ── Install defaults ──────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    enabled: false,
    play200s: false,
    rules200s: [],   // [{ key: "status", value: "FAILURE" }, ...]
    customSoundName: "fahhhhh.mp3",
  });
  chrome.storage.local.set({ customSoundBase64: null });
});

// ── Non-2xx: trigger sound via content script ─────────────────────────────────
chrome.webRequest.onCompleted.addListener(
  (details) => {
    const code = details.statusCode;
    if (code < 200 || code >= 300) {
      chrome.storage.sync.get("enabled", (data) => {
        if (data.enabled && details.tabId && details.tabId !== -1) {
          chrome.tabs.sendMessage(details.tabId, {
            action: "PLAY_FAHHH",
            statusCode: code,
            url: details.url,
          }).catch(() => {});
        }
      });
    }
  },
  { urls: ["<all_urls>"] }
);

// ── Message handlers ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  // Legacy toggle
  if (message.action === "SET_ENABLED") {
    chrome.storage.sync.set({ enabled: message.enabled }, () => {
      sendResponse({ success: true });
      broadcastSettings();
    });
    return true;
  }

  if (message.action === "GET_ENABLED") {
    chrome.storage.sync.get("enabled", (data) => {
      sendResponse({ enabled: data.enabled });
    });
    return true;
  }

  // New: save all settings at once
  if (message.action === "SET_SETTINGS") {
    const { syncData, localData } = message;
    chrome.storage.sync.set(syncData, () => {
      if (localData) {
        chrome.storage.local.set(localData, () => {
          sendResponse({ success: true });
          broadcastSettings();
        });
      } else {
        sendResponse({ success: true });
        broadcastSettings();
      }
    });
    return true;
  }

  // New: read all settings
  if (message.action === "GET_SETTINGS") {
    chrome.storage.sync.get(
      ["enabled", "play200s", "rules200s", "customSoundName"],
      (syncData) => {
        chrome.storage.local.get("customSoundBase64", (localData) => {
          sendResponse({ ...syncData, ...localData });
        });
      }
    );
    return true;
  }
});

// ── Broadcast to all tabs so content scripts pick up new settings live ────────
function broadcastSettings() {
  chrome.storage.sync.get(
    ["enabled", "play200s", "rules200s", "customSoundName"],
    (syncData) => {
      chrome.storage.local.get("customSoundBase64", (localData) => {
        const payload = { action: "SETTINGS_UPDATED", ...syncData, ...localData };
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id && tab.id !== -1) {
              chrome.tabs.sendMessage(tab.id, payload).catch(() => {});
            }
          });
        });
      });
    }
  );
}
