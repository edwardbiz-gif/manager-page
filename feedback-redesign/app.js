/* app.js — theme-independent ENGINE for the reformatted manager views.
   Renders sections from window.MP_DATA (same shape the manager-page function
   returns), builds the sticky bottom-tab scrollspy nav, and enforces the
   "show top 3 OR what's due today (whichever is greater), 'see all' expands to
   top 10" rule for every section. Identical across all 5 aesthetics. */
(function () {
  var D = window.MP_DATA;
  var TODAY = D.generated_through; // 'YYYY-MM-DD'
  var MAX_EXPANDED = 10;

  function esc(s) { return String(s == null ? "" : s).replace(/[<>&]/g, function (c) { return ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]; }); }
  function dpart(iso) { return String(iso || "").slice(0, 10); }
  function fmtDate(iso) {
    var d = dpart(iso); if (!d) return "";
    var mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var p = d.split("-"); return mo[+p[1] - 1] + " " + (+p[2]);
  }
  function money(n) { return "$" + Math.round(n).toLocaleString(); }
  function stars(r) { if (r == null) return ""; var s = ""; for (var i = 1; i <= 5; i++) s += i <= r ? "★" : "☆"; return '<span class="stars">' + s + "</span>"; }
  function isDueToday(d) { return dpart(d) === TODAY; }

  var SRC_LABEL = { complaint: "1-800", smg: "SMG", google: "Google", review: "Review" };

  function sentBadge(it) {
    if (it.source === "complaint") return '<span class="badge b-neg">Complaint</span>';
    if (it.sentiment === "negative") return '<span class="badge b-neg">Low</span>';
    if (it.sentiment === "neutral") return '<span class="badge b-warn">Mixed</span>';
    return '<span class="badge b-ok">Praise</span>';
  }
  function prioBadge(p) {
    if (p === "urgent") return '<span class="badge b-neg">Urgent</span>';
    if (p === "high") return '<span class="badge b-warn">High</span>';
    return "";
  }
  function dueChip(due) {
    if (!due) return "";
    if (isDueToday(due)) return '<span class="badge b-warn due-today">Due today</span>';
    if (dpart(due) < TODAY) return '<span class="badge b-neg">Overdue</span>';
    return '<span class="sub" style="margin:0">due ' + fmtDate(due) + "</span>";
  }
  function kindBadge(k) {
    if (k === "promo") return '<span class="badge b-info">Promo</span>';
    if (k === "deadline") return '<span class="badge b-warn">Deadline</span>';
    return '<span class="badge b-ok">Event</span>';
  }

  /* ---- per-section item renderers: each returns {html, due} ---- */
  function fbItem(it) {
    return { due: false, html:
      '<div class="item"><div class="row1"><span class="ttl">' + esc(it.store_name || "Org-wide") + "</span>" + sentBadge(it) + "</div>" +
      '<div class="sub"><span class="src">' + (SRC_LABEL[it.source] || it.source) + "</span> · " + esc(it.topic || "") +
        " · " + fmtDate(it.occurred_at) + " " + stars(it.rating) + "</div>" +
      '<div class="body">' + esc(it.body_text || "") + "</div></div>" };
  }
  function taskItem(t) {
    var due = isDueToday(t.due_at) || dpart(t.due_at) < TODAY;
    return { due: due, html:
      '<div class="item"><div class="row1"><span class="ttl">' + esc(t.title) + "</span>" + prioBadge(t.priority) + "</div>" +
      '<div class="sub">' + esc(t.store_name || "Cross-store") + (t.category ? " · " + esc(t.category) : "") + " · " + dueChip(t.due_at) +
        (t.cohorts ? " · with " + esc(t.cohorts) : "") + "</div></div>" };
  }
  function complaintItem(c) {
    var due = isDueToday(c.due_at) || dpart(c.due_at) < TODAY;
    return { due: due, html:
      '<div class="item"><div class="row1"><span class="ttl">' + esc(c.store_name || "") + " · " + esc(c.issue_category || "") + "</span>" +
        (c.recovery_needed ? '<span class="badge b-neg">Recovery</span>' : "") + "</div>" +
      '<div class="sub">#' + esc(c.case_number) + " · " + dueChip(c.due_at) + "</div>" +
      '<div class="body">' + esc(c.comment || "") + "</div></div>" };
  }
  function voiceItem(v) {
    return { due: false, html:
      '<div class="item"><div class="row1"><span class="ttl">' + esc(v.store_name) + "</span>" +
        '<span class="badge ' + (v.osat >= 78 ? "b-ok" : v.osat >= 73 ? "b-warn" : "b-neg") + '">OSAT ' + v.osat.toFixed(1) + "</span></div>" +
      '<div class="sub">Accuracy ' + v.accuracy.toFixed(1) + " · Clean " + v.cleanliness.toFixed(1) + " · n=" + v.n + "</div></div>" };
  }
  function calItem(e) {
    return { due: isDueToday(e.event_date), html:
      '<div class="item"><div class="row1"><span class="ttl">' + esc(e.title) + "</span>" + kindBadge(e.kind) + "</div>" +
      '<div class="sub">' + fmtDate(e.event_date) + (e.store_name ? " · " + esc(e.store_name) : "") + " · " + dueChip(e.event_date) + "</div></div>" };
  }

  /* ---- section configs ---- */
  var SECTIONS = [
    { id: "feedback", label: "Feedback", ic: "💬",
      build: function () {
        var cf = D.customer_feedback, s = cf.summary;
        var strip = '<div class="cf-summary">' +
          '<div class="cf-stat alert"><div class="n">' + s.needs_response + '</div><div class="l">Need reply</div></div>' +
          '<div class="cf-stat"><div class="n">' + s.last30_negative + '</div><div class="l">Neg · 30d</div></div>' +
          '<div class="cf-stat"><div class="n">' + (s.avg_rating_30 != null ? s.avg_rating_30 : "—") + '</div><div class="l">Avg ★ · 30d</div></div>' +
          '<div class="cf-stat"><div class="n">' + s.last30_total + '</div><div class="l">Total · 30d</div></div></div>';
        return { pre: strip, items: cf.items.map(fbItem), alert: s.needs_response > 0,
                 meta: "data through " + fmtDate(cf.data_through) };
      } },
    { id: "tasks", label: "Tasks", ic: "✅",
      build: function () {
        var its = D.tasks.map(taskItem);
        return { items: its, alert: its.some(function (i) { return i.due; }) || D.tasks.some(function (t) { return t.priority === "urgent"; }),
                 meta: D.tasks.length + " active" };
      } },
    { id: "complaints", label: "Complaints", ic: "📣",
      build: function () {
        var its = D.complaints.map(complaintItem);
        return { items: its, alert: its.some(function (i) { return i.due; }), meta: D.complaints.length + " open · 72h SLA" };
      } },
    { id: "performance", label: "Perf", ic: "📈",
      build: function () {
        var sales = D.performance.sales[0];
        var pre = '<div class="cf-summary">' +
          '<div class="cf-stat"><div class="n">' + money(sales.mtd_product_sales) + '</div><div class="l">MTD sales</div></div>' +
          '<div class="cf-stat"><div class="n">' + (sales.mtd_yoy_pct >= 0 ? "+" : "") + sales.mtd_yoy_pct + '%</div><div class="l">YoY</div></div>' +
          '<div class="cf-stat"><div class="n">$' + sales.mtd_avg_check.toFixed(2) + '</div><div class="l">Avg check</div></div></div>';
        return { pre: pre, items: D.performance.voice.map(voiceItem), alert: false,
                 meta: "VOICE through " + fmtDate(D.performance.data_through) };
      } },
    { id: "calendar", label: "Calendar", ic: "📅",
      build: function () {
        var its = D.calendar.map(calItem);
        return { items: its, alert: its.some(function (i) { return i.due; }), meta: "next 60 days" };
      } },
  ];

  /* ---- render ---- */
  function render() {
    var root = document.getElementById("board");
    var m = D.manager;
    var html = '<div class="hdr"><div class="mark">M</div><div><h1>' + esc(m.first_name) + "’s board</h1>" +
      '<div class="who">' + esc(m.role) + (D.scope_all ? " · all stores" : "") + " · " + fmtDate(D.generated_through + "T00:00:00Z") + "</div></div></div>";

    SECTIONS.forEach(function (sec) {
      var b = sec.build();
      var items = b.items || [];
      var dueCount = items.filter(function (i) { return i.due; }).length;
      var visible = Math.min(items.length, Math.max(3, dueCount));      // top 3 OR due-today, whichever greater
      var capped = items.slice(0, MAX_EXPANDED);                         // see-all caps at 10
      var head = items.slice(0, visible).map(function (i) { return i.html; }).join("");
      var extra = capped.slice(visible).map(function (i) { return i.html; }).join("");
      var hasMore = capped.length > visible;

      html += '<section class="section" id="sec-' + sec.id + '"' + (b.alert ? ' data-alert="1"' : "") + ">" +
        '<div class="s-head"><span class="s-title">' + sec.ic + " " + esc(sec.label) + "</span>" +
          '<span class="s-meta">' + esc(b.meta || "") + "</span></div>" +
        (b.pre || "") +
        '<div class="card">' + head +
          (hasMore ? '<div class="hidden-extra">' + extra + "</div>" +
            '<button class="see-all" data-sec="' + sec.id + '"><span class="more">See all (' + capped.length + ") ▾</span>" +
            '<span class="less">Show less ▴</span></button>' : "") +
        "</div></section>";
    });

    html += '<div class="foot">Tap a tab to jump · scroll to navigate · data-through shown per section</div>';
    root.innerHTML = html;

    // tabbar
    var tabs = SECTIONS.map(function (sec) {
      var alert = document.getElementById("sec-" + sec.id).getAttribute("data-alert");
      return '<button class="tab' + (alert ? " has-alert" : "") + '" data-target="sec-' + sec.id + '">' +
        '<span class="ic">' + sec.ic + '</span><span class="dot"></span>' + esc(sec.label) + "</button>";
    }).join("");
    document.getElementById("tabs").innerHTML = tabs;

    wire();
  }

  function wire() {
    // see-all toggles
    Array.prototype.forEach.call(document.querySelectorAll(".see-all"), function (btn) {
      btn.addEventListener("click", function () { btn.closest(".section").classList.toggle("expanded"); });
    });
    // tab tap -> scroll
    var tabBtns = Array.prototype.slice.call(document.querySelectorAll(".tab"));
    tabBtns.forEach(function (t) {
      t.addEventListener("click", function () {
        var el = document.getElementById(t.getAttribute("data-target"));
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    // scrollspy: highlight the tab for the section currently in view
    var byId = {};
    tabBtns.forEach(function (t) { byId[t.getAttribute("data-target")] = t; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          tabBtns.forEach(function (b) { b.classList.remove("active"); });
          var t = byId[e.target.id]; if (t) t.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    SECTIONS.forEach(function (sec) { obs.observe(document.getElementById("sec-" + sec.id)); });
    if (tabBtns[0]) tabBtns[0].classList.add("active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
