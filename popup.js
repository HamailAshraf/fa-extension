const toggleSwitch = document.getElementById("toggleSwitch");
const statusText = document.getElementById("statusText");

function updateUI(enabled) {
  toggleSwitch.checked = enabled;
  if (enabled) {
    statusText.textContent = "Currently ON";
    statusText.classList.add("on");
  } else {
    statusText.textContent = "Currently OFF";
    statusText.classList.remove("on");
  }
}

chrome.runtime.sendMessage({ action: "GET_ENABLED" }, (response) => {
  if (chrome.runtime.lastError) return;
  updateUI(response?.enabled ?? false);
});

toggleSwitch.addEventListener("change", () => {
  const enabled = toggleSwitch.checked;
  updateUI(enabled);
  chrome.runtime.sendMessage({ action: "SET_ENABLED", enabled }, () => {
    if (chrome.runtime.lastError) {
      chrome.storage.sync.set({ enabled });
    }
  });
});
