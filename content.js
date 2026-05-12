(() => {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  function dispatchConfig(detail) {
    window.dispatchEvent(new CustomEvent("obligations-modifier:config", { detail }));
  }

  async function pushCurrentConfig() {
    const { enabled, patch } = await chrome.storage.local.get(["enabled", "patch"]);
    dispatchConfig({
      enabled: !!enabled,
      patch: patch ?? { verificationState: "Required", isRestricted: false }
    });
  }

  pushCurrentConfig();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!("enabled" in changes) && !("patch" in changes)) return;
    pushCurrentConfig();
  });

  window.addEventListener("obligations-modifier:request-config", pushCurrentConfig);
})();
