/* screen-kit.js v2 (2026-11-13) — shared engine for the crew TV screens (kitchen.html + service.html).
   Frame (team scorebug + clock + "on now" shift + progress rail), card rotation with per-card timing,
   in-place data refresh (no white flash), offline cache, count-ups, ladders, line charts.
   Plain ES2017, no dependencies: it has to run on a Fire Stick browser. Each screen supplies only
   its card list: TV.boot({kind, fn, label, labelEs, build(d, ctx) -> [{id, dur, html, foot}] }).
   Test hooks (harmless in production): &src=_fx/<file>.json loads a saved payload instead of the
   function, &card=<id or index> pins one card, &speed=<n> shortens every card, &hour=<0-23> fakes the clock. */
var TV = (function () {
  "use strict";
  var qs = new URLSearchParams(location.search);
  var STORE = qs.get("store") || "3444";

  // The 12 crew teams (approved names, design-assets/newscast/teams/teams.json). c = team color.
  var TEAMS = {
    "72":    { t: "Lake Street Lamplighters", c: "#1E6BFF" },
    "3199":  { t: "Lisle Mighty Oaks", c: "#3f9443" },
    "3444":  { t: "Boulder Hill Tusks", c: "#8FD3F4" },
    "4152":  { t: "Farnsworth Freight", c: "#1FA85A" },
    "4188":  { t: "Yorkville Whitewater", c: "#20C5C9" },
    "11965": { t: "River Road Bellringers", c: "#B0793A" },
    "16669": { t: "Eola Otters", c: "#138A8A" },
    "20065": { t: "Oswego Tee Rexes", c: "#8BC34A" },
    "31728": { t: "Orchard Stagecoaches", c: "#b8323f" },
    "31637": { t: "Kirk Bison", c: "#E0A526" },
    "35354": { t: "North Naperville Radar", c: "#2FBF71" },
    "37131": { t: "Plano Harvesters", c: "#D9A441" }
  };
  var DAYPARTS = [
    { key: "base_12a_5a", from: 0, to: 5, en: "Late night", es: "Madrugada" },
    { key: "base_5a_11a", from: 5, to: 11, en: "Breakfast", es: "Desayuno" },
    { key: "base_11a_4p", from: 11, to: 16, en: "Lunch", es: "Almuerzo" },
    { key: "base_4p_12a", from: 16, to: 24, en: "Dinner", es: "Cena" }
  ];
  var MES = { January: "enero", February: "febrero", March: "marzo", April: "abril", May: "mayo", June: "junio",
    July: "julio", August: "agosto", September: "septiembre", October: "octubre", November: "noviembre", December: "diciembre",
    Jan: "ene", Feb: "feb", Mar: "mar", Apr: "abr", Jun: "jun", Jul: "jul", Aug: "ago", Sep: "sep", Oct: "oct", Nov: "nov", Dec: "dic" };
  var DOW_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

  // ── small helpers ──
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmt(v, dec) { return v == null || isNaN(+v) ? "—" : Number(v).toFixed(dec || 0); }
  function commas(v) { return v == null || isNaN(+v) ? "—" : Math.round(+v).toLocaleString("en-US"); }
  function sfx(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; }
  function ord(n) { return n + sfx(n); }
  // "November 2026" -> "noviembre 2026"; "Nov 12" -> "12 nov"
  function mes(label) {
    var p = String(label || "").split(" ");
    if (p.length === 2 && /^\d{1,2}$/.test(p[1])) return p[1] + " " + (MES[p[0]] || p[0]);
    p[0] = MES[p[0]] || p[0]; return p.join(" ");
  }
  function mon(label) { return String(label || "").split(" ")[0]; }
  function isoLabel(iso) { // "2026-11-12" -> "Nov 12"
    if (!iso) return "";
    var d = new Date(String(iso).slice(0, 10) + "T12:00:00Z");
    return isNaN(d) ? String(iso) : d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }
  function bi(en, es) { return en + (es ? ' <span class="es"><i class="sep">· </i>' + es + "</span>" : ""); }
  function mix(hex, k) { // darken a #rrggbb toward black; k = share of the color kept
    var n = parseInt(hex.slice(1), 16);
    return "rgb(" + Math.round(((n >> 16) & 255) * k) + "," + Math.round(((n >> 8) & 255) * k) + "," + Math.round((n & 255) * k) + ")";
  }
  function ctNow() { // Central time parts, whatever the device clock zone is
    var d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
    if (isNaN(d)) d = new Date();
    var fake = qs.get("hour");
    if (fake != null && /^\d{1,2}$/.test(fake)) d.setHours(+fake);
    return d;
  }
  function ctToday() { var d = ctNow(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function daysLeft() { var d = ctNow(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate(); }
  function nowDaypart() { var h = ctNow().getHours(); for (var i = 0; i < DAYPARTS.length; i++) if (h >= DAYPARTS[i].from && h < DAYPARTS[i].to) return DAYPARTS[i]; return null; }
  function crest(nsn, cls) {
    return TEAMS[String(nsn)] ? '<img' + (cls ? ' class="' + cls + '"' : "") + ' src="assets/teams/' + esc(nsn) + '.webp" alt="" onerror="this.style.display=\'none\'">' : "";
  }
  function teamName(nsn, fallback) { var t = TEAMS[String(nsn)]; return t ? t.t : (fallback || ""); }

  // ── building blocks (all return HTML strings; "a" = animates in, --i = stagger order) ──
  function head(o) {
    return '<div class="hd">' +
      '<div class="eyebrow a" style="--i:0">' + bi(o.eb, o.ebEs) + "</div>" +
      (o.h ? '<div class="h1 a" style="--i:1">' + o.h + "</div>" : "") +
      (o.hEs ? '<div class="h1es a" style="--i:2">' + o.hEs + "</div>" : "") + "</div>";
  }
  // count-up number: animates from 0 when the card appears
  function cu(v, dec) {
    if (v == null || isNaN(+v)) return "—";
    return '<span class="cu num" data-v="' + (+v) + '" data-d="' + (dec || 0) + '">' + fmt(v, dec) + "</span>";
  }
  function stat(en, es, valueHtml, tone) {
    return '<div class="stat"><div class="l">' + en + "<span>" + es + '</span></div><div class="v ' + (tone || "") + '">' + valueHtml + "</div></div>";
  }
  function rankBlock(rank, total) {
    if (rank == null) return '<div class="rank a" style="--i:3"><span class="n">—</span></div>';
    if (rank === 1) return '<div class="rank lead a" style="--i:3"><span class="n">🏆 #1</span><span class="of">of ' + total + "<span>de " + total + "</span></span></div>";
    return '<div class="rank a" style="--i:3"><span class="n num">' + rank + '</span><span class="sfx">' + sfx(rank) + '</span>' +
      '<span class="of">of ' + total + "<span>lugar " + rank + " de " + total + "</span></span></div>";
  }
  // Ladder of all stores. rows are best-first: {nsn, name, v, me, rk?, dim?}
  function ladder(rows, o) {
    o = o || {};
    var vals = rows.map(function (r) { return +r.v; });
    var best = vals[0], worst = vals[vals.length - 1], span = Math.abs(best - worst);
    var h = '<div class="ladder' + (o.compact ? " compact" : "") + '">';
    rows.forEach(function (r, i) {
      var frac = span > 0 ? Math.abs(+r.v - worst) / span : 1;
      var w = Math.round(28 + 72 * frac);
      h += '<div class="lr' + (r.me ? " me" : "") + (i === 0 ? " top" : "") + (r.dim ? " dimrow" : "") + '" style="--i:' + i + '">' +
        '<span class="rk num">' + (r.rk != null ? r.rk : i + 1) + "</span>" +
        '<span class="cr">' + crest(r.nsn) + "</span>" +
        '<span class="nm">' + esc(r.name) + "</span>" +
        '<span class="tr"><span class="fl" style="display:block;width:' + w + "%;--i:" + i + '"></span></span>' +
        '<span class="vl num">' + fmt(r.v, o.dec) + (o.unit ? '<span class="u">' + o.unit + "</span>" : "") + "</span></div>";
    });
    return h + "</div>";
  }
  // The next rung: what it takes to pass the store right above us (or how far ahead we are at #1).
  function coach(rows, i, o) {
    if (i == null || i < 0 || !rows.length) return "";
    var dec = o.dec || 0, me = rows[i], en, es, win = false;
    if (i === 0) {
      win = true;
      if (rows.length < 2) { en = "We lead the board. Hold it!"; es = "Vamos primeros. ¡A mantenerlo!"; }
      else {
        var lead = Math.abs(+me.v - +rows[1].v);
        en = "We lead " + esc(rows[1].name) + " by " + fmt(lead, dec) + " " + o.unitEn + ". Hold it!";
        es = "Ventaja de " + fmt(lead, dec) + " " + o.unitEs + " sobre " + esc(rows[1].name) + ". ¡A mantenerla!";
      }
    } else {
      var up = rows[i - 1], gap = Math.abs(+me.v - +up.v);
      if (+fmt(gap, dec) === 0) {
        en = "Tied with " + esc(up.name) + ". One more push takes " + ord(i) + "!";
        es = "Empatados con " + esc(up.name) + ". ¡Un empujón más y subimos!";
      } else if (o.lower) {
        en = fmt(gap, dec) + " " + o.unitEn + " faster passes " + esc(up.name) + " for " + ord(i);
        es = fmt(gap, dec) + " " + o.unitEs + " más rápido y pasamos a " + esc(up.name);
      } else {
        en = fmt(gap, dec) + " " + o.unitEn + " to pass " + esc(up.name) + " for " + ord(i);
        es = "A " + fmt(gap, dec) + " " + o.unitEs + " de pasar a " + esc(up.name);
      }
    }
    return '<div class="coach a' + (win ? " win" : "") + '" style="--i:4"><div class="en">' + en + '</div><div class="es">' + es + "</div></div>";
  }
  // Rank movement since the last day this TV saw a different date (kept on the device only).
  function movement(key, rank) {
    if (rank == null) return "";
    try {
      var k = "tvmv:" + STORE + ":" + key, today = ctToday(), s = JSON.parse(localStorage.getItem(k) || "null") || {};
      if (!s.cur || s.cur.d !== today) { if (s.cur) s.prev = s.cur; s.cur = { d: today, r: rank }; }
      else s.cur.r = rank;
      localStorage.setItem(k, JSON.stringify(s));
      if (!s.prev) return "";
      var age = (new Date(today) - new Date(s.prev.d)) / 864e5, delta = s.prev.r - rank;
      if (age > 4 || !delta) return "";
      var when = age <= 1 ? ["yesterday", "ayer"] : [isoLabel(s.prev.d), mes(isoLabel(s.prev.d))];
      return delta > 0
        ? '<div class="move up a" style="--i:5">▲ Up ' + delta + " since " + when[0] + " · Subimos " + delta + " desde " + when[1] + "</div>"
        : '<div class="move dn a" style="--i:5">▼ Down ' + (-delta) + " since " + when[0] + " · Bajamos " + (-delta) + " desde " + when[1] + "</div>";
    } catch (e) { return ""; }
  }
  // Shift Showdown lanes (same payload on both screens).
  function showdown(sd, nowKey) {
    var MD = ["🥇", "🥈", "🥉", "🏅"];
    var rows = sd.dayparts.filter(function (p) { return p.rank != null; }).sort(function (a, b) { return a.rank - b.rank; });
    var out = sd.dayparts.filter(function (p) { return p.rank == null; });
    var h = '<div class="lanes">';
    rows.forEach(function (p, i) {
      var pills = "";
      if (p.delta != null) pills += '<span class="pill ' + (p.delta >= 0 ? "up" : "dn") + '">' + (p.delta >= 0 ? "+" : "−") + Math.abs(p.delta).toFixed(1) + " vs org · mismo turno</span>";
      if (p.arrow === "up") pills += '<span class="pill up">▲ vs ' + esc(sd.prev_month) + " · " + esc(mes(sd.prev_month)) + "</span>";
      else if (p.arrow === "down") pills += '<span class="pill dn">▼ vs ' + esc(sd.prev_month) + " · " + esc(mes(sd.prev_month)) + "</span>";
      else if (p.arrow === "flat") pills += '<span class="pill">▬ even · igual vs ' + esc(mes(sd.prev_month)) + "</span>";
      h += '<div class="lane a' + (p.rank === 1 ? " lead" : "") + '" style="--i:' + (i + 3) + '">' +
        '<span class="md">' + (MD[p.rank - 1] || p.rank) + "</span>" +
        '<span class="who"><span class="sn">' + esc(p.label_en) + ' <span class="es">· ' + esc(p.label_es) + "</span>" +
        (p.key === nowKey ? '<span class="on">● ON NOW · AHORA</span>' : "") + "</span>" +
        '<div class="sw">' + esc(p.window) + (p.n != null ? " · " + p.n + " surveys · encuestas" : "") + "</div></span>" +
        '<span class="meter"><span class="fl" style="width:' + Math.max(4, Math.min(100, p.osat)) + "%;--i:" + i + '"></span>' +
        (p.org != null ? '<span class="org" style="left:' + p.org + '%"></span><span class="orgl" style="left:' + p.org + '%">org ' + p.org.toFixed(1) + "</span>" : "") + "</span>" +
        '<span class="sc num">' + cu(p.osat, 1) + '<span class="u">%</span></span>' +
        '<span class="pl">' + pills + "</span></div>";
    });
    out.forEach(function (p, i) {
      h += '<div class="lane dim a" style="--i:' + (rows.length + i + 3) + '"><span class="md">⏳</span>' +
        '<span class="who"><span class="sn">' + esc(p.label_en) + ' <span class="es">· ' + esc(p.label_es) + "</span></span>" +
        '<div class="sw">' + esc(p.window) + "</div></span>" +
        '<span class="why">' + esc(String(p.state_copy || "").replace(" / ", " · ") || (p.state === "no_surveys" ? "No surveys yet this month · Sin encuestas aún este mes" : "Data delayed · Datos retrasados")) + "</span></div>";
    });
    return h + "</div>";
  }
  function showdownCard(sd, ctx) {
    if (!sd || !sd.dayparts || !sd.dayparts.some(function (p) { return p.rank != null; })) return null;
    return { id: "showdown", dur: 15,
      html: head({ eb: "Shift Showdown · " + esc(sd.month) + " month to date", ebEs: "Duelo de turnos · " + esc(mes(sd.month)),
        h: "Which shift wins our guests?", hEs: "¿Qué turno conquista a nuestros clientes?" }) + showdown(sd, ctx.nowKey),
      foot: "Guest satisfaction by shift, " + esc(sd.month) + " month to date" + (sd.data_through ? ", through " + esc(sd.data_through) : "") +
        " · white tick = org, same shift · SMG VOICE" };
  }
  // Guest quotes: two per card, rotating through the list each loop.
  function quotesCard(id, items, o, ctx) {
    if (!items || !items.length) return null;
    var n = items.length, start = (ctx.loop * 2) % n, pick = [items[start]];
    if (n > 1) pick.push(items[(start + 1) % n]);
    var long = pick.some(function (q) { return String(q.text).length > 120; });
    if (long && pick.length > 1 && String(pick[0].text).length + String(pick[1].text).length > 290) pick = [pick[0]];
    return { id: id, dur: 14,
      html: head(o) + '<div class="quotes' + (pick.length === 1 ? " one" : "") + '">' + pick.map(function (q, i) {
        return '<div class="quote a" style="--i:' + (i + 3) + '"><div class="qt">' + esc(q.text) + '</div><div class="qm">Guest · Cliente · ' + esc(q.when) + "</div></div>";
      }).join("") + "</div>", foot: o.foot };
  }
  // Hand-written cards from *_screen_cards. A line may carry Spanish after " | ", and a bold lead-in before " — ".
  function splitLine(l) {
    var p = String(l).split(" | "), en = p[0], es = p[1] || "", m = en.split(" — ");
    return { en: m.length > 1 ? "<b>" + esc(m[0]) + "</b> " + esc(m.slice(1).join(" — ")) : esc(en), es: esc(es) };
  }
  function editableCard(c, i) {
    var sec = String(c.section || "").toLowerCase(), ls = c.lines || [], t = String(c.title || "").split(" | ");
    if (sec === "welcome") {
      return { id: "welcome" + i, dur: 14, html: '<div class="center">' +
        '<img class="wl-arch a" style="--i:0" src="assets/mcd-arches.png" alt="">' +
        '<div class="wl-kick a" style="--i:1">' + esc(ls[0] || "WELCOME · BIENVENIDO") + "</div>" +
        '<div class="wl-name a" style="--i:2">' + esc(c.title) + "</div>" +
        ls.slice(1).map(function (l, k) { return '<div class="wl-ln a' + (/MOCNI/.test(l) ? " mocni" : "") + '" style="--i:' + (k + 3) + '">' + esc(l) + "</div>"; }).join("") + "</div>", foot: "" };
    }
    var hd = head({ eb: esc(sec.toUpperCase()), h: esc(t[0]), hEs: esc(t[1] || "") });
    if (ls.length >= 3 && ls.length <= 6) {
      return { id: "note" + i, dur: 16, html: hd + '<div class="fix">' + ls.map(function (l, k) {
        var s = splitLine(l);
        return '<div class="fx a" style="--i:' + (k + 3) + '"><span class="no">' + (k + 1) + '</span><div><div class="en">' + s.en + "</div>" + (s.es ? '<div class="es">' + s.es + "</div>" : "") + "</div></div>";
      }).join("") + "</div>", foot: c.foot || "" };
    }
    return { id: "note" + i, dur: 14, html: hd + '<div class="lines">' + ls.slice(0, 7).map(function (l, k) {
      var s = splitLine(l);
      return '<div class="ln a" style="--i:' + (k + 3) + '">' + s.en + (s.es ? '<span class="es">' + s.es + "</span>" : "") + "</div>";
    }).join("") + "</div>", foot: c.foot || "" };
  }
  // Line chart on a zoomed scale: best point gold, latest ringed, optional dashed reference line.
  function lineChart(T, o) {
    o = o || {};
    var N = T.length, vals = T.map(function (t) { return +t.v; }), dec = o.dec == null ? 1 : o.dec;
    var W = o.W || 1600, H = o.H || 560, mL = 70, mR = 150, mT = 90, mB = 84, iw = W - mL - mR, ih = H - mT - mB, baseY = mT + ih;
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var ref = o.ref && o.ref.v != null && !isNaN(+o.ref.v) ? +o.ref.v : null;
    if (ref != null) { lo = Math.min(lo, ref); hi = Math.max(hi, ref); }
    var pad = Math.max(hi - lo, 1) * 0.3, yMin = lo - pad, yMax = hi + pad;
    var X = function (i) { return mL + (N === 1 ? iw / 2 : (i / (N - 1)) * iw); };
    var Y = function (v) { return mT + (1 - (v - yMin) / (yMax - yMin)) * ih; };
    var pts = T.map(function (t, i) { return { x: X(i), y: Y(+t.v), v: +t.v, m: t.m }; });
    var bestV = o.lower ? Math.min.apply(null, vals) : Math.max.apply(null, vals), bi2 = vals.lastIndexOf(bestV), li = N - 1;
    var line = "M " + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1), i;
    for (i = 0; i < N - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
      line += " C " + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + " " + (p1.y + (p2.y - p0.y) / 6).toFixed(1) + " " +
        (p2.x - (p3.x - p1.x) / 6).toFixed(1) + " " + (p2.y - (p3.y - p1.y) / 6).toFixed(1) + " " + p2.x.toFixed(1) + " " + p2.y.toFixed(1);
    }
    var area = line + " L " + pts[N - 1].x.toFixed(1) + " " + baseY + " L " + pts[0].x.toFixed(1) + " " + baseY + " Z";
    var g = "", uid = "c" + Math.random().toString(36).slice(2, 7);
    for (i = 0; i <= 3; i++) { var gy = mT + (i / 3) * ih; g += '<line x1="' + mL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - mR) + '" y2="' + gy.toFixed(1) + '" stroke="#fff" stroke-opacity=".07" stroke-width="2"/>'; }
    if (ref != null) {
      var yy = Y(ref);
      g += '<g class="ch-fade" style="--d:1.2s"><line x1="' + mL + '" y1="' + yy.toFixed(1) + '" x2="' + (W - mR) + '" y2="' + yy.toFixed(1) + '" stroke="#fff" stroke-opacity=".7" stroke-width="3" stroke-dasharray="4 12" stroke-linecap="round"/>' +
        '<text x="' + (W - mR + 44) + '" y="' + (yy + 10).toFixed(1) + '" font-size="28" font-weight="700" fill="#fff" fill-opacity=".85" style="font-family:var(--disp);letter-spacing:.06em">' + esc(o.ref.label) + "</text></g>";
    }
    g += '<defs><linearGradient id="' + uid + 'f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.42"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>';
    g += '<path class="ch-fade" style="--d:.9s" d="' + area + '" fill="url(#' + uid + 'f)"/>';
    g += '<path class="ch-line" d="' + line + '" fill="none" style="stroke:var(--accent)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>';
    pts.forEach(function (p, k) {
      var isB = o.best !== false && k === bi2, isL = k === li, d = (1.2 + k * 0.12).toFixed(2);
      g += '<g class="ch-fade" style="--d:' + d + 's">';
      if (isL && !isB) g += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="24" fill="none" stroke="#fff" stroke-width="4"/>';
      g += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (isB || isL ? 14 : 10) + '" ' + (isB ? 'fill="#FFC72C"' : 'style="fill:var(--accent)"') + ' stroke="#0a0a0a" stroke-width="4"/>';
      var ly = p.y < mT + 30 ? p.y + 70 : p.y - 34;
      g += '<text x="' + p.x.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="middle" font-size="' + (isB || isL ? 58 : 46) + '" font-weight="800" fill="' + (isB ? "#FFC72C" : "#fff") + '" paint-order="stroke" stroke="#0a0a0a" stroke-width="8" style="font-family:var(--disp)">' + p.v.toFixed(dec) + (isB ? " ★" : "") + "</text>";
      g += '<text x="' + p.x.toFixed(1) + '" y="' + (baseY + 62) + '" text-anchor="middle" font-size="36" font-weight="700" fill="' + (isL ? "#fff" : "#bbb") + '" style="font-family:var(--disp);letter-spacing:.06em">' + esc(String(p.m).toUpperCase()) + (isL && o.lastNote ? " " + esc(o.lastNote) : "") + "</text></g>";
    });
    return '<div class="chart a" style="--i:3"><svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + g + "</svg></div>";
  }

  // ── engine ──
  var S = { cfg: null, data: null, pending: null, cards: [], i: -1, loop: 0, timer: null, offline: false, cachedAt: null, bootAt: Date.now(), running: false };
  var SPEED = Math.max(1, +(qs.get("speed") || 1) || 1);
  function $(id) { return document.getElementById(id); }
  function status(html) { var el = $("status"); if (!el) return; if (html == null) { el.className = "hide"; return; } el.className = ""; el.innerHTML = html; }

  function frame(cfg) {
    var team = TEAMS[STORE];
    document.body.className = cfg.kind + (qs.get("lite") === "1" ? " nomotion" : "");
    document.body.innerHTML =
      '<div id="bg"></div><div id="veil"></div>' +
      '<header id="top">' + (team ? '<img id="crest" src="assets/teams/' + esc(STORE) + '.webp" alt="" onerror="this.style.display=\'none\'">' : "") +
      '<div class="id"><div class="team" id="teamname">' + esc(team ? team.t : "") + '</div>' +
      '<div class="where"><b>' + cfg.label + " · " + cfg.labelEs + '</b> <span id="where"></span></div></div>' +
      '<div id="now"><span class="dot"></span><span id="nowtxt"></span></div>' +
      '<div id="clock"><div class="t" id="time"></div><div class="d" id="date"></div></div></header>' +
      '<main id="stage"></main>' +
      '<footer id="bot"><div id="src"></div><div id="segs"></div></footer>' +
      '<div id="status">Loading… · Cargando…</div>';
    if (team) {
      document.body.style.setProperty("--team", mix(team.c, 0.78));
      document.body.style.setProperty("--team2", mix(team.c, 0.4));
      $("top").style.borderBottomColor = team.c;
      if (qs.get("nobg") !== "1") {
        var img = new Image();
        img.onload = function () { var b = $("bg"); b.style.backgroundImage = "url(" + img.src + ")"; b.className = "on"; };
        img.src = "assets/teams/" + STORE + "-scene.jpg";
      }
    }
    tick(); setInterval(tick, 15000);
  }
  function tick() {
    var d = ctNow(), h = d.getHours(), m = ("0" + d.getMinutes()).slice(-2);
    $("time").innerHTML = ((h + 11) % 12 + 1) + ":" + m + "<small>" + (h < 12 ? "AM" : "PM") + "</small>";
    var en = d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric" });
    $("date").textContent = en + " · " + DOW_ES[d.getDay()] + " " + d.getDate() + " " + (MES[d.toLocaleString("en-US", { month: "short" })] || "");
    var dp = nowDaypart();
    if (dp) { $("nowtxt").innerHTML = "On now · " + esc(dp.en) + ' <span class="es">· ' + esc(dp.es) + "</span>"; $("now").className = "on"; }
    else $("now").className = "";
  }
  function ctx() { var dp = nowDaypart(); return { loop: S.loop, store: STORE, nowKey: dp ? dp.key : null, now: dp, daysLeft: daysLeft(), team: TEAMS[STORE] || null }; }

  function rebuild() {
    if (S.pending) { S.data = S.pending; S.pending = null; }
    var list = [];
    try { list = S.cfg.build(S.data, ctx()) || []; } catch (e) { if (window.console) console.error("build failed", e); }
    list = list.filter(function (c) { return c && c.html; });
    var pin = qs.get("card");
    if (pin != null && pin !== "") {
      var one = list.filter(function (c, i) { return c.id === pin || String(i) === pin; });
      if (one.length) list = one;
    }
    S.cards = list;
    if (S.data && S.data.loc) $("where").textContent = "— " + S.data.loc + " #" + S.data.store;
    $("segs").innerHTML = list.map(function () { return "<i><b></b></i>"; }).join("");
  }
  function show(i) {
    var stage = $("stage"), c = S.cards[i], old = stage.querySelector(".card.on");
    S.i = i;
    if (old) { old.className = "card out"; setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 650); }
    var el = document.createElement("div");
    el.className = "card"; el.setAttribute("data-id", c.id);
    try { el.innerHTML = c.html; } catch (e) { el.innerHTML = ""; }
    stage.appendChild(el);
    void el.offsetWidth; el.className = "card on";
    runCounts(el); initCharts(el);
    var dur = Math.max(4, (c.dur || 13) / SPEED);
    var segs = $("segs").children;
    for (var k = 0; k < segs.length; k++) { segs[k].className = k < i ? "done" : (k === i ? "cur" : ""); segs[k].style.setProperty("--dur", dur + "s"); }
    $("src").innerHTML = (S.offline ? '<span class="off">OFFLINE · showing saved numbers · SIN CONEXIÓN</span>' : "") + (c.foot || "");
    window.__ok = true;
    clearTimeout(S.timer);
    if (S.cards.length > 1 || qs.get("card") == null) S.timer = setTimeout(next, dur * 1000);
  }
  function next() {
    var i = S.i + 1;
    if (i >= S.cards.length) {
      S.loop++; i = 0;
      if (Date.now() - S.bootAt > 30 * 60 * 1000 && !S.offline) { safeReload(); }
      rebuild();
      if (!S.cards.length) { status("No cards to show · Sin tarjetas"); S.running = false; return; }
    }
    try { show(i); } catch (e) { if (window.console) console.error("card failed", e); S.i = i; S.timer = setTimeout(next, 1500); }
  }
  // Pick up a new shell version every 30 minutes, but only when the page is really reachable
  // (a blind reload while the store network is down would strand the TV on a browser error page).
  function safeReload() {
    fetch(location.pathname + "?ping=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (r.ok) location.reload(); }).catch(function () {});
  }
  function runCounts(root) {
    var els = root.querySelectorAll(".cu");
    if (!els.length || document.body.className.indexOf("nomotion") >= 0 || !window.requestAnimationFrame) return;
    var t0 = null, D = 1100;
    [].forEach.call(els, function (e) { e.textContent = fmt(0, +e.getAttribute("data-d")); });
    function step(ts) {
      if (t0 == null) t0 = ts;
      if (t0 < 0) return; // the failsafe already wrote the final numbers
      var p = Math.min(1, (ts - t0) / D), k = 1 - Math.pow(1 - p, 3);
      [].forEach.call(els, function (e) { e.textContent = fmt(+e.getAttribute("data-v") * k, +e.getAttribute("data-d")); });
      if (p < 1) requestAnimationFrame(step);
    }
    setTimeout(function () { requestAnimationFrame(step); }, 250);
    setTimeout(function () { // whatever happened to the frames, the true number is on screen by now
      [].forEach.call(els, function (e) { e.textContent = fmt(+e.getAttribute("data-v"), +e.getAttribute("data-d")); });
      t0 = -1e9;
    }, D + 900);
  }
  function initCharts(root) {
    [].forEach.call(root.querySelectorAll(".ch-line"), function (p) { try { p.style.setProperty("--len", p.getTotalLength()); } catch (e) {} });
  }
  function cacheKey() { return "tvdata:" + S.cfg.kind + ":" + STORE; }
  function onData(d, fromCache) {
    S.offline = !!fromCache;
    S.pending = d;
    if (!S.running) { S.running = true; status(null); rebuild(); if (S.cards.length) show(0); else { status("No cards to show · Sin tarjetas"); S.running = false; } }
  }
  function load() {
    var cfg = S.cfg, dev = qs.get("src"), url;
    if (dev && /^_fx\/[\w.-]+\.json$/.test(dev)) url = dev;
    else {
      var today = /^\d{4}-\d{2}-\d{2}$/.test(qs.get("today") || "") ? "&today=" + qs.get("today") : "";
      // &sh= tells the function logs which shell version a TV is running (the classic fallback sends none)
      url = cfg.fn + "?t=" + encodeURIComponent(qs.get("t") || "") + "&store=" + encodeURIComponent(STORE) + today + "&sh=" + encodeURIComponent(cfg.ver || "kit");
    }
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) {
        if (!S.data && !S.pending) status(esc(cfg.label) + " screen: " + esc((d && d.error) || "unavailable") + "<small>Check the link · Revisa el enlace</small>");
        return;
      }
      try { localStorage.setItem(cacheKey(), JSON.stringify(d)); } catch (e) {}
      onData(d, false);
    }).catch(function () {
      if (S.data || S.pending) { S.offline = true; return; }
      var cached = null;
      try { cached = JSON.parse(localStorage.getItem(cacheKey()) || "null"); } catch (e) {}
      if (cached && cached.ok) onData(cached, true);
      else status("Offline, retrying… · Sin conexión, reintentando…");
      setTimeout(load, 30000);
    });
  }
  function boot(cfg) {
    S.cfg = cfg;
    frame(cfg);
    window.__ok = true; // the engine itself is alive; network trouble is handled in place from here
    load();
    setInterval(load, 10 * 60 * 1000); // fresh numbers every 10 minutes, swapped in at the end of a loop
  }

  return { boot: boot, esc: esc, fmt: fmt, commas: commas, ord: ord, sfx: sfx, mes: mes, mon: mon, isoLabel: isoLabel, bi: bi,
    head: head, cu: cu, stat: stat, rankBlock: rankBlock, ladder: ladder, coach: coach, movement: movement,
    showdownCard: showdownCard, quotesCard: quotesCard, editableCard: editableCard, lineChart: lineChart,
    crest: crest, teamName: teamName, TEAMS: TEAMS, STORE: STORE, daysLeft: daysLeft };
})();
