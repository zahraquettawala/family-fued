import { firebaseConfig } from "./firebase-config.js";

/* ---------- people & levels ---------- */
const PEOPLE = [
  { id: "zahra",   name: "Zahra", sub: "the baby",      emoji: "💅", x: 80,  y: 80 },
  { id: "sarah",   name: "Sarah", sub: "moving out",    emoji: "📦", x: 280, y: 80 },
  { id: "maryam",  name: "Mom",   sub: "Maryam",        emoji: "👑", x: 80,  y: 250 },
  { id: "hussein", name: "Dad",   sub: "Hussein",       emoji: "📺", x: 280, y: 250 },
];
const P = Object.fromEntries(PEOPLE.map(p => [p.id, p]));
const LEVELS = [
  { n: 0, label: "Peace",        emoji: "🕊️", color: "#5fd39a", verb: "at peace with" },
  { n: 1, label: "Side-eye",     emoji: "😒", color: "#f3c94b", verb: "side-eyeing" },
  { n: 2, label: "Mad",          emoji: "😤", color: "#ff8a3d", verb: "mad at" },
  { n: 3, label: "Not speaking", emoji: "🧊", color: "#ff4d6d", verb: "not speaking to" },
];
const PAIR_STATUS = ["Free to talk", "Proceed with caution", "Hostile — tread carefully", "Comms are down"];
const key = (a, b) => `${a}__${b}`;

/* ---------- storage: Firebase, or a local demo fallback ---------- */
const DEMO = !firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE");

