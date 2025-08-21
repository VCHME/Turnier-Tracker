<?php
/**
 * Plugin Name: Turnier Tracker Canvas
 * Description: Turnier-Tracker (Gruppenphase + KO) als React-App. Shortcode: [tournament_tracker_canvas]
 * Version: 1.0.0
 * Author: ChatGPT
 * License: GPL2+
 */

if (!defined('ABSPATH')) { exit; }

function tt_canvas_shortcode($atts = [], $content = null) {
  // Unique mount id to support multiple instances
  $uid = uniqid('tt_root_');
  ob_start();
  ?>
  <div class="tt-wrapper">
    <div id="<?php echo esc_attr($uid); ?>" data-tt-root class="tt-root"></div>
  </div>

  <!-- Tailwind CDN (utility classes used by the app) -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- React + ReactDOM (UMD) -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- Babel Standalone to transpile JSX client-side -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- Tournament Tracker App -->
  <script type="text/babel">
    const { useMemo, useState } = React;

    // ===== Helpers =====
    const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
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
      \`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border \${GROUP_COLORS[gi % GROUP_COLORS.length]}\`;

    function chunkEven(arr, g) {
      g = clamp(g, 1, 8);
      const out = Array.from({ length: g }, () => []);
      arr.forEach((t, i) => out[i % g].push(t));
      return out;
    }

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

    // ===== KO helpers & builder =====
    const resolveRefIdx = (list, ref) => {
      if (!ref) return null;
      const m = list.find((x) => x.id === ref.fromId);
      if (!m || typeof m.scoreA !== "number" || typeof m.scoreB !== "number") return null;
      const aWins = m.scoreA > m.scoreB;
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

    function buildKO(seeds, courts, playAllPlaces) {
      const out = [];
      let slot = 1;
      const push = (stage, label, a, b, aRef = null, bRef = null) => {
        out.push({ id: \`\${stage}-\${slot}-\${Math.random().toString(36).slice(2, 6)}\`, stage, label, a, b, aRef, bRef, scoreA: null, scoreB: null, court: 0, slot });
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

      const piMatches  = out.filter((m) => m.stage === "PI");
      let piIdx = 0;
      const initial = [];
      for (const [A, B] of pairs) {
        let a = A, b = B, aRef = null, bRef = null;
        if (a == null) { const s = piMatches[piIdx++]; if (s) aRef = { fromId: s.id, outcome: "W" }; }
        if (b == null) { const s = piMatches[piIdx++]; if (s) bRef = { fromId: s.id, outcome: "W" }; }
        const label = N === 16 ? "Achtelfinale" : N === 8 ? "Viertelfinale" : N === 4 ? "Halbfinale" : \`Runde \${N}\`;
        push(\`R\${N}\`, label, a, b, aRef, bRef);
        initial.push(out[out.length - 1]);
      }

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
          else                 push(\`R\${nextSize}\`, \`Runde \${nextSize}\`, null, null, Aref, Bref);
          next.push(out[out.length - 1]);
        }

        if (playAllPlaces && size === 8) {
          const losers = cur.map((m) => ({ fromId: m.id, outcome: "L" }));
          if (losers.length >= 4) {
            const pA = { id: \`p58a-\${Math.random().toString(36).slice(2, 6)}\`, stage: "P5-8", label: "Platz 5-8 Halbfinale", a: null, b: null, aRef: losers[0], bRef: losers[1], scoreA: null, scoreB: null, court: 0, slot: slot++ };
            const pB = { id: \`p58b-\${Math.random().toString(36).slice(2, 6)}\`, stage: "P5-8", label: "Platz 5-8 Halbfinale", a: null, b: null, aRef: losers[2], bRef: losers[3], scoreA: null, scoreB: null, court: 0, slot: slot++ };
            out.push(pA, pB);
            push("P5", "Spiel um Platz 5", null, null, { fromId: pA.id, outcome: "W" }, { fromId: pB.id, outcome: "W" });
            push("P7", "Spiel um Platz 7", null, null, { fromId: pA.id, outcome: "L" }, { fromId: pB.id, outcome: "L" });
          }
        }

        if (size === 4) {
          const sfs = out.filter((m) => m.stage === "SF").slice(-2);
          if (sfs.length === 2) {
            out.push({ id: \`bronze-\${Math.random().toString(36).slice(2, 6)}\`, stage: "BRONZE", label: "Spiel um Platz 3", a: null, b: null, aRef: { fromId: sfs[0].id, outcome: "L" }, bRef: { fromId: sfs[1].id, outcome: "L" }, scoreA: null, scoreB: null, court: 0, slot: slot++ });
          }
        }

        cur = next;
        size = nextSize;
      }

      const C = Math.max(1, courts || 1);
      const isRound = (x) => x.stage[0] === "R" && !isNaN(parseInt(x.stage.slice(1)));
      const roundsNoSF = out.filter(isRound);
      const semis      = out.filter((m) => m.stage === "SF");
      const p58        = out.filter((m) => m.stage === "P5-8");
      const p5         = out.filter((m) => m.stage === "P5");
      const p7         = out.filter((m) => m.stage === "P7");
      const bronze     = out.filter((m) => m.stage === "BRONZE");
      const finale     = out.filter((m) => m.stage === "F");
      const piMatches2 = out.filter((m) => m.stage === "PI");

      const chronological = [
        ...piMatches2,
        ...roundsNoSF,
        ...semis,
        ...p58,
        ...p5,
        ...p7,
        ...bronze,
        ...finale,
      ];

      let slotCounter = 1;
      const assignAcross = (list) => { for (let i = 0; i < list.length; i++) { list[i].court = (i % C) + 1; list[i].slot = slotCounter++; } };
      const assignCourt1 = (list) => { for (let i = 0; i < list.length; i++) { list[i].court = 1; list[i].slot = slotCounter++; } };

      assignAcross(piMatches2);
      assignAcross(roundsNoSF);
      assignAcross(semis);
      assignAcross(p58);
      assignAcross(p5);
      assignAcross(p7);
      assignCourt1(bronze);
      assignCourt1(finale);

      return chronological;
    }

    function TournamentTrackerApp({ mountId }) {
      const [teams, setTeams] = useState(Array(16).fill(""));
      const [courts, setCourts] = useState(2);
      const [groups, setGroups] = useState(4);
      const [groupsCreated, setGroupsCreated] = useState(false);
      const [teamGroups, setTeamGroups] = useState(Array(16).fill(0));
      const [showSetup, setShowSetup] = useState(true);
      const [started, setStarted] = useState(false);
      const [matches, setMatches] = useState([]);
      const [advance, setAdvance] = useState(2);
      const [playAllPlaces, setPlayAllPlaces] = useState(false);
      const [ko, setKO] = useState([]);
      const [hidePastGroups, setHidePastGroups] = useState(true);
      const [hidePastKO, setHidePastKO] = useState(true);

      const nameOf = (i) => teams[i]?.trim() || \`Team \${i + 1}\`;

      const askDemo = () => {
        let n = prompt("Wie viele Teams? (2–16)", "16");
        let v = clamp(parseInt(String(n || "16"), 10) || 16, 2, 16);
        setTeams(Array.from({ length: 16 }, (_, i) => (i < v ? \`Team \${i + 1}\` : "")));
        setGroupsCreated(false); setTeamGroups(Array(16).fill(0));
      };

      const createGroups = () => {
        if (started) return;
        const ids = teams.map((t, i) => (t && t.trim() ? i : -1)).filter((i) => i >= 0);
        if (!ids.length) { alert("Bitte zuerst Teams eintragen"); return; }
        const chunks = chunkEven(ids, groups);
        const tg = Array(16).fill(0); chunks.forEach((lst, gi) => lst.forEach((i) => (tg[i] = gi)));
        setTeamGroups(tg); setGroupsCreated(true);
      };

      const changeGroup = (idx, gi) => setTeamGroups((p) => { const c = [...p]; c[idx] = gi; return c; });

      const start = () => {
        if (started) return;
        const ids = teams.map((t, i) => (t && t.trim() ? i : -1)).filter((i) => i >= 0);
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

        const last = new Map(); const pending = queue.slice(); const out = []; let slot = 1;
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
              out.push({ gi: m.gi, a: m.a, b: m.b, scoreA: null, scoreB: null, round: m.round, court: c, slot });
              taken.add(m.a); taken.add(m.b); last.set(m.a, slot); last.set(m.b, slot); filled++;
            }
          }
          if (!filled) { const m = pending.shift(); out.push({ gi: m.gi, a: m.a, b: m.b, scoreA: null, scoreB: null, round: m.round, court: 1, slot }); last.set(m.a, slot); last.set(m.b, slot); }
          slot++;
        }

        setMatches(out); setStarted(true); setShowSetup(false);
      };

      const reset = () => {
        setTeams(Array(16).fill("")); setTeamGroups(Array(16).fill(0)); setGroupsCreated(false);
        setShowSetup(true); setStarted(false); setMatches([]); setKO([]);
      };

      const updateScore = (ref, side, val) => {
        setMatches((prev) => {
          const next = prev.map((m) => ({ ...m }));
          const idx = next.findIndex((m) => m.court === ref.court && m.slot === ref.slot);
          if (idx < 0) return prev;
          const v = val === "" ? null : Math.max(0, parseInt(String(val)) || 0);
          if (side === "A") next[idx].scoreA = v; else next[idx].scoreB = v;
          return next;
        });
      };

      const fillDummyGroupResults = () => {
        setMatches((prev) => prev.map((m) => ({ ...m, scoreA: m.scoreA == null ? Math.ceil(Math.random() * 21) : m.scoreA, scoreB: m.scoreB == null ? Math.ceil(Math.random() * 21) : m.scoreB })));
      };

      const tables = useMemo(() => {
        const gCount = matches.length ? 1 + Math.max(...matches.map((m) => m.gi)) : groups;
        const per = Array.from({ length: Math.max(1, gCount) }, () => new Map());
        matches.forEach((m) => {
          const map = per[m.gi];
          const ensure = (idx) => { if (!map.has(idx)) map.set(idx, { idx, team: nameOf(idx), P: 0, W: 0, L: 0, PF: 0, PA: 0, Diff: 0 }); return map.get(idx); };
          const A = ensure(m.a); const B = ensure(m.b);
          if (typeof m.scoreA === "number" && typeof m.scoreB === "number") {
            A.PF += m.scoreA; A.PA += m.scoreB; B.PF += m.scoreB; B.PA += m.scoreA; A.Diff = A.PF - A.PA; B.Diff = B.PF - B.PA;
            if (m.scoreA > m.scoreB) { A.W++; B.L++; A.P += 3; } else if (m.scoreB > m.scoreA) { B.W++; A.L++; B.P += 3; }
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

      const buildKOFromTables = () => {
        const adv = clamp(advance, 1, 4);
        const quals = [];
        tables.forEach((rows) => rows.slice(0, adv).forEach((r, p) => quals.push({ place: p + 1, idx: r.idx, P: r.P, Diff: r.Diff, PF: r.PF })));
        if (quals.length < 2) { alert("Zu wenige Aufsteiger für KO."); return; }
        const seeds = [];
        for (let p = 1; p <= adv; p++) {
          const tier = quals.filter((q) => q.place === p).sort((a, b) => b.P - a.P || b.Diff - a.Diff || b.PF - a.PF);
          seeds.push(...tier.map((x) => x.idx));
        }
        const tree = buildKO(seeds, courts, playAllPlaces);
        setKO(propagate(tree));
      };

      const onScoreKO = (id, side, val) => {
        setKO((prev) => {
          const v = val === "" ? null : Math.max(0, parseInt(String(val)) || 0);
          const copy = prev.map((m) => (m.id !== id ? m : { ...m, [side === "A" ? "scoreA" : "scoreB"]: v }));
          return propagate(copy);
        });
      };

      const lastFinishedIdx = (list) => {
        let i = -1; for (let k = 0; k < list.length; k++) { const m = list[k]; if (typeof m.scoreA === "number" && typeof m.scoreB === "number") i = k; }
        return i;
      };

      const TeamRow = ({ label, score, onScore }) => (
        <div className="flex items-center justify-between gap-3">
          <div className="truncate font-medium">{label || "—"}</div>
          <input className="border rounded p-1 text-center" style={{ width: "2.6rem" }} type="number" min={0} value={score ?? ""} onChange={(e)=>onScore(e.target.value)} />
        </div>
      );

      const MatchCard = ({ header, aName, bName, aScore, bScore, onA, onB, dimmed }) => (
        <div className={\`border rounded p-3 \${dimmed ? "bg-gray-50 opacity-70" : "bg-white"}\`}>
          <div className="text-xs text-gray-600 mb-2">{header}</div>
          <div className="flex flex-col gap-2">
            <TeamRow label={aName} score={aScore} onScore={onA} />
            <TeamRow label={bName} score={bScore} onScore={onB} />
          </div>
        </div>
      );

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
                  <input type="number" min={1} max={4} value={courts} onChange={(e) => setCourts(clamp(parseInt(e.target.value) || 2, 1, 4))} className="border rounded p-2 w-20"/>
                </label>
                <label className="flex items-center gap-2">Gruppen
                  <input type="number" min={1} max={8} value={groups} onChange={(e) => setGroups(clamp(parseInt(e.target.value) || 4, 1, 8))} className="border rounded p-2 w-20"/>
                </label>
              </div>

              {!groupsCreated ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                  {teams.map((t, i) => (
                    <input key={i} value={t} placeholder={\`Team \${i + 1}\`} onChange={(e) => setTeams((p) => { const c = [...p]; c[i] = e.target.value; return c; })} className="border rounded p-2 w-full"/>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {Array.from({ length: Math.max(1, groups) }).map((_, gi) => (
                    <div key={gi} className="border rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">Gruppe G{gi + 1}</h3>
                        <span className={badgeClass(gi)}>G{gi + 1}</span>
                      </div>
                      <div className="space-y-2">
                        {teams.map((t, i) => (
                          (teamGroups[i] === gi) ? (
                            <div key={i} className="flex items-center gap-2">
                              <input value={t} placeholder={\`Team \${i + 1}\`} onChange={(e) => setTeams((p) => { const c = [...p]; c[i] = e.target.value; return c; })} className="border rounded p-1 flex-1"/>
                              <select value={teamGroups[i]} onChange={(e) => changeGroup(i, parseInt(e.target.value))} className="border rounded p-1">
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
                <button className="bg-gray-800 text-white px-4 py-2 rounded" onClick={askDemo}>Demo befüllen…</button>
                <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={reset}>Zurücksetzen</button>
              </div>
            </div>
          )}

          {started && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tables.map((rows, gi) => (
                  <div key={\`tbl-\${gi}\`} className="bg-white border rounded-lg p-4 shadow-sm overflow-x-auto">
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

              <div className="border rounded p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">Spiele – alle Gruppen</div>
                  <button className="text-sm px-3 py-1 rounded border" onClick={() => setHidePastGroups((s) => !s)}>
                    {hidePastGroups ? "Vergangene Spiele einblenden" : "Vergangene Spiele ausblenden"}
                  </button>
                </div>
                <div className="grid gap-4" style={{ gridTemplateColumns: \`repeat(\${Math.max(1, courts)}, minmax(0, 1fr))\` }}>
                  {courtsView.map((list, ci) => {
                    const lastDone = lastFinishedIdx(list);
                    return (
                      <div key={\`court-\${ci}\`} className="border rounded-lg p-3">
                        <div className="font-semibold mb-2">Court {ci + 1}</div>
                        <div className="space-y-2">
                          {list.map((m, i) => {
                            const done = typeof m.scoreA === "number" && typeof m.scoreB === "number";
                            const dimmed = hidePastGroups && done && i !== lastDone;
                            return (
                              <MatchCard
                                key={\`g-\${ci}-\${m.slot}-\${i}\`}
                                header={\`R \${m.round} · Slot \${m.slot} · G\${m.gi + 1}\`}
                                aName={nameOf(m.a)} bName={nameOf(m.b)}
                                aScore={m.scoreA} bScore={m.scoreB}
                                onA={(v)=>updateScore(m, "A", v)} onB={(v)=>updateScore(m, "B", v)}
                                dimmed={dimmed}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">KO‑Konfigurator</h3>
                </div>
                <div className="flex flex-wrap items-center gap-4 mb-3">
                  <label className="flex items-center gap-2">Aufsteiger je Gruppe
                    <input type="number" min={1} max={4} value={advance} onChange={(e) => setAdvance(clamp(parseInt(e.target.value) || 2, 1, 4))} className="border rounded p-2 w-20"/>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={playAllPlaces} onChange={(e) => setPlayAllPlaces(e.target.checked)} /> Alle Plätze ausspielen
                  </label>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={buildKOFromTables}>KO‑Phase starten</button>
                  <button className="bg-gray-800 text-white px-4 py-2 rounded" onClick={fillDummyGroupResults}>Dummy‑Ergebnisse (Gruppenphase)</button>
                  <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={reset}>Zurücksetzen</button>
                </div>
              </div>

              {ko.length > 0 && (
                <div className="bg-white border rounded-lg p-4 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">KO‑Phase</h3>
                    <button className="text-sm px-3 py-1 rounded border" onClick={()=>setHidePastKO(s=>!s)}>
                      {hidePastKO? "Vergangene Spiele einblenden" : "Vergangene Spiele ausblenden"}
                    </button>
                  </div>
                  <div className="grid gap-4" style={{ gridTemplateColumns: \`repeat(\${Math.max(1, courts)}, minmax(0, 1fr))\` }}>
                    {Array.from({ length: Math.max(1, courts) }).map((_, ci) => {
                      const list = ko.filter((m) => (Math.max(1, Math.min(courts, m.court || 1)) - 1) === ci).slice().sort((a, b) => a.slot - b.slot);
                      const lastDone = lastFinishedIdx(list);
                      return (
                        <div key={\`ko-\${ci}\`} className="border rounded-lg p-3">
                          <div className="font-semibold mb-2">Court {ci + 1}</div>
                          {list.length === 0 ? (
                            <div className="text-xs text-gray-400">Keine Spiele</div>
                          ) : (
                            <div className="space-y-2">
                              {list.map((m, i) => {
                                const aN = m.a != null ? nameOf(m.a) : (m.aRef ? "Sieger/Verlierer" : "—");
                                const bN = m.b != null ? nameOf(m.b) : (m.bRef ? "Sieger/Verlierer" : "—");
                                const done = typeof m.scoreA === "number" && typeof m.scoreB === "number";
                                const dimmed = hidePastKO && done && i !== lastDone;
                                const header = \`\${m.label} · Court \${Math.max(1, Math.min(courts, m.court || 1))} · Slot \${m.slot}\`;
                                return (
                                  <MatchCard key={m.id} header={header} aName={aN} bName={bN} aScore={m.scoreA} bScore={m.scoreB} onA={(v)=>onScoreKO(m.id, "A", v)} onB={(v)=>onScoreKO(m.id, "B", v)} dimmed={dimmed} />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="border rounded p-4">
                    <h4 className="font-semibold mb-2">Gesamtergebnisse</h4>
                    <div className="text-sm text-gray-500">Wird anhand der KO‑Ergebnisse (Finale, Bronze, Platz 5/7) gebildet.</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Mount for all tt-root instances on the page (supports multiple shortcodes)
    document.addEventListener('DOMContentLoaded', function() {
      const containers = document.querySelectorAll('[data-tt-root]');
      containers.forEach((el) => {
        const root = ReactDOM.createRoot(el);
        root.render(<TournamentTrackerApp mountId={el.id} />);
      });
    });
  </script>
  <?php
  return ob_get_clean();
}

add_shortcode('tournament_tracker_canvas', 'tt_canvas_shortcode');
