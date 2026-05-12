(() => {
  const TAG = "[ObligationsModifier:content]";
  console.info(TAG, "loaded in isolated world");

  function dispatchConfig(detail) {
    window.dispatchEvent(new CustomEvent("obligations-modifier:config", { detail }));
  }

  async function pushCurrentConfig() {
    try {
      const { enabled, patch } = await chrome.storage.local.get(["enabled", "patch"]);
      const cfg = {
        enabled: !!enabled,
        patch: patch ?? { verificationState: "Required", isRestricted: false }
      };
      console.info(TAG, "pushing config", cfg);
      dispatchConfig(cfg);
    } catch (e) {
      console.warn(TAG, "failed to read storage", e);
    }
  }

  pushCurrentConfig();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!("enabled" in changes) && !("patch" in changes)) return;
    pushCurrentConfig();
  });

  window.addEventListener("obligations-modifier:request-config", () => {
    console.info(TAG, "config requested by injected world");
    pushCurrentConfig();
  });
})();
