const DEFAULT_PAYLOAD = {
  content: [],
  errors: [],
  warnings: [],
  information: [],
  isValid: true
};

const toggleBtn = document.getElementById("toggle");
const statusEl = document.getElementById("status");
const payloadEl = document.getElementById("payload");
const resetBtn = document.getElementById("reset");

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

async function load() {
  const stored = await chrome.storage.local.get(["enabled", "payload"]);
  const enabled = !!stored.enabled;
  const payload = stored.payload ?? JSON.stringify(DEFAULT_PAYLOAD, null, 2);
  payloadEl.value = payload;
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
  payloadEl.value = JSON.stringify(DEFAULT_PAYLOAD, null, 2);
  await chrome.storage.local.set({ payload: payloadEl.value });
});

payloadEl.addEventListener("input", () => {
  persistPayload();
});

load();
