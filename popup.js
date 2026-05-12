const DEFAULT_PATCH = {
  verificationState: "Required",
  isRestricted: false
};

const toggleBtn = document.getElementById("toggle");
const statusEl = document.getElementById("status");
const verifEl = document.getElementById("verificationState");
const restrictedEl = document.getElementById("isRestricted");

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
  const stored = await chrome.storage.local.get(["enabled", "patch"]);
  const patch = stored.patch ?? DEFAULT_PATCH;
  verifEl.value = patch.verificationState ?? "Required";
  restrictedEl.checked = !!patch.isRestricted;
  render({ enabled: !!stored.enabled });
}

async function persistPatch() {
  const patch = {
    verificationState: verifEl.value,
    isRestricted: restrictedEl.checked
  };
  await chrome.storage.local.set({ patch });
}

toggleBtn.addEventListener("click", async () => {
  await persistPatch();
  const { enabled } = await chrome.storage.local.get(["enabled"]);
  const next = !enabled;
  await chrome.storage.local.set({ enabled: next });
  render({ enabled: next });
});

verifEl.addEventListener("input", persistPatch);
restrictedEl.addEventListener("change", persistPatch);

load();
