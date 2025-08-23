/* global React, ReactDOM */
const { useMemo, useState } = React;

/*****************
 * Helpers
 *****************/
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const asInt = (s) => (s === "" || s == null ? null : Number.isFinite(parseInt(s, 10)) ? parseInt(s, 10) : null);
const padArr = (len, fill = "") => Array.from({ length: len }, () => fill);

const GROUP_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-amber-100 text-amber-800 border-amber-300",
  "bg-emerald-100 text-emerald-800 border-emerald-300",
  "bg-pink-100 text-pink-800 border-pink-300",
  "bg-indigo-100 text-indigo-800 border-indigo-300",
  "bg-teal-100 text-teal-800 border-teal-300",
  "bg-rose-100 text-rose-800 border-rose-300",
  "bg-lime-100 text-lime-800 border-lime-300",
];
const badgeClass = (gi) =>
  `inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${GROUP_COLORS[gi % GROUP_COLORS.length]}`;

// Split array evenly into g buckets (max 8)
function chunkEven(arr, g) {
  g = clamp(g, 1, 8);
  const out = Array.from({ length: g }, () => []);
  arr.forEach((t, i) => out[i % g].push(t));
  return out;
}

// Round Robin pairing using circle method
function roundRobinPairs(ids) {
  const a = ids.slice();
  if (a.length % 2 === 1) a.push(null);
  const rounds = a.length - 1;
  const half = a.length / 2;
  const out = [];
  for (let r = 0; r < rounds; r++) {
    const round = [];
    for (let i = 0; i < half; i++) {
      const t1 = a[i];
      const t2 = a[a.length - 1 - i];
      if (t1 != null && t2 != null) round.push([t1, t2]);
    }
    out.push(round);
    a.splice(1, 0, a.pop());
  }
  return out;
}

/*****************
 * Match helpers (Best-of handling)
 *****************/
// setsBestOf = 1 (best of 1) oder 3 (best of 3; 2 gewonnene Sätze)
function emptySets(setsBestOf) {
  return { sA: padArr(setsBestOf === 1 ? 1 : 3, ""), sB: padArr(setsBestOf === 1 ? 1 : 3, "") };
}

function calcSetWins(sA, sB) {
  let wA = 0, wB = 0;
  for (let i = 0; i < Math.max(sA.length, sB.length); i++) {
    const a = asInt(sA[i]);
    const b = asInt(sB[i]);
    if (a == null || b == null) continue;
    if (a === b) continue;
    if (a > b) wA++; else wB++;
  }
  return { wA, wB };
}

function isMatchDone(setsBestOf, sA, sB) {
  if (setsBestOf === 1) {
    const a = asInt(sA[0]);
    const b = asInt(sB[0]);
    return a != null && b != null && a !== b;
  }
  const { wA, wB } = calcSetWins(sA, sB);
  return wA >= 2 || wB >= 2 ||
    (asInt(sA[0]) != null && asInt(sB[0]) != null &&
     asInt(sA[1]) != null && asInt(sB[1]) != null &&
     asInt(sA[2]) != null && asInt(sB[2]) != null);
}

function totalPoints(sArr) {
  return sArr.reduce((sum, s) => {
    const v = asInt(s);
    return sum + (v == null ? 0 : v);
  }, 0);
}

/*****************
 * Types (JSDoc)
 *****************/
/** @typedef {{ gi:number, a:number, b:number, round:number, court:number, slot:number, setsBestOf:1|3, sA:string[], sB:string[] }} GMatch */
/** @typedef {{ fromId:string, outcome:'W'|'L' }} Ref */
/** @typedef {{ id:string, stage:string, label:string, a:number|null, b:number|null, aRef:Ref|null, bRef:Ref|null, setsBestOf:1|3, sA:string[], sB:string[], court:number, slot:number }} KOMatch */

/*****************
 * KO propagation
 *****************/
const resolveRefIdx = (list, ref) => {
  if (!ref) return null;
  const m = list.find((x) => x.id === ref.fromId);
  if (!m) return null;
  const done = isMatchDone(m.setsBestOf, m.sA, m.sB);
  if (!done) return null;
  const { wA, wB } = calcSetWins(m.sA, m.sB);
  const aWins = wA > wB;
  return ref.outcome === "W" ? (aWins ? m.a : m.b) : (aWins ? m.b : m.a);
};
const propagate = (list) => {
  const next = list.map((m) => ({ ...m }));
  let changed = true;
  let guard = 0;
  while (changed && guard < 50) {
    changed = false; guard++;
    for (const m of next) {
      const aNew = m.a ?? resolveRefIdx(next, m.aRef);
      const bNew = m.b ?? resolveRefIdx(next, m.bRef);
      if (aNew !== m.a || bNew !== m.b) { m.a = aNew; m.b = bNew; changed = true; }
    }
  }
  return next;
};

