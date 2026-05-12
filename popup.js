const toggleBtn = document.getElementById("toggle");
const statusEl = document.getElementById("status");
const payloadEl = document.getElementById("payload");
const resetBtn = document.getElementById("reset");

let defaultPayloadString = '{"content":[],"errors":[],"warnings":[],"information":[],"isValid":true}';

async function loadDefault() {
  try {
    const res = await fetch(chrome.runtime.getURL("default-payload.json"));
    const obj = await res.json();
    defaultPayloadString = JSON.stringify(obj, null, 2);
  } catch (e) {
    console.warn("[ObligationsModifier] impossible de charger default-payload.json", e);
  }
}

function render(state) {
  if (state.enabled) {
    statusEl.textContent = "Actif";
    statusEl.classList.add("on");
    toggleBtn.textContent = "Desactiver la modification";
    toggleBtn.classList.add("on");
  } else {
    statusEl.textContent = "Inactif";
    statusEl.classList.remove("on");
    toggleBtn.textContent = "Activer la modification";
    toggleBtn.classList.remove("on");
  }
}

async function init() {
  await loadDefault();
  const stored = await chrome.storage.local.get(["enabled", "payload"]);
  const enabled = !!stored.enabled;
  payloadEl.value = stored.payload ?? defaultPayloadString;
  render({ enabled });
}

async function persistPayload() {
  const value = payloadEl.value;
  try {
    JSON.parse(value);
  } catch {
    statusEl.textContent = "JSON invalide";
    return false;
  }
  await chrome.storage.local.set({ payload: value });
  return true;
}

toggleBtn.addEventListener("click", async () => {
  const ok = await persistPayload();
  if (!ok) return;
  const { enabled } = await chrome.storage.local.get(["enabled"]);
  const next = !enabled;
  await chrome.storage.local.set({ enabled: next });
  render({ enabled: next });
});

resetBtn.addEventListener("click", async () => {
  payloadEl.value = defaultPayloadString;
  await chrome.storage.local.set({ payload: payloadEl.value });
});

payloadEl.addEventListener("input", () => {
  persistPayload();
});

init();
