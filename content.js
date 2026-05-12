(() => {
  const ATTR_DATA = "data-obligations-modifier";

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.setAttribute(ATTR_DATA, "1");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  function dispatchConfig(detail) {
    window.dispatchEvent(new CustomEvent("obligations-modifier:config", { detail }));
  }

  async function pushCurrentConfig() {
    const { enabled, payload } = await chrome.storage.local.get(["enabled", "payload"]);
    dispatchConfig({
      enabled: !!enabled,
      payload: payload ?? null
    });
  }

  pushCurrentConfig();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!("enabled" in changes) && !("payload" in changes)) return;
    pushCurrentConfig();
  });

  window.addEventListener("obligations-modifier:request-config", pushCurrentConfig);
})();