/*****************
 * Build KO
 *****************/
function buildKO(seeds, courts, playAllPlaces, koBestOf /** 1|3 */) {
  /** @type {KOMatch[]} */
  const out = [];
  let slot = 1;
  const push = (stage, label, a, b, aRef = null, bRef = null) => {
    out.push({ id: `${stage}-${slot}-${Math.random().toString(36).slice(2, 6)}`, stage, label, a, b, aRef, bRef, setsBestOf: koBestOf, ...emptySets(koBestOf), court: 0, slot });
    slot++;
  };

  const Q = seeds.length;
  if (Q < 2) return out;
  const pow2 = 2 ** Math.floor(Math.log2(Q));
  const playInCount = Q - pow2;
  const seedsCopy = [...seeds];

  if (playInCount > 0) {
    const pool = seedsCopy.splice(-2 * playInCount);
    for (let i = 0; i < pool.length; i += 2) push("PI", "Play-in", pool[i], pool[i + 1]);
  }

  const N = pow2 || Q;
  const base = seedsCopy;
  for (let i = 0; i < Q - N; i++) base.push(null);

  const pairs = [];
  for (let l = 0, r = base.length - 1; l < r; l++, r--) pairs.push([base[l], base[r]]);

  const piMatches = out.filter((m) => m.stage === "PI");
  let piIdx = 0;
  const initial = [];
  for (const [A, B] of pairs) {
    let a = A, b = B, aRef = null, bRef = null;
    if (a == null) { const s = piMatches[piIdx++]; if (s) aRef = { fromId: s.id, outcome: "W" }; }
    if (b == null) { const s = piMatches[piIdx++]; if (s) bRef = { fromId: s.id, outcome: "W" }; }
    const label = N === 16 ? "Achtelfinale" : N === 8 ? "Viertelfinale" : N === 4 ? "Halbfinale" : `Runde ${N}`;
    push(`R${N}`, label, a, b, aRef, bRef);
    initial.push(out[out.length - 1]);
  }

  // Link rounds -> SF -> F; Bronze + P5-8 order will be placed after SF later
  let cur = initial;
  let size = N;
  while (size > 1) {
    const nextSize = size / 2;
    const next = [];
    for (let i = 0; i + 1 < cur.length; i += 2) {
      const Aref = { fromId: cur[i].id, outcome: "W" };
      const Bref = { fromId: cur[i + 1].id, outcome: "W" };
      if (size === 8)      push("SF", "Halbfinale", null, null, Aref, Bref);
      else if (size === 4) push("F",  "Finale",     null, null, Aref, Bref);
      else                 push(`R${nextSize}`, `Runde ${nextSize}`, null, null, Aref, Bref);
      next.push(out[out.length - 1]);
    }

    // Platz 5–8 aus Viertelfinale-Verlierern (NACH den Halbfinals)
    if (playAllPlaces && size === 8) {
      const losers = cur.map((m) => ({ fromId: m.id, outcome: "L" }));
      if (losers.length >= 4) {
        const pA = { id: `p58a-${Math.random().toString(36).slice(2, 6)}`, stage: "P5-8", label: "Platz 5-8 Halbfinale", a: null, b: null, aRef: losers[0], bRef: losers[1], setsBestOf: koBestOf, ...emptySets(koBestOf), court: 0, slot: slot++ };
        const pB = { id: `p58b-${Math.random().toString(36).slice(2, 6)}`, stage: "P5-8", label: "Platz 5-8 Halbfinale", a: null, b: null, aRef: losers[2], bRef: losers[3], setsBestOf: koBestOf, ...emptySets(koBestOf), court: 0, slot: slot++ };
        out.push(pA, pB);
        push("P5", "Spiel um Platz 5", null, null, { fromId: pA.id, outcome: "W" }, { fromId: pB.id, outcome: "W" });
        push("P7", "Spiel um Platz 7", null, null, { fromId: pA.id, outcome: "L" }, { fromId: pB.id, outcome: "L" });
      }
    }

    // Bronze (NACH P5-8)
    if (size === 4) {
      const sfs = out.filter((m) => m.stage === "SF").slice(-2);
      if (sfs.length === 2) {
        out.push({ id: `bronze-${Math.random().toString(36).slice(2, 6)}`, stage: "BRONZE", label: "Spiel um Platz 3", a: null, b: null, aRef: { fromId: sfs[0].id, outcome: "L" }, bRef: { fromId: sfs[1].id, outcome: "L" }, setsBestOf: koBestOf, ...emptySets(koBestOf), court: 0, slot: slot++ });
      }
    }

    cur = next;
    size = nextSize;
  }

  // Order & courts
  const C = Math.max(1, courts || 1);
  const isRound = (x) => x.stage[0] === "R" && !isNaN(parseInt(x.stage.slice(1)));
  const roundsNoSF = out.filter(isRound);
  const semis      = out.filter((m) => m.stage === "SF");
  const p58        = out.filter((m) => m.stage === "P5-8");
  const p5         = out.filter((m) => m.stage === "P5");
  const p7         = out.filter((m) => m.stage === "P7");
  const bronze     = out.filter((m) => m.stage === "BRONZE");
  const finale     = out.filter((m) => m.stage === "F");

  let slotCounter = 1;
  const assignAcross = (list) => { for (let i = 0; i < list.length; i++) { list[i].court = (i % C) + 1; list[i].slot = slotCounter++; } };
  const assignCourt1 = (list) => { for (let i = 0; i < list.length; i++) { list[i].court = 1; list[i].slot = slotCounter++; } };

  assignAcross(piMatches);
  assignAcross(roundsNoSF);
  assignAcross(semis);
  assignAcross(p58);
  assignAcross(p5);
  assignAcross(p7);
  assignCourt1(bronze);
  assignCourt1(finale);

  return [...piMatches, ...roundsNoSF, ...semis, ...p58, ...p5, ...p7, ...bronze, ...finale];
}

