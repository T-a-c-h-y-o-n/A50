/* A50 landing - runtime config (no build step).
   Landing statik olarak Vercel'de, API ayrı sunucuda çalışır.
   [VERIFY] API alan adı kesinleşince üretim satırı güncellenir. */
(function () {
  var host = location.hostname || "";
  var isLocal = host === "localhost" || host === "127.0.0.1" || host === "";
  window.A50_API_BASE = isLocal
    ? "http://127.0.0.1:8000"
    : "https://api.a50.ai2eo.com";
  window.A50_CONTACT = "info@ai2eo.com";
  window.A50_FORMSPREE_SCAN = "https://formspree.io/f/mbglbazn";
})();
