
(function () {
  "use strict";
  var SURFACE = "ticket-queue";
  var ENDPOINT = "https://nnsuyrhubsidwmrrsumm.supabase.co/functions/v1/issue-report";
  var errs = [];
  try {
    window.addEventListener("error", function (e) {
      try { errs.push(String(e && e.message || e)); if (errs.length > 8) errs.shift(); } catch (_) {}
    });
    window.addEventListener("unhandledrejection", function (e) {
      try { errs.push("promise: " + String((e && e.reason && e.reason.message) || (e && e.reason) || e)); if (errs.length > 8) errs.shift(); } catch (_) {}
    });
  } catch (_) {}

  function tokenFromUrl() {
    try { return new URLSearchParams(location.search).get("t") || ""; } catch (_) { return ""; }
  }
  // Best-effort scrape of whatever the page is currently showing the user.
  // MUST exclude our own button/panel: their copy contains the word "error", so a
  // naive body scrape reported the panel's own helper text as the page error
  // (caught in browser E2E, 2026-07-27).
  // Read the LIVE rendered text with our own UI hidden. Do NOT cloneNode here: a
  // detached clone is unrendered, so innerText degrades to textContent and drags in
  // the contents of every <script> tag — the second thing browser E2E caught, after
  // the panel's own copy (both 2026-07-27).
  function pageText() {
    var ids = ["opsIssueBtn", "opsIssuePanel"];
    var prev = [];
    try {
      ids.forEach(function (id) {
        var n = document.getElementById(id);
        prev.push([n, n ? n.style.display : null]);
        if (n) n.style.display = "none";
      });
      return (document.body.innerText || "").trim();
    } catch (_) {
      return "";
    } finally {
      try {
        prev.forEach(function (p) { if (p[0]) p[0].style.display = p[1] || ""; });
      } catch (__) {}
    }
  }
  function visibleError() {
    try {
      var t = pageText();
      var m = t.match(/[^\n]*(invalid token|not valid|denied|failed|unable|unavailable|no access|expired|went wrong|error)[^\n]*/i);
      if (m) return m[0].slice(0, 300);
      return t.length < 200 ? t.slice(0, 200) : "";
    } catch (_) { return ""; }
  }

  function build() {
    try {
      if (document.getElementById("opsIssueBtn")) return;
      var css = document.createElement("style");
      css.textContent =
        "#opsIssueBtn{position:fixed;right:14px;bottom:14px;z-index:2147483647;background:#b42318;color:#fff;" +
        "border:none;border-radius:999px;padding:10px 16px;font:600 13px/1.2 system-ui,Segoe UI,Arial,sans-serif;" +
        "cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.3)}" +
        "#opsIssueBtn:hover{background:#912018}" +
        "#opsIssuePanel{position:fixed;right:14px;bottom:62px;z-index:2147483647;width:310px;max-width:92vw;" +
        "background:#fff;color:#111;border:1px solid #d0d5dd;border-radius:10px;padding:14px;display:none;" +
        "box-shadow:0 8px 28px rgba(0,0,0,.28);font:13px/1.45 system-ui,Segoe UI,Arial,sans-serif}" +
        "#opsIssuePanel h4{margin:0 0 4px;font-size:14px}" +
        "#opsIssuePanel p{margin:0 0 8px;color:#475467;font-size:12px}" +
        "#opsIssuePanel textarea,#opsIssuePanel input{width:100%;box-sizing:border-box;border:1px solid #d0d5dd;" +
        "border-radius:6px;padding:7px;font:13px system-ui,Segoe UI,Arial,sans-serif;margin-bottom:8px;background:#fff;color:#111}" +
        "#opsIssuePanel textarea{height:78px;resize:vertical}" +
        "#opsIssueSend{background:#b42318;color:#fff;border:none;border-radius:6px;padding:8px 14px;font-weight:600;cursor:pointer}" +
        "#opsIssueCancel{background:none;border:none;color:#475467;cursor:pointer;padding:8px;font-size:12px}" +
        "#opsIssueMsg{font-size:12px;margin-top:6px}";
      document.head ? document.head.appendChild(css) : document.documentElement.appendChild(css);

      var btn = document.createElement("button");
      btn.id = "opsIssueBtn"; btn.type = "button";
      btn.textContent = "⚠ Report issue";

      var panel = document.createElement("div");
      panel.id = "opsIssuePanel";
      panel.innerHTML =
        '<h4>Report a problem</h4>' +
        '<p>Tell us what went wrong. We attach the page and any error automatically.</p>' +
        '<textarea id="opsIssueText" placeholder="What happened? e.g. the page says invalid token"></textarea>' +
        '<input id="opsIssueWho" type="text" placeholder="Your name (optional)">' +
        '<button id="opsIssueSend" type="button">Send</button>' +
        '<button id="opsIssueCancel" type="button">Cancel</button>' +
        '<div id="opsIssueMsg"></div>';

      document.body.appendChild(btn);
      document.body.appendChild(panel);

      btn.onclick = function () {
        panel.style.display = panel.style.display === "block" ? "none" : "block";
        try { document.getElementById("opsIssueText").focus(); } catch (_) {}
      };
      document.getElementById("opsIssueCancel").onclick = function () { panel.style.display = "none"; };
      document.getElementById("opsIssueSend").onclick = function () {
        var msgEl = document.getElementById("opsIssueMsg");
        var text = (document.getElementById("opsIssueText").value || "").trim();
        var who = (document.getElementById("opsIssueWho").value || "").trim();
        var ve = visibleError();
        if (!text && !ve) { msgEl.style.color = "#b42318"; msgEl.textContent = "Please describe the problem."; return; }
        msgEl.style.color = "#475467"; msgEl.textContent = "Sending...";
        var payload = {
          surface: SURFACE, message: text, reporter_label: who,
          visible_error: ve, page_path: location.href, token: tokenFromUrl(),
          diagnostics: {
            errors: errs.slice(-5), title: document.title,
            viewport: (window.innerWidth || 0) + "x" + (window.innerHeight || 0),
            online: navigator.onLine, ts: new Date().toISOString()
          }
        };
        try {
          fetch(ENDPOINT, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).then(function (r) { return r.json().catch(function () { return {}; }); })
            .then(function (j) {
              if (j && j.ok) {
                msgEl.style.color = "#067647";
                msgEl.textContent = "Thank you. Eddie has been notified.";
                document.getElementById("opsIssueText").value = "";
                setTimeout(function () { panel.style.display = "none"; msgEl.textContent = ""; }, 2200);
              } else {
                msgEl.style.color = "#b42318";
                msgEl.textContent = "Could not send. Please text Eddie.";
              }
            })
            .catch(function () {
              msgEl.style.color = "#b42318";
              msgEl.textContent = "Could not send. Please text Eddie.";
            });
        } catch (_) {
          msgEl.style.color = "#b42318";
          msgEl.textContent = "Could not send. Please text Eddie.";
        }
      };
    } catch (_) { /* the report button must never break the page */ }
  }

  try {
    if (document.body) build();
    else document.addEventListener("DOMContentLoaded", build);
  } catch (_) {}
})();