/*****************
 * UI bits
 *****************/
const ScoreInput = ({ value, onChange }) => (
  <input
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    maxLength={2}
    className="border rounded p-1 text-center w-12"
    value={value}
    onChange={(e) => {
      const next = (e.target.value || "").replace(/\D/g, "").slice(0, 2);
      onChange(next);
    }}
  />
);

const TeamRow = ({ label, fields }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="truncate font-medium">{label || "—"}</div>
    <div className="flex items-center gap-1">{fields}</div>
  </div>
);

/*****************
 * Component
 *****************/
function TournamentTracker() {
  // ===== Setup state =====
  const [teamsCount, setTeamsCount] = useState(16);
  const [teams, setTeams] = useState(Array(16).fill(""));
  const [courts, setCourts] = useState(2);
  const [groups, setGroups] = useState(4);
  const [groupsCreated, setGroupsCreated] = useState(false);
  const [teamGroups, setTeamGroups] = useState(Array(16).fill(0));
  const [setsBestOfGroup, setSetsBestOfGroup] = useState(1); // 1 oder 3
  const [setsBestOfKO, setSetsBestOfKO] = useState(1);       // 1 oder 3
  const [playAllPlaces, setPlayAllPlaces] = useState(true);  // Checkbox

  const [showSetup, setShowSetup] = useState(true);
  const [started, setStarted] = useState(false);

  // ===== Runtime state =====
  /** @type {[GMatch[],Function]} */
  const [matches, setMatches] = useState([]);
  /** @type {[KOMatch[],Function]} */
  const [ko, setKO] = useState([]);

  const [hidePastGroups, setHidePastGroups] = useState(true); // default: hide
  const [hidePastKO, setHidePastKO] = useState(true);         // default: hide

  const nameOf = (i) => teams[i]?.trim() || `Team ${i + 1}`;

  // ===== Actions (Setup) =====
  const askDemo = () => {
    const n = clamp(parseInt(String(teamsCount), 10) || 16, 2, 16);
    const filled = Array.from({ length: 16 }, (_, i) => (i < n ? `Team ${i + 1}` : ""));
    setTeams(filled);
    setGroupsCreated(false); setTeamGroups(Array(16).fill(0));
  };

  const createGroups = () => {
    if (started) return;
    const ids = teams.map((t, i) => (t && t.trim() ? i : -1)).filter((i) => i >= 0).slice(0, teamsCount);
    if (!ids.length) { alert("Bitte zuerst Teams eintragen"); return; }
    const chunks = chunkEven(ids, groups);
    const tg = Array(16).fill(0); chunks.forEach((lst, gi) => lst.forEach((i) => (tg[i] = gi)));
    setTeamGroups(tg); setGroupsCreated(true);
  };

  const changeGroup = (idx, gi) => setTeamGroups((p) => { const c = [...p]; c[idx] = gi; return c; });

  const start = () => {
    if (started) return;
    const ids = teams.map((t, i) => (t && t.trim() ? i : -1)).filter((i) => i >= 0).slice(0, teamsCount);
    if (ids.length < 2) { alert("Mindestens 2 Teams erforderlich."); return; }
    let gW = clamp(groups, 1, 8);
    if (ids.length <= 3) gW = 1; else if (ids.length <= 6) gW = Math.min(gW, 2); else if (ids.length <= 9) gW = Math.min(gW, 3);

    let grouped = [];
    if (groupsCreated) {
      grouped = Array.from({ length: gW }, () => []);
      ids.forEach((i) => grouped[clamp(teamGroups[i] ?? 0, 0, gW - 1)].push(i));
    } else {
      grouped = chunkEven(ids, gW);
    }
    grouped = grouped.filter((x) => x.length > 0);

    const per = grouped.map((idxs) => roundRobinPairs(idxs));
    const maxRounds = Math.max(0, ...per.map((g) => g.length));
    const roundCursor = per.map(() => 0);
    /** @type {Array<{gi:number,round:number,a:number,b:number}>} */
    const queue = [];
    for (let r = 0; r < maxRounds; r++) {
      let again = true;
      while (again) {
        again = false;
        for (let gi = 0; gi < per.length; gi++) {
          const pairs = per[gi][r]; if (!pairs) continue;
          const cur = roundCursor[gi] || 0;
          if (cur < pairs.length) { const [a, b] = pairs[cur]; queue.push({ gi, round: r + 1, a, b }); roundCursor[gi] = cur + 1; again = true; }
        }
      }
      for (let gi = 0; gi < roundCursor.length; gi++) roundCursor[gi] = 0;
    }

    const last = new Map(); const pending = queue.slice(); const out = /** @type {GMatch[]} */([]); let slot = 1;
    while (pending.length) {
      const taken = new Set(); let filled = 0;
      for (let c = 1; c <= Math.max(1, courts); c++) {
        let pick = -1; let best = -1;
        for (let i = 0; i < pending.length; i++) {
          const m = pending[i]; if (taken.has(m.a) || taken.has(m.b)) continue;
          const ra = slot - (last.get(m.a) ?? -999); const rb = slot - (last.get(m.b) ?? -999);
          const s = ra >= 2 && rb >= 2 ? 2 : ra >= 1 && rb >= 1 ? 1 : 0;
          if (s > best) { best = s; pick = i; if (s === 2) break; }
        }
        if (pick >= 0) {
          const m = pending.splice(pick, 1)[0];
          out.push({ gi: m.gi, a: m.a, b: m.b, round: m.round, court: c, slot, setsBestOf: setsBestOfGroup === 1 ? 1 : 3, ...emptySets(setsBestOfGroup === 1 ? 1 : 3) });
          taken.add(m.a); taken.add(m.b); last.set(m.a, slot); last.set(m.b, slot); filled++;
        }
      }
      if (!filled) {
        const m = pending.shift();
        out.push({ gi: m.gi, a: m.a, b: m.b, round: m.round, court: 1, slot, setsBestOf: setsBestOfGroup === 1 ? 1 : 3, ...emptySets(setsBestOfGroup === 1 ? 1 : 3) });
        last.set(m.a, slot); last.set(m.b, slot);
      }
      slot++;
    }

    setMatches(out); setStarted(true); setShowSetup(false);
  };

  const reset = () => {
    setTeams(Array(16).fill("")); setTeamsCount(16); setTeamGroups(Array(16).fill(0)); setGroupsCreated(false);
    setShowSetup(true); setStarted(false); setMatches([]); setKO([]);
    setHidePastGroups(true); setHidePastKO(true);
  };

  // ===== Updates (scores) – groups =====
  const updateSet = (ref, side, setIdx, val) => {
    setMatches((prev) => prev.map((m) => {
      if (m.court !== ref.court || m.slot !== ref.slot) return m;
      const copy = { ...m, sA: [...m.sA], sB: [...m.sB] };
      if (side === "A") copy.sA[setIdx] = val; else copy.sB[setIdx] = val;
      return copy;
    }));
  };

  const fillDummyGroupResults = () => {
    setMatches((prev) => prev.map((m) => {
      const sets = m.setsBestOf === 1 ? 1 : 3;
      const sA = [...m.sA]; const sB = [...m.sB];
      for (let i = 0; i < sets; i++) {
        if (sA[i] === "") sA[i] = String(Math.min(21, 10 + Math.floor(Math.random() * 12)));
        if (sB[i] === "") sB[i] = String(Math.min(21, 10 + Math.floor(Math.random() * 12)));
      }
      return { ...m, sA, sB };
    }));
  };

  // ===== Derived tables (groups) =====
  const tables = useMemo(() => {
    const gCount = matches.length ? 1 + Math.max(...matches.map((m) => m.gi)) : groups;
    const per = Array.from({ length: Math.max(1, gCount) }, () => new Map());
    matches.forEach((m) => {
      const map = per[m.gi];
      const ensure = (idx) => { if (!map.has(idx)) map.set(idx, { idx, team: nameOf(idx), P: 0, W: 0, L: 0, PF: 0, PA: 0, Diff: 0 }); return map.get(idx); };
      const A = ensure(m.a); const B = ensure(m.b);
      const pfA = totalPoints(m.sA); const pfB = totalPoints(m.sB);
      A.PF += pfA; A.PA += pfB; B.PF += pfB; B.PA += pfA; A.Diff = A.PF - A.PA; B.Diff = B.PF - B.PA;
      if (isMatchDone(m.setsBestOf, m.sA, m.sB)) {
        const { wA, wB } = calcSetWins(m.sA, m.sB);
        if (wA > wB) { A.W++; B.L++; A.P += 3; } else if (wB > wA) { B.W++; A.L++; B.P += 3; }
      }
    });
    return per.map((map) => Array.from(map.values()).sort((a, b) => b.P - a.P || b.Diff - a.Diff || b.PF - a.PF || a.team.localeCompare(b.team)));
  }, [matches, teams, groups]);

  const courtsView = useMemo(() => {
    const C = Math.max(1, courts);
    const arr = Array.from({ length: C }, () => []);
    matches.forEach((m) => { const i = Math.min(C, Math.max(1, m.court || 1)) - 1; arr[i].push(m); });
    arr.forEach((l) => l.sort((a, b) => a.slot - b.slot));
    return arr;
  }, [matches, courts]);

  // ===== KO from tables =====
  const buildKOFromTables = () => {
    const adv = 2;
    const quals = [];
    tables.forEach((rows) => rows.slice(0, adv).forEach((r, p) => quals.push({ place: p + 1, idx: r.idx, P: r.P, Diff: r.Diff, PF: r.PF })));
    if (quals.length < 2) { alert("Zu wenige Aufsteiger für KO."); return; }
    const seeds = [];
    for (let p = 1; p <= adv; p++) {
      const tier = quals.filter((q) => q.place === p).sort((a, b) => b.P - a.P || b.Diff - a.Diff || b.PF - a.PF);
      seeds.push(...tier.map((x) => x.idx));
    }
    const tree = buildKO(seeds, courts, playAllPlaces, setsBestOfKO === 1 ? 1 : 3);
    setKO(propagate(tree));
  };

  const onScoreKO = (id, side, setIdx, val) => {
    setKO((prev) => {
      const copy = prev.map((m) => (m.id !== id ? m : ({ ...m, sA: [...m.sA], sB: [...m.sB] })));
      const idx = copy.findIndex((m) => m.id === id);
      if (idx < 0) return prev;
      if (side === "A") copy[idx].sA[setIdx] = val; else copy[idx].sB[setIdx] = val;
      return propagate(copy);
    });
  };

  // ===== Last finished helpers =====
  const lastFinishedIdx = (list) => {
    let i = -1; for (let k = 0; k < list.length; k++) { const m = list[k]; if (isMatchDone(m.setsBestOf, m.sA, m.sB)) i = k; }
    return i;
  };

  /*****************
   * Render
   *****************/
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Turnier-Tracker</h1>
        <button className="text-sm px-3 py-1 rounded border" onClick={() => setShowSetup((s) => !s)} aria-pressed={showSetup}>
          {showSetup ? "Setup ausblenden" : "Setup einblenden"}
        </button>
      </div>

      {showSetup && (
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Turnier-Setup</h2>

          <div className="flex gap-4 mb-4 items-center flex-wrap">
            <label className="flex items-center gap-2">Courts
              <input type="number" min={1} max={4} value={courts} onChange={(e) => setCourts(clamp(parseInt(e.target.value) || 2, 1, 4))} className="border rounded p-2 w-24"/>
            </label>
            <label className="flex items-center gap-2">Gruppen
              <input type="number" min={1} max={8} value={groups} onChange={(e) => setGroups(clamp(parseInt(e.target.value) || 4, 1, 8))} className="border rounded p-2 w-24"/>
            </label>
            <label className="flex items-center gap-2">Teams
              <input type="number" min={2} max={16} value={teamsCount} onChange={(e) => setTeamsCount(clamp(parseInt(e.target.value) || 16, 2, 16))} className="border rounded p-2 w-24"/>
            </label>
          </div>

          <div className="mb-4 flex items-center gap-4">
            <div className="font-medium">Sätze (Gruppenphase):</div>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="setsGroup" checked={setsBestOfGroup === 1} onChange={() => setSetsBestOfGroup(1)} /> 1 Satz
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="setsGroup" checked={setsBestOfGroup === 3} onChange={() => setSetsBestOfGroup(3)} /> 2 gewonnene Sätze
            </label>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Teamnamen (neutral, vor Gruppeneinteilung):</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Array.from({ length: teamsCount }).map((_, i) => (
                <input
                  key={`tn-${i}`}
                  type="text"
                  className="border rounded p-2 w-full"
                  placeholder={`Team ${i + 1}`}
                  value={teams[i]}
                  onChange={(e) => setTeams((p) => { const c = [...p]; c[i] = e.target.value; return c; })}
                />
              ))}
            </div>
          </div>

          {groupsCreated && !started && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {Array.from({ length: Math.max(1, groups) }).map((_, gi) => (
                <div key={gi} className="border rounded p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">Gruppe G{gi + 1}</h3>
                    <span className={badgeClass(gi)}>G{gi + 1}</span>
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: teamsCount }).map((_, idx) => (
                      teamGroups[idx] === gi ? (
                        <div key={`g-${gi}-idx-${idx}`} className="flex items-center gap-2">
                          <input
                            type="text"
                            className="border rounded p-1 flex-1"
                            value={teams[idx]}
                            onChange={(e) => setTeams((p) => { const c = [...p]; c[idx] = e.target.value; return c; })}
                          />
                          <select value={teamGroups[idx]} onChange={(e) => changeGroup(idx, parseInt(e.target.value))} className="border rounded p-1">
                            {Array.from({ length: Math.max(1, groups) }).map((_, g2) => (
                              <option key={g2} value={g2}>G{g2 + 1}</option>
                            ))}
                          </select>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={start}>Turnier starten</button>
            <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={createGroups} disabled={started}>Gruppen erstellen</button>
            <button className="bg-gray-800 text-white px-4 py-2 rounded" onClick={askDemo} disabled={started}>Demo befüllen</button>
            <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={reset}>Zurücksetzen</button>
          </div>
        </div>
      )}

      {started && (
        <div className="space-y-10">
          {/* Tabellen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tables.map((rows, gi) => (
              <div key={`tbl-${gi}`} className="bg-white border rounded-lg p-4 shadow-sm overflow-x-auto">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold">Gruppe G{gi + 1}</h3>
                  <span className={badgeClass(gi)}>G{gi + 1}</span>
                </div>
                <table className="min-w-[520px] text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2">Team</th>
                      <th className="text-right p-2">P</th>
                      <th className="text-right p-2">W</th>
                      <th className="text-right p-2">L</th>
                      <th className="text-right p-2">PF</th>
                      <th className="text-right p-2">PA</th>
                      <th className="text-right p-2">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows?.map((r) => (
                      <tr key={r.idx} className="border-t">
                        <td className="p-2 flex items-center gap-2">
                          <span className={badgeClass(gi)}>G{gi + 1}</span>
                          <span>{r.team}</span>
                        </td>
                        <td className="p-2 text-right">{r.P}</td>
                        <td className="p-2 text-right">{r.W}</td>
                        <td className="p-2 text-right">{r.L}</td>
                        <td className="p-2 text-right">{r.PF}</td>
                        <td className="p-2 text-right">{r.PA}</td>
                        <td className="p-2 text-right">{r.Diff}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Spiele – Gruppenphase */}
          <div className="border rounded p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Spiele – alle Gruppen</div>
              <div className="flex items-center gap-2">
                <button className="text-sm px-3 py-1 rounded border" onClick={() => setHidePastGroups((s) => !s)}>
                  {hidePastGroups ? "Vergangene Spiele einblenden" : "Vergangene Spiele ausblenden"}
                </button>
                <button className="text-sm px-3 py-1 rounded border" onClick={fillDummyGroupResults}>Dummy-Ergebnisse</button>
              </div>
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(1, courts)}, minmax(0, 1fr))` }}>
              {courtsView.map((list, ci) => {
                const lastDone = lastFinishedIdx(list);
                return (
                  <div key={`court-${ci}`} className="border rounded-lg p-3">
                    <div className="font-semibold mb-2">Court {ci + 1}</div>
                    <div className="space-y-2">
                      {list.map((m, i) => {
                        const done = isMatchDone(m.setsBestOf, m.sA, m.sB);
                        if (hidePastGroups && done && i !== lastDone) return null;
                        const dimmed = hidePastGroups && done && i !== lastDone;
                        const sets = m.setsBestOf === 1 ? 1 : 3;
                        return (
                          <div key={`g-${ci}-${m.slot}-${i}`} className={`border rounded p-3 ${done ? "bg-gray-50" : "bg-white"}`} style={{ opacity: dimmed ? 0.6 : 1 }}>
                            <div className="text-xs text-gray-600 mb-2">R {m.round} · Slot {m.slot} · <span className={badgeClass(m.gi)}>G{m.gi + 1}</span></div>
                            <div className="flex flex-col gap-2">
                              <TeamRow
                                label={nameOf(m.a)}
                                fields={Array.from({ length: sets }).map((_, si) => (
                                  <ScoreInput key={`a-${si}`} value={m.sA[si] ?? ""} onChange={(v) => updateSet(m, "A", si, v)} />
                                ))}
                              />
                              <TeamRow
                                label={nameOf(m.b)}
                                fields={Array.from({ length: sets }).map((_, si) => (
                                  <ScoreInput key={`b-${si}`} value={m.sB[si] ?? ""} onChange={(v) => updateSet(m, "B", si, v)} />
                                ))}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KO-Konfigurator */}
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">KO-Konfigurator</h3>
            </div>
            <div className="flex flex-wrap items-center gap-6 mb-3">
              <div className="flex items-center gap-3">
                <div className="font-medium">Sätze (KO-Phase):</div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="setsKO" checked={setsBestOfKO === 1} onChange={() => setSetsBestOfKO(1)} /> 1 Satz
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="setsKO" checked={setsBestOfKO === 3} onChange={() => setSetsBestOfKO(3)} /> 2 gewonnene Sätze
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={playAllPlaces} onChange={e=>setPlayAllPlaces(e.target.checked)} /> Alle Plätze ausspielen (5–8)
              </label>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={buildKOFromTables}>KO-Phase starten</button>
              <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={reset}>Zurücksetzen</button>
            </div>
          </div>

          {/* KO-Phase */}
          {ko.length > 0 && (
            <div className="bg-white border rounded-lg p-4 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">KO-Phase</h3>
                <button className="text-sm px-3 py-1 rounded border" onClick={() => setHidePastKO((s) => !s)}>
                  {hidePastKO ? "Vergangene Spiele einblenden" : "Vergangene Spiele ausblenden"}
                </button>
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(1, courts)}, minmax(0, 1fr))` }}>
                {Array.from({ length: Math.max(1, courts) }).map((_, ci) => {
                  const list = ko.filter((m) => (Math.max(1, Math.min(courts, m.court || 1)) - 1) === ci).slice().sort((a, b) => a.slot - b.slot);
                  const lastDone = lastFinishedIdx(list);
                  return (
                    <div key={`ko-${ci}`} className="border rounded-lg p-3">
                      <div className="font-semibold mb-2">Court {ci + 1}</div>
                      {list.length === 0 ? (
                        <div className="text-xs text-gray-400">Keine Spiele</div>
                      ) : (
                        <div className="space-y-2">
                          {list.map((m, i) => {
                            const aN = m.a != null ? nameOf(m.a) : (m.aRef ? "Sieger/Verlierer" : "—");
                            const bN = m.b != null ? nameOf(m.b) : (m.bRef ? "Sieger/Verlierer" : "—");
                            const done = isMatchDone(m.setsBestOf, m.sA, m.sB);
                            if (hidePastKO && done && i !== lastDone) return null;
                            const dimmed = hidePastKO && done && i !== lastDone;
                            const sets = m.setsBestOf === 1 ? 1 : 3;
                            return (
                              <div key={m.id} className={`border rounded p-3 ${done ? "bg-gray-50" : "bg-white"}`} style={{ opacity: dimmed ? 0.6 : 1 }}>
                                <div className="text-xs text-gray-600 mb-2">{m.label} · Court {Math.max(1, Math.min(courts, m.court || 1))} · Slot {m.slot}</div>
                                <div className="flex flex-col gap-2">
                                  <TeamRow
                                    label={aN}
                                    fields={Array.from({ length: sets }).map((_, si) => (
                                      <ScoreInput key={`ka-${si}`} value={m.sA[si] ?? ""} onChange={(v) => onScoreKO(m.id, "A", si, v)} />
                                    ))}
                                  />
                                  <TeamRow
                                    label={bN}
                                    fields={Array.from({ length: sets }).map((_, si) => (
                                      <ScoreInput key={`kb-${si}`} value={m.sB[si] ?? ""} onChange={(v) => onScoreKO(m.id, "B", si, v)} />
                                    ))}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Gesamtergebnisse 1–8 */}
              <div className="border rounded p-4">
                <h4 className="font-semibold mb-2">Gesamtergebnisse</h4>
                {(() => {
                  const getWinnerIdx = (m) => {
                    if (!m) return null; if (!isMatchDone(m.setsBestOf, m.sA, m.sB)) return null; const { wA, wB } = calcSetWins(m.sA, m.sB); return wA > wB ? m.a : m.b;
                  };
                  const getLoserIdx = (m) => {
                    if (!m) return null; if (!isMatchDone(m.setsBestOf, m.sA, m.sB)) return null; const { wA, wB } = calcSetWins(m.sA, m.sB); return wA > wB ? m.b : m.a;
                  };
                  const F = ko.find((m) => m.stage === "F");
                  const B = ko.find((m) => m.stage === "BRONZE");
                  const P5 = ko.find((m) => m.stage === "P5");
                  const P7 = ko.find((m) => m.stage === "P7");
                  const places = [];
                  const p1 = getWinnerIdx(F), p2 = getLoserIdx(F), p3 = getWinnerIdx(B), p4 = getLoserIdx(B), p5 = getWinnerIdx(P5), p6 = getLoserIdx(P5), p7 = getWinnerIdx(P7), p8 = getLoserIdx(P7);
                  if (p1!=null) places.push({ place:1, idx:p1 });
                  if (p2!=null) places.push({ place:2, idx:p2 });
                  if (p3!=null) places.push({ place:3, idx:p3 });
                  if (p4!=null) places.push({ place:4, idx:p4 });
                  if (p5!=null) places.push({ place:5, idx:p5 });
                  if (p6!=null) places.push({ place:6, idx:p6 });
                  if (p7!=null) places.push({ place:7, idx:p7 });
                  if (p8!=null) places.push({ place:8, idx:p8 });
                  return places.length === 0 ? (
                    <div className="text-sm text-gray-500">Noch keine Platzierungen ermittelt</div>
                  ) : (
                    <table className="text-sm w-full">
                      <thead className="bg-gray-100">
                        <tr><th className="text-left p-2 w-24">Platz</th><th className="text-left p-2">Team</th></tr>
                      </thead>
                      <tbody>
                        {places.map((r) => (
                          <tr key={r.place} className="border-t"><td className="p-2">{r.place}</td><td className="p-2">{nameOf(r.idx)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/*****************
 * Minimal Unit Tests (run once in browser)
 *****************/
function __runUnitTests(){
  const g4 = chunkEven([1,2,3,4,5,6,7,8], 4); console.assert(g4.length===4, 'chunkEven groups=4'); console.assert(g4[0].length===2 && g4[1].length===2, 'chunkEven even distribution');
  const rr4 = roundRobinPairs([0,1,2,3]); const rr4Total = rr4.reduce((s,r)=>s+r.length,0); console.assert(rr4.length===3, 'RR(4) rounds=3'); console.assert(rr4Total===6, 'RR(4) matches=6');
  const rr5 = roundRobinPairs([0,1,2,3,4]); const rr5Total = rr5.reduce((s,r)=>s+r.length,0); console.assert(rr5.length===5, 'RR(5) rounds=5'); console.assert(rr5Total===10, 'RR(5) matches=10');
  const g3 = chunkEven([0,1,2,3,4], 3).map(a=>a.length).sort((a,b)=>a-b).join(','); console.assert(g3==='1,2,2', 'chunkEven 5→3 distribution');
  const rr3 = roundRobinPairs([0,1,2]); const rr3Total = rr3.reduce((s,r)=>s+r.length,0); console.assert(rr3Total===3, 'RR(3) matches=3');
  console.assert(isMatchDone(1, ["11"],["9"])===true, 'best-of-1 done');
  console.assert(isMatchDone(3, ["11","9",""],["3","11",""])===false, 'bo3 not yet');
  console.assert(isMatchDone(3, ["11","9","11"],["3","11","7"])===true, 'bo3 done');
}
if (typeof window!== 'undefined' && !window.__TT_TESTS__) { window.__TT_TESTS__=true; try{ __runUnitTests(); } catch(e){ console.warn('Unit tests error:', e); } }

// Mount app on all shortcode roots
(function mountAll(){
  const nodes = document.querySelectorAll('.tt-tracker-root');
  nodes.forEach((el) => {
    if (el.__ttMounted) return;
    el.__ttMounted = true;
    const root = ReactDOM.createRoot(el);
    root.render(React.createElement(TournamentTracker));
  });
})();
