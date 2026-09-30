/* A50 landing - scan form + result + interest form + reveal animations.
   Kural: kullanici verisi asla innerHTML ile basilmaz; tum metin textContent ile
   yazilir (XSS yuzeyi yok). */
(function () {
  "use strict";

  var API_BASE = (window.A50_API_BASE || "").replace(/\/$/, "");
  var CONTACT = window.A50_CONTACT || "";
  var FORMSPREE_SCAN = window.A50_FORMSPREE_SCAN || "https://formspree.io/f/mbglbazn";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null && text !== "") node.textContent = String(text);
    return node;
  }

  function setStatus(node, message, isError) {
    node.textContent = message || "";
    node.classList.toggle("error", !!isError);
  }

  function criticalCount(fails) {
    return fails.filter(function (f) { return f.severity === "critical"; }).length;
  }

  function renderTable(box, findings) {
    var table = document.createElement("table");
    var head = document.createElement("tr");
    ["Rule", "Severity", "Status", "What"].forEach(function (h) {
      head.appendChild(el("th", null, h));
    });
    table.appendChild(head);
    findings.slice(0, 8).forEach(function (finding) {
      var row = document.createElement("tr");
      row.appendChild(el("td", null, finding.rule_id));
      var sev = el("td", null, "");
      sev.appendChild(el("span", "pill pill-" + (finding.severity || "low"), finding.severity));
      row.appendChild(sev);
      row.appendChild(el("td", null, finding.status));
      row.appendChild(el("td", null, finding.what_is_missing || finding.title || ""));
      table.appendChild(row);
    });
    box.appendChild(table);
  }

  function showResultBox(data) {
    var box = document.getElementById("scan-result");
    box.hidden = false;
    box.textContent = "";

    var head = el("div", "res-head");
    head.appendChild(el("h3", null, "Preview result"));
    box.appendChild(head);

    var target = (data.target && data.target.url) || "";
    var meta = el("p", "hint");
    meta.appendChild(document.createTextNode(
      "Target: " + target + " - Status: " + (data.crawl_status || "") +
      " - Ruleset: " + (data.ruleset_version || "")
    ));
    box.appendChild(meta);

    if (data.crawl_status === "BLOCKED") {
      box.appendChild(el("div", "res-warning",
        "Scan blocked: no page content could be observed. See details below."));
    }

    var findings = data.findings || [];
    var fails = findings.filter(function (f) { return f.status === "fail"; });
    var nvs = findings.filter(function (f) { return f.status === "NOT_VERIFIABLE"; });

    var summary = el("p", null, fails.length
      ? (fails.length + " gap(s) observed, " + criticalCount(fails) +
         " critical. The full one-page PDF lists every finding with its evidence.")
      : "No gaps observed in this preview. The full report documents the pages checked.");
    box.appendChild(summary);

    renderTable(box, findings);

    box.appendChild(el("p", "hint",
      nvs.length + " not-verifiable item(s). Full report: PDF download after checkout (EUR 99 per site)."));
    box.appendChild(el("p", "fineprint", "This is a sourced checklist, not legal advice."));
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function postFormspreeFallback(payload) {
    return fetch(FORMSPREE_SCAN, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        email: payload.email || "",
        message: "A50 scan request - URL: " + payload.url,
        source: "a50-scan-form"
      })
    }).then(function (response) {
      if (!response.ok) throw new Error("fallback failed (" + response.status + ")");
      return true;
    });
  }

  function nativeFormspreeSubmit(payload) {
    var form = document.createElement("form");
    form.method = "POST";
    form.action = FORMSPREE_SCAN;
    form.target = "_blank";
    form.style.display = "none";
    var body = {
      email: payload.email || "",
      message: "A50 scan request - URL: " + payload.url,
      source: "a50-scan-form"
    };
    [["email", body.email],
     ["message", body.message],
     ["source", body.source]]
      .forEach(function (pair) {
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = pair[0];
        input.value = pair[1];
        form.appendChild(input);
      });
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  function bindScanForm() {
    var form = document.getElementById("scan-form");
    if (!form) return;
    var urlInput = document.getElementById("scan-url");
    var submit = document.getElementById("scan-submit");
    var errorBox = document.getElementById("scan-error");
    var okBox = document.getElementById("scan-ok");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      errorBox.hidden = true;
      okBox.hidden = true;

      var url = (urlInput.value || "").trim();
      if (!url) {
        urlInput.setAttribute("aria-invalid", "true");
        urlInput.focus();
        errorBox.textContent = "Paste the site address you want to scan.";
        errorBox.hidden = false;
        return;
      }
      urlInput.removeAttribute("aria-invalid");

      submit.disabled = true;
      submit.textContent = "Scanning…";

      var payload = { url: url, email: "", source: "landing" };

      fetch(API_BASE + "/api/v1/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().catch(function () { return null; }).then(function (body) {
            if (!response.ok) {
              var code = body && body.error ? body.error.code : "error";
              var message = body && body.error ? body.error.message : "Scan failed.";
              throw new Error(code + ": " + message);
            }
            return body;
          });
        })
        .then(function (data) {
          okBox.textContent = "Scan complete.";
          okBox.hidden = false;
          showResultBox(data);
        })
        .catch(function (err) {
          postFormspreeFallback(payload).then(function () {
            okBox.textContent = "Your request was sent - we'll run the scan and email you the result.";
            okBox.hidden = false;
          }, function () {
            try {
              nativeFormspreeSubmit(payload);
              okBox.textContent = "Your request was sent - we'll run the scan and email you the result.";
              okBox.hidden = false;
            } catch (e) {
              errorBox.textContent = String(err && err.message ? err.message : err);
              errorBox.hidden = false;
            }
          });
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = "Run free preview scan";
        });
    });
  }

  function bindInterestForm() {
    var form = document.getElementById("interest-form");
    if (!form) return;
    var emailInput = document.getElementById("interest-email");
    var errorBox = document.getElementById("interest-error");
    var okBox = document.getElementById("interest-ok");
    var submit = document.getElementById("interest-submit");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      errorBox.hidden = true;
      okBox.hidden = true;

      var email = (emailInput.value || "").trim();
      if (!email || email.indexOf("@") < 1) {
        emailInput.setAttribute("aria-invalid", "true");
        emailInput.focus();
        errorBox.textContent = "That email address doesn't look right. Check it and try again.";
        errorBox.hidden = false;
        return;
      }
      emailInput.removeAttribute("aria-invalid");

      submit.disabled = true;
      submit.textContent = "Adding…";

      fetch(API_BASE + "/api/v1/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, source: "landing" })
      })
        .then(function (response) {
          if (!response.ok) throw new Error("subscribe failed");
          return response.json();
        })
        .then(function () {
          okBox.textContent = "Saved. We will email you when a rule changes.";
          okBox.hidden = false;
          form.reset();
        })
        .catch(function () {
          fetch(FORMSPREE_SCAN, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ email: email, message: "A50 rule-change notification signup.", source: "a50-interest" })
          }).then(function (response) {
            if (!response.ok) throw new Error("fallback failed");
            okBox.textContent = "Saved. We will email you when a rule changes.";
            okBox.hidden = false;
            form.reset();
          }, function () {
            errorBox.textContent = "Could not save right now. Try again later.";
            errorBox.hidden = false;
          });
        })
        .then(function () {
          submit.disabled = false;
          submit.textContent = "Notify me";
        });
    });
  }

  function initResultPage() {
    var container = document.getElementById("result-body");
    if (!container) return;
    var status = document.getElementById("result-status");
    var params = new URLSearchParams(location.search);
    var id = params.get("id") || "";
    var token = params.get("token") || "";

    if (!id || !token) {
      status.textContent = "This link is incomplete. Run a new scan to get a fresh link.";
      status.classList.add("error");
      return;
    }

    fetch(API_BASE + "/api/v1/scan/" + encodeURIComponent(id) + "?token=" + encodeURIComponent(token))
      .then(function (r) {
        return r.json().catch(function () { return null; }).then(function (data) {
          if (!r.ok) {
            var message = data && data.error && data.error.message
              ? data.error.message
              : "This result link is invalid or has expired.";
            throw new Error(message);
          }
          return data;
        });
      })
      .then(function (data) {
        status.textContent = "";
        container.appendChild(el("h2", null, "Target: " + ((data.target && data.target.url) || "")));
        container.appendChild(el("p", "hint",
          "Status: " + (data.crawl_status || "") + " - Ruleset: " + (data.ruleset_version || "")));

        var findings = data.findings || [];
        if (findings.length) {
          var table = document.createElement("table");
          var head = document.createElement("tr");
          ["Rule", "Severity", "Status", "What"].forEach(function (h) {
            head.appendChild(el("th", null, h));
          });
          table.appendChild(head);
          findings.forEach(function (f) {
            var row = document.createElement("tr");
            row.appendChild(el("td", null, f.rule_id));
            var sev = el("td", null, "");
            sev.appendChild(el("span", "pill pill-" + (f.severity || "low"), f.severity));
            row.appendChild(sev);
            row.appendChild(el("td", null, f.status));
            row.appendChild(el("td", null, f.what_is_missing || f.title || ""));
            table.appendChild(row);
          });
          container.appendChild(table);
        } else {
          container.appendChild(el("p", null, "No gaps observed in this scan."));
        }

        var pdf = document.createElement("a");
        pdf.className = "btn btn-primary";
        pdf.href = API_BASE + "/api/v1/scan/" + encodeURIComponent(id) + "/report.pdf?token=" + encodeURIComponent(token);
        pdf.textContent = "Download the one-page PDF report (paid unit: EUR 99)";
        var wrap = el("p", null, "");
        wrap.appendChild(pdf);
        container.appendChild(wrap);

        container.appendChild(el("p", "fineprint", "This is a sourced checklist, not legal advice."));
      })
      .catch(function (err) {
        status.textContent = String(err && err.message ? err.message : err);
        status.classList.add("error");
      });
  }

  function initReveal() {
    var targets = document.querySelectorAll(
      ".step.card, .example-grid .alert-card, .trust-item, #who .card, .hero-visual .result-card"
    );
    if (!targets.length) return;
    if (!("IntersectionObserver" in window)) return;
    targets.forEach(function (node) { node.classList.add("reveal"); });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (node) { observer.observe(node); });
  }

  function init() {
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
    var contact = document.getElementById("contact");
    if (contact) contact.textContent = CONTACT;
    initReveal();
    bindScanForm();
    bindInterestForm();
    initResultPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
