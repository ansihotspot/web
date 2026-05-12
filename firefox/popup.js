var browserAPI = typeof browser !== "undefined" ? browser : chrome;

var toggleBtn, verifEl, restrictedEl, statusIndicator, statusText, patchCountEl, resetBtn, toastEl;
var currentEnabled = false;

document.addEventListener("DOMContentLoaded", function () {
  toggleBtn = document.getElementById("toggleBtn");
  verifEl = document.getElementById("verificationState");
  restrictedEl = document.getElementById("isRestricted");
  statusIndicator = document.getElementById("statusIndicator");
  statusText = document.getElementById("statusText");
  patchCountEl = document.getElementById("patchCount");
  resetBtn = document.getElementById("resetCountBtn");
  toastEl = document.getElementById("toast");

  toggleBtn.addEventListener("click", onToggle);
  verifEl.addEventListener("input", persist);
  restrictedEl.addEventListener("change", persist);
  resetBtn.addEventListener("click", onResetCount);

  loadState();
  listenForUpdates();
});

function loadState() {
  browserAPI.runtime.sendMessage({ type: "GET_STATE" }, function (resp) {
    if (!resp) return;
    currentEnabled = !!resp.enabled;
    verifEl.value = resp.verificationState ?? "Required";
    restrictedEl.checked = !!resp.isRestricted;
    patchCountEl.textContent = resp.patchCount ?? 0;
    render();
  });
}

function render() {
  if (currentEnabled) {
    statusIndicator.className = "status-indicator active";
    statusText.textContent = "Actif";
    toggleBtn.textContent = "Desactiver la modification";
    toggleBtn.classList.add("on");
  } else {
    statusIndicator.className = "status-indicator inactive";
    statusText.textContent = "Inactif";
    toggleBtn.textContent = "Activer la modification";
    toggleBtn.classList.remove("on");
  }
}

function persist(callback) {
  browserAPI.runtime.sendMessage({
    type: "SET_STATE",
    enabled: currentEnabled,
    verificationState: verifEl.value,
    isRestricted: restrictedEl.checked
  }, function (resp) {
    if (typeof callback === "function") callback(resp);
  });
}

function onToggle() {
  currentEnabled = !currentEnabled;
  persist(function () {
    render();
    showToast(currentEnabled ? "Active" : "Desactive");
  });
}

function onResetCount() {
  browserAPI.runtime.sendMessage({ type: "RESET_COUNT" }, function () {
    patchCountEl.textContent = "0";
    showToast("Compteur reinitialise");
  });
}

function listenForUpdates() {
  browserAPI.runtime.onMessage.addListener(function (message) {
    if (message && message.type === "PATCHED" && message.state) {
      patchCountEl.textContent = message.state.patchCount ?? 0;
    }
  });
}

function showToast(text) {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.classList.add("show");
  setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
}
