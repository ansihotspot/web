(() => {
  const ATTR_DATA = "data-obligations-modifier";

  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.setAttribute(ATTR_DATA, "1");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  let defaultPayloadString = null;

  async function loadDefault() {
    if (defaultPayloadString !== null) return defaultPayloadString;
    try {
      const res = await fetch(chrome.runtime.getURL("default-payload.json"));
      const obj = await res.json();
      defaultPayloadString = JSON.stringify(obj);
    } catch (e) {
      console.warn("[ObligationsModifier] impossible de charger default-payload.json", e);
      defaultPayloadString = '{"content":[],"errors":[],"warnings":[],"information":[],"isValid":true}';
    }
    return defaultPayloadString;
  }

  function dispatchConfig(detail) {
    window.dispatchEvent(new CustomEvent("obligations-modifier:config", { detail }));
  }

  async function pushCurrentConfig() {
    const [{ enabled, payload }, defaultPayload] = await Promise.all([
      chrome.storage.local.get(["enabled", "payload"]),
      loadDefault()
    ]);
    dispatchConfig({
      enabled: !!enabled,
      payload: payload ?? null,
      defaultPayload
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
