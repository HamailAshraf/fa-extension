// popup.js

// ── DOM refs ──────────────────────────────────────────────────────────────────
const toggleSwitch   = document.getElementById("toggleSwitch");
const statusText     = document.getElementById("statusText");
const soundNameEl    = document.getElementById("soundName");
const resetSoundBtn  = document.getElementById("resetSound");
const soundFilePicker= document.getElementById("soundFilePicker");
const play200sCheck  = document.getElementById("play200sCheck");
const rulesPanel     = document.getElementById("rulesPanel");
const errorKeyCheck  = document.getElementById("errorKeyCheck");
const chipsArea      = document.getElementById("chipsArea");
const ruleKeyInput   = document.getElementById("ruleKey");
const ruleValueInput = document.getElementById("ruleValue");
const addRuleBtn     = document.getElementById("addRuleBtn");

// ── In-memory state ───────────────────────────────────────────────────────────
let rules200s = [];   // array of { key, value }

// ── Helpers ───────────────────────────────────────────────────────────────────
function updateToggleUI(enabled) {
  toggleSwitch.checked = enabled;
  if (enabled) {
    statusText.textContent = "Currently ON";
    statusText.classList.add("on");
  } else {
    statusText.textContent = "Currently OFF";
    statusText.classList.remove("on");
  }
}

function updateSoundUI(name, isCustom) {
  soundNameEl.textContent = name || "fahhhhh.mp3";
  resetSoundBtn.hidden = !isCustom;
}

function setRulesPanel(visible) {
  if (visible) {
    rulesPanel.classList.add("visible");
  } else {
    rulesPanel.classList.remove("visible");
  }
}

// ── Chip rendering ────────────────────────────────────────────────────────────
function renderChips() {
  chipsArea.innerHTML = "";
  rules200s.forEach((rule, idx) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `
      <code>${escapeHtml(rule.key)}</code>
      <span>→</span>
      <code>${escapeHtml(rule.value)}</code>
      <button class="chip-remove" data-idx="${idx}" title="Remove rule">✕</button>
    `;
    chipsArea.appendChild(chip);
  });

  chipsArea.querySelectorAll(".chip-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx, 10);
      rules200s.splice(idx, 1);
      renderChips();
      saveSettings();
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Persist settings ──────────────────────────────────────────────────────────
function saveSettings(syncExtra, localExtra) {
  const syncData = {
    play200s: play200sCheck.checked,
    rules200s: rules200s,
    ...(syncExtra || {}),
  };
  chrome.runtime.sendMessage(
    { action: "SET_SETTINGS", syncData, localData: localExtra || null },
    () => { if (chrome.runtime.lastError) {} }
  );
}

// ── Load settings on open ─────────────────────────────────────────────────────
chrome.runtime.sendMessage({ action: "GET_SETTINGS" }, (response) => {
  if (chrome.runtime.lastError || !response) return;

  // Master toggle
  updateToggleUI(response.enabled ?? false);

  // Sound file
  const isCustom = !!response.customSoundBase64;
  updateSoundUI(response.customSoundName || "fahhhhh.mp3", isCustom);

  // 200s
  play200sCheck.checked = response.play200s ?? false;
  setRulesPanel(play200sCheck.checked);

  // Rules
  rules200s = response.rules200s ?? [];

  // Error key — stored as a special rule entry
  const hasErrorRule = rules200s.some((r) => r.key === "__hasErrorKey__");
  errorKeyCheck.checked = hasErrorRule;

  // Render chips (exclude the __hasErrorKey__ rule from chips)
  renderChips();
});

// ── Master toggle ─────────────────────────────────────────────────────────────
toggleSwitch.addEventListener("change", () => {
  const enabled = toggleSwitch.checked;
  updateToggleUI(enabled);
  chrome.runtime.sendMessage(
    { action: "SET_SETTINGS", syncData: { enabled }, localData: null },
    () => { if (chrome.runtime.lastError) {} }
  );
});

// ── Sound file picker ─────────────────────────────────────────────────────────
soundFilePicker.addEventListener("change", () => {
  const file = soundFilePicker.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64DataUrl = e.target.result; // "data:audio/mpeg;base64,..."
    const name = file.name;
    updateSoundUI(name, true);
    saveSettings({ customSoundName: name }, { customSoundBase64: base64DataUrl });
  };
  reader.readAsDataURL(file);
  // reset input so the same file can be re-selected if needed
  soundFilePicker.value = "";
});

// ── Reset sound ───────────────────────────────────────────────────────────────
resetSoundBtn.addEventListener("click", () => {
  updateSoundUI("fahhhhh.mp3", false);
  saveSettings({ customSoundName: "fahhhhh.mp3" }, { customSoundBase64: null });
});

// ── 200s checkbox ─────────────────────────────────────────────────────────────
play200sCheck.addEventListener("change", () => {
  setRulesPanel(play200sCheck.checked);
  saveSettings();
});

// ── Error key built-in rule ───────────────────────────────────────────────────
errorKeyCheck.addEventListener("change", () => {
  // Remove existing entry first
  rules200s = rules200s.filter((r) => r.key !== "__hasErrorKey__");
  if (errorKeyCheck.checked) {
    rules200s.unshift({ key: "__hasErrorKey__", value: "true" });
  }
  renderChips();
  saveSettings();
});

// ── Add custom rule ───────────────────────────────────────────────────────────
addRuleBtn.addEventListener("click", () => {
  const key   = ruleKeyInput.value.trim();
  const value = ruleValueInput.value.trim();
  if (!key || !value) {
    ruleKeyInput.focus();
    ruleKeyInput.style.borderColor = "rgba(231,111,81,0.7)";
    setTimeout(() => { ruleKeyInput.style.borderColor = ""; }, 1200);
    return;
  }
  rules200s.push({ key, value });
  ruleKeyInput.value = "";
  ruleValueInput.value = "";
  renderChips();
  saveSettings();
});

// Allow pressing Enter in the value field to add rule
ruleValueInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addRuleBtn.click();
});
