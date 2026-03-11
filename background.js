const SOUND_URL_KEY = "soundUrl";

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ enabled: false });
});

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.statusCode < 200 || details.statusCode >= 300) {
      chrome.storage.sync.get("enabled", (data) => {
        if (data.enabled) {
          if (details.tabId && details.tabId !== -1) {
            chrome.tabs.sendMessage(details.tabId, {
              action: "PLAY_FAHHH",
              statusCode: details.statusCode,
              url: details.url,
            }).catch(() => {
            });
          }
        }
      });
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "SET_ENABLED") {
    chrome.storage.sync.set({ enabled: message.enabled }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === "GET_ENABLED") {
    chrome.storage.sync.get("enabled", (data) => {
      sendResponse({ enabled: data.enabled });
    });
    return true;
  }
});