async function makeStore(onChange) {
  const state = { fights: {}, pins: {}, log: [] };
  if (DEMO) {
    const load = k => { try { return JSON.parse(localStorage.getItem("qf_" + k)) } catch { return null } };
    const save = (k, v) => { try { localStorage.setItem("qf_" + k, JSON.stringify(v)) } catch {} };
    state.fights = load("fights") || {}; state.pins = load("pins") || {}; state.log = load("log") || [];
    setTimeout(() => onChange(state));
    return {
      async setFight(from, to, v) { state.fights[key(from, to)] = v; save("fights", state.fights); onChange(state); },
      async setPin(id, h) { if (state.pins[id]) throw new Error("taken"); state.pins[id] = h; save("pins", state.pins); onChange(state); },
      async addLog(e) { state.log = [...state.log, e].slice(-30); save("log", state.log); onChange(state); },
    };
  }
  const V = "10.12.2";
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const db_ = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
  const { getDatabase, ref, onValue, set, push, query, limitToLast, serverTimestamp } = db_;
  const db = getDatabase(initializeApp(firebaseConfig));
  onValue(ref(db, "fights"), s => { state.fights = s.val() || {}; onChange(state); });
  onValue(ref(db, "pins"),   s => { state.pins = s.val() || {};   onChange(state); });
  onValue(query(ref(db, "log"), limitToLast(30)), s => {
    const out = []; s.forEach(c => { out.push(c.val()) }); state.log = out; onChange(state);
  });
  return {
    setFight: (from, to, v) => set(ref(db, `fights/${key(from, to)}`), { ...v, updatedAt: serverTimestamp() }),
    setPin: (id, h) => set(ref(db, `pins/${id}`), h),
    addLog: e => push(ref(db, "log"), { ...e, at: serverTimestamp() }),
  };
}

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "on") for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === "style") el.style.cssText = v;
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null) el.append(c);
  return el;
}
const SVGNS = "http://www.w3.org/2000/svg";
function s(tag, attrs = {}, text) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
}
async function hashPin(id, pin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`quetta:${id}:${pin}`));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function ago(t) {
  if (!t) return "just now";
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const hr = Math.round(m / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}

/* ---------- app state ---------- */
let S = { fights: {}, pins: {}, log: [] };
let me = null;
try { me = localStorage.getItem("qf_me") } catch {}
let picking = null;
const drafts = {};
const lvl = (a, b) => (S.fights[key(a, b)]?.level) | 0;

/* ---------- render ---------- */
function renderThreat() {
  let total = 0;
  for (const a of PEOPLE) for (const b of PEOPLE) if (a !== b) total += lvl(a.id, b.id);
  const max = 36;
  const t = total === 0 ? "All quiet 🕊️" : total <= 4 ? "Mild bickering 😒" : total <= 10 ? "Tense 😬" :
            total <= 18 ? "Cold war 🧊" : "Total household war 💥";
  $("threatText").textContent = t;
  $("threatFill").style.width = Math.max(3, (total / max) * 100) + "%";
}

function renderGraph() {
  const g = $("graph"); g.replaceChildren();
  const defs = s("defs");
  LEVELS.forEach(L => {
    const m = s("marker", { id: "arr" + L.n, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: "auto-start-reverse" });
    m.append(s("path", { d: "M0,0 L10,5 L0,10 z", fill: L.color })); defs.append(m);
  });
  g.append(defs);
  const R = 34;
  // calm lines for pairs where both sides are at peace
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = PEOPLE[i], b = PEOPLE[j];
    if (!lvl(a.id, b.id) && !lvl(b.id, a.id))
      g.append(s("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "#5fd39a", "stroke-opacity": .25, "stroke-width": 2, "stroke-dasharray": "4 6" }));
  }
  // angry arrows, one curve per direction
  for (const a of PEOPLE) for (const b of PEOPLE) {
    if (a === b) continue;
    const n = lvl(a.id, b.id); if (!n) continue;
    const L = LEVELS[n];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len, px = -uy, py = ux;
    const off = 26;
    const cx = (a.x + b.x) / 2 + px * off, cy = (a.y + b.y) / 2 + py * off;
    const sv = [cx - a.x, cy - a.y], sl = Math.hypot(...sv);
    const ev = [cx - b.x, cy - b.y], el = Math.hypot(...ev);
    const x1 = a.x + sv[0] / sl * (R + 2), y1 = a.y + sv[1] / sl * (R + 2);
    const x2 = b.x + ev[0] / el * (R + 6), y2 = b.y + ev[1] / el * (R + 6);
    g.append(s("path", { d: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`, fill: "none", stroke: L.color,
      "stroke-width": 1.5 + n * 1.2, "stroke-linecap": "round", "marker-end": `url(#arr${n})`,
      "stroke-dasharray": n === 3 ? "1 0" : null }));
    const mx = .25 * x1 + .5 * cx + .25 * x2, my = .25 * y1 + .5 * cy + .25 * y2;
    g.append(s("circle", { cx: mx, cy: my, r: 12, fill: "#16131f", stroke: L.color, "stroke-width": 1.5 }));
    g.append(s("text", { x: mx, y: my + 1, class: "edge-emoji" }, L.emoji));
  }
  // people
  for (const p of PEOPLE) {
    const out = PEOPLE.reduce((t, o) => t + (o === p ? 0 : lvl(p.id, o.id)), 0);
    const grp = s("g", { class: p.id === me ? "me" : "" });
    if (out >= 4) grp.append(s("circle", { cx: p.x, cy: p.y, r: R + 6, fill: "none", stroke: "#ff4d6d", "stroke-opacity": .5, "stroke-width": 3 }));
    grp.append(s("circle", { class: "body", cx: p.x, cy: p.y, r: R, fill: "#2a2539", stroke: "#352f47", "stroke-width": 2 }));
    grp.append(s("text", { x: p.x, y: p.y, class: "node-emoji" }, p.emoji));
    const labelY = p.y < 150 ? p.y - R - 22 : p.y + R + 20;
    grp.append(s("text", { x: p.x, y: labelY, class: "node-label" }, p.name + (p.id === me ? " (you)" : "")));
    grp.append(s("text", { x: p.x, y: labelY + 14, class: "node-sub" }, p.sub));
    g.append(grp);
  }
}

function renderLegend() {
  $("legend").replaceChildren(...LEVELS.map(L => h("span", { style: `--c:${L.color}` }, `${L.emoji} ${L.label}`)));
}

function renderLogin() {
  const logged = !!me && !!P[me];
  $("loginCard").hidden = logged;
  $("feelingsCard").hidden = !logged;
  $("logoutBtn").hidden = !logged;
  if (logged) return;
  $("whoGrid").replaceChildren(...PEOPLE.map(p =>
    h("button", { type: "button", class: "who" + (picking === p.id ? " sel" : ""), on: { click: () => pick(p.id) } },
      h("span", { class: "e" }, p.emoji), p.name, h("small", {}, S.pins[p.id] ? "enter PIN" : "set up PIN"))));
}

function pick(id) {
  picking = id;
  const fresh = !S.pins[id];
  $("pinForm").hidden = false;
  $("pinPrompt").textContent = fresh ? `Hi ${P[id].name}! Pick a 4-digit PIN so nobody can fight as you.` : `Hi ${P[id].name}, enter your PIN.`;
  $("pinInput2").hidden = !fresh;
  $("pinInput").value = ""; $("pinInput2").value = ""; $("pinError").textContent = "";
  renderLogin();
  $("pinInput").focus();
}

$("pinCancel").onclick = () => { picking = null; $("pinForm").hidden = true; renderLogin(); };
$("pinForm").onsubmit = async e => {
  e.preventDefault();
  const id = picking, pin = $("pinInput").value.trim();
  if (!/^\d{4}$/.test(pin)) return $("pinError").textContent = "PIN has to be 4 digits.";
  $("pinSubmit").disabled = true;
  try {
    const hashed = await hashPin(id, pin);
    if (!S.pins[id]) {
      if (pin !== $("pinInput2").value.trim()) return $("pinError").textContent = "Those PINs don't match.";
      await store.setPin(id, hashed);
    } else if (S.pins[id] !== hashed) {
      return $("pinError").textContent = "Wrong PIN. Nice try.";
    }
    me = id; try { localStorage.setItem("qf_me", id) } catch {}
    picking = null; $("pinForm").hidden = true;
    renderAll();
  } catch (err) {
    $("pinError").textContent = "Couldn't save that — someone may have already set this PIN. Refresh and try again.";
  } finally { $("pinSubmit").disabled = false; }
};
$("logoutBtn").onclick = () => { me = null; try { localStorage.removeItem("qf_me") } catch {} ; renderAll(); };

function renderFeelings() {
  if (!me || !P[me]) return;
  $("feelingsTitle").textContent = `${P[me].name}, how do you feel about…`;
  const active = document.activeElement?.dataset?.reasonFor;
  $("feelings").replaceChildren(...PEOPLE.filter(p => p.id !== me).map(p => {
    const cur = S.fights[key(me, p.id)] || { level: 0, note: "" };
    const theirs = lvl(p.id, me);
    if (drafts[p.id] == null) drafts[p.id] = cur.note || "";
    const input = h("input", { "data-reason-for": p.id, maxlength: 140, placeholder: "What did they do? (optional)", value: drafts[p.id],
      on: { input: e => drafts[p.id] = e.target.value } });
    const saveNote = h("button", { type: "button", on: { click: () => update(p.id, cur.level | 0, true) } }, "Save");
    const box = h("div", { class: "feel" },
      h("div", { class: "feel-head" }, `${p.emoji} ${p.name}`,
        h("small", {}, theirs ? `${LEVELS[theirs].emoji} they're ${LEVELS[theirs].verb} you` : "they're fine with you")),
      h("div", { class: "seg" }, LEVELS.map(L =>
        h("button", { type: "button", class: (cur.level | 0) === L.n ? "on" : "", style: `--c:${L.color}`,
          on: { click: () => update(p.id, L.n) } }, h("span", { class: "e" }, L.emoji), L.label))),
      h("div", { class: "reason" }, input, saveNote));
    return box;
  }));
  if (active) document.querySelector(`[data-reason-for="${active}"]`)?.focus();
}

async function update(target, level, noteOnly = false) {
  const prev = S.fights[key(me, target)] || { level: 0, note: "" };
  const note = (drafts[target] || "").trim().slice(0, 140);
  if (prev.level === level && (prev.note || "") === note) return;
  await store.setFight(me, target, { level, note, updatedAt: Date.now() });
  await store.addLog({ from: me, to: target, level, note, at: Date.now() });
}

function renderPairs() {
  const items = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const a = PEOPLE[i], b = PEOPLE[j];
    const ab = lvl(a.id, b.id), ba = lvl(b.id, a.id), worst = Math.max(ab, ba);
    let detail = PAIR_STATUS[worst];
    if (ab && ba) detail += ` · mutual (${LEVELS[ab].emoji} / ${LEVELS[ba].emoji})`;
    else if (ab) detail += ` · ${a.name} is ${LEVELS[ab].verb} ${b.name}`;
    else if (ba) detail += ` · ${b.name} is ${LEVELS[ba].verb} ${a.name}`;
    if (worst >= 2) {
      const mid = PEOPLE.find(c => c !== a && c !== b &&
        Math.max(lvl(a.id, c.id), lvl(c.id, a.id)) <= 1 && Math.max(lvl(b.id, c.id), lvl(c.id, b.id)) <= 1);
      detail += mid ? ` · pass messages through ${mid.name}` : " · no safe messenger available";
    }
    items.push({ worst, el: h("li", {}, h("span", { class: "dot", style: `--c:${LEVELS[worst].color}` }),
      h("div", {}, h("div", { class: "who-pair" }, `${a.name} ↔ ${b.name}`), h("div", { class: "status" }, detail))) });
  }
  items.sort((x, y) => y.worst - x.worst);
  $("pairs").replaceChildren(...items.map(i => i.el));
}

function renderFeed() {
  const log = [...S.log].reverse().filter(e => P[e.from] && P[e.to] && LEVELS[e.level]);
  if (!log.length) return $("feed").replaceChildren(h("li", { class: "empty" }, "No drama logged yet. Suspicious."));
  $("feed").replaceChildren(...log.slice(0, 20).map(e => {
    const L = LEVELS[e.level];
    return h("li", {}, `${L.emoji} ${P[e.from].name} is now ${L.verb} ${P[e.to].name}`,
      e.note ? h("span", { class: "note" }, ` — “${e.note}”`) : null,
      h("span", { class: "when" }, ago(e.at)));
  }));
}

function renderAll() { renderThreat(); renderGraph(); renderLogin(); renderFeelings(); renderPairs(); renderFeed(); }

/* ---------- boot ---------- */
$("demoBanner").hidden = !DEMO;
renderLegend();
const store = await makeStore(state => { S = state; renderAll(); });
renderAll();
setInterval(renderFeed, 60000);
