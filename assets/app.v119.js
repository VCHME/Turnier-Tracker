
(function(){
  function boot(){
    var root=document.getElementById('vchme-tt-app'); if(!root) return;
    if(window && window.console){ console.log('VCHME TT 1.1.9 boot'); }
    var $=function(s,c){return (c||document).querySelector(s)}, $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};
    var wrap = root.querySelector('.vchme-tt'); if(!wrap){ return; }

    var selCourts=$('#tt-courts'), selGroups=$('#tt-groups');
    var setup=$('#tt-setup'), teamsWrap=$('#tt-teams');
    var gView=$('#tt-groups-ko'), tables=$('#tt-tables'), nextGrid=$('#tt-next-grid'), doneGrid=$('#tt-done-grid');
    var courtsInfo=$('#tt-courts-info');
    var advSel=$('#tt-advance'), chkAllPlaces=$('#tt-all-places');
    var koCard=$('#tt-ko-card'), rankBody=$('#tt-ranking-body');
    var koNextGrid=$('#tt-ko-next-grid'), koDoneGrid=$('#tt-ko-done-grid'), koCourtsInfo=$('#tt-ko-courts-info');

    // UI state
    var ui={ groupsVisible:true, tablesHidden:false, doneHidden:false, nextHidden:false, koDoneHidden:false };
    function applyUI(){
      var groupsCard = document.getElementById('tt-groups-card');
      groupsCard.style.display = ui.groupsVisible ? 'block' : 'none';
      if(ui.tablesHidden) tables.classList.add('is-hidden'); else tables.classList.remove('is-hidden');
      if(ui.doneHidden) doneGrid.classList.add('is-hidden'); else doneGrid.classList.remove('is-hidden');
      if(ui.nextHidden) nextGrid.classList.add('is-hidden'); else nextGrid.classList.remove('is-hidden');
      if(ui.koDoneHidden) koDoneGrid.classList.add('is-hidden'); else koDoneGrid.classList.remove('is-hidden');
      var btnTbl=$('#tt-toggle-tables'); if(btnTbl){ btnTbl.textContent = ui.tablesHidden ? 'Tabellen einblenden' : 'Tabellen ausblenden'; }
      var btnGrp2=$('#tt-toggle-groups2'); if(btnGrp2){ btnGrp2.textContent = ui.groupsVisible ? 'Gruppenphase ausblenden' : 'Gruppenphase einblenden'; }
      var btnKOD=$('#tt-toggle-ko-done'); if(btnKOD){ btnKOD.textContent = ui.koDoneHidden ? 'Einblenden' : 'Ausblenden'; }
    }

    var st={
      courts: parseInt(root.getAttribute('data-courts')||'2',10),
      groups: parseInt(root.getAttribute('data-groups')||'4',10),
      teams:new Array(16).fill(''),
      indexNames:new Array(16).fill(''),
      g_assign:{},
      g_matches:{},
      g_tables:{},
      ko_matches:{},
      ko_started:false,
      advance:2,
      allPlaces:false,
      _place58:false
    };

    selCourts.value=String(st.courts); selGroups.value=String(st.groups); advSel.value=String(st.advance);

    function buildTeamInputs(editable){
      if(editable===undefined) editable=true;
      teamsWrap.innerHTML='';
      for(var i=0;i<16;i++){
        var inp=document.createElement('input');
        inp.placeholder='Team '+(i+1);
        inp.value = st.teams[i] || '';
        inp.disabled = !editable;
        inp.addEventListener('input', (function(ix){ return function(){ st.teams[ix]=this.value.trim(); }; })(i));
        teamsWrap.appendChild(inp);
      }
    }
    function effectiveGroups(n, desired){
      if(n<2) return 1;
      var g=Math.max(1,Math.min(4,desired|0));
      g=Math.min(g,Math.max(1,Math.floor(n/2)));
      return g;
    }
    function rrPairs(arr){
      var t=arr.slice();
      if(t.length%2) t.push(null);
      var rounds=t.length-1, half=t.length/2, out=[];
      for(var r=0;r<rounds;r++){
        var round=[];
        for(var i=0;i<half;i++){
          var A=t[i], B=t[t.length-1-i];
          if(A!==null&&B!==null) round.push([A,B]);
        }
        out.push(round);
        t.splice(1,0,t.pop());
      }
      return out;
    }
    function sortRows(rows){
      return rows.sort(function(a,b){ return (b.P-a.P) || (b.W-a.W) || (b.Diff-a.Diff) || (b.PF-a.PF) || a.team.localeCompare(b.team); });
    }
    function updateTables(){
      Object.keys(st.g_assign).forEach(function(g){
        var list=st.g_assign[g];
        var T={};
        list.forEach(function(t){ T[t]={team:t,P:0,W:0,L:0,PF:0,PA:0,Diff:0}; });
        Object.keys(st.g_matches).forEach(function(mid){
          var m=st.g_matches[mid];
          if(m.group!==g) return;
          if(Number.isFinite(m.sa)&&Number.isFinite(m.sb)){
            T[m.a].P+=2; T[m.b].P+=2;
            T[m.a].PF+=m.sa; T[m.a].PA+=m.sb;
            T[m.b].PF+=m.sb; T[m.b].PA+=m.sa;
            if(m.sa>m.sb){ T[m.a].W++; T[m.b].L++; T[m.a].P+=1; } else if(m.sb>m.sa){ T[m.b].W++; T[m.a].L++; T[m.b].P+=1; }
          }
        });
        Object.keys(T).forEach(function(k){ T[k].Diff = T[k].PF - T[k].PA; });
        st.g_tables[g]=T;
      });
    }
    function renderTables(){
      tables.innerHTML='';
      var groups = Object.keys(st.g_tables).sort();
      if(groups.length % 2 === 0 && groups.length > 1){
        tables.classList.add('vchme-tt__two-col');
      } else {
        tables.classList.remove('vchme-tt__two-col');
      }
      groups.forEach(function(g){
        var wrap=document.createElement('div'); wrap.className='vchme-tt__card';
        var tbl=document.createElement('table'); tbl.className='vchme-tt__table';
        tbl.innerHTML='<thead><tr><th>Gr.</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody></tbody>';
        var tb = tbl.querySelector('tbody');
        var badge = '<span class="grp-badge grp-'+g+'">'+g+'</span>';
        var rows = sortRows(Object.values(st.g_tables[g]));
        rows.forEach(function(r,i){
          tb.insertAdjacentHTML('beforeend',
            '<tr><td>'+badge+'</td><td>'+(i+1)+'. '+r.team+'</td><td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.L+'</td><td>'+r.PF+'</td><td>'+r.PA+'</td><td>'+r.Diff+'</td></tr>');
        });
        wrap.appendChild(tbl); tables.appendChild(wrap);
      });
    }
    function planGroupSchedule(){
      var all = Object.values(st.g_matches);
      var pool = all.filter(function(m){ return !(Number.isFinite(m.sa)&&Number.isFinite(m.sb)) && !(Number.isFinite(m.slot) && Number.isFinite(m.ci)); });

      function teamsInSlot(s){
        var t=new Set();
        all.forEach(function(m){ if(Number.isFinite(m.slot) && m.slot===s){ if(m.a) t.add(m.a); if(m.b) t.add(m.b);} });
        return t;
      }
      var s = 1, safety=0;
      while(pool.length && safety<50000){
        safety++;
        var usedTeams = new Set(), usedCourts = new Set();
        all.forEach(function(m){
          if(Number.isFinite(m.slot) && m.slot===s){
            if(m.a) usedTeams.add(m.a);
            if(m.b) usedTeams.add(m.b);
            if(Number.isFinite(m.ci)) usedCourts.add(m.ci);
          }
        });
        var prevTeams = teamsInSlot(s-1);
        function pickNext(){
          var pickIndex = -1;
          for(var i=0;i<pool.length;i++){
            var m = pool[i]; if(!m.a || !m.b) continue;
            if(usedTeams.has(m.a) || usedTeams.has(m.b)) continue;
            if(prevTeams.has(m.a) || prevTeams.has(m.b)) continue;
            pickIndex = i; break;
          }
          if(pickIndex<0){
            for(i=0;i<pool.length;i++){
              m = pool[i]; if(!m.a || !m.b) continue;
              if(usedTeams.has(m.a) || usedTeams.has(m.b)) continue;
              pickIndex = i; break;
            }
          }
          if(pickIndex<0){
            for(i=0;i<pool.length;i++){
              m = pool[i]; if(!m.a || !m.b) continue;
              pickIndex = i; break;
            }
          }
          return pickIndex;
        }
        for(var court=1; court<=st.courts; court++){
          if(usedCourts.has(court)) continue;
          var idx = pickNext();
          if(idx<0) break;
          var sel = pool.splice(idx,1)[0];
          sel.slot = s; sel.ci = court; sel.court = 'Court '+court;
          usedCourts.add(court); usedTeams.add(sel.a); usedTeams.add(sel.b);
          if(!pool.length) break;
        }
        s++;
      }
    }

    function renderMatchRow(m, withScores){
      if(withScores===undefined) withScores=true;
      var el=document.createElement('div'); el.className='vchme-tt__match'; el.id='wrap-'+m.id;
      var header = m.slot ? ('Slot '+m.slot) : (m.roundName? m.roundName : '—');
      var gtxt = m.group ? ('<span class="grp-badge grp-'+m.group+'">'+m.group+'</span>') : (m.roundName||'KO');
      el.innerHTML = '<div class="vchme-tt__label">'+gtxt+' – '+header+(m.court? ' <span class="vchme-tt__badge">'+m.court+'</span>':'')+'</div>'
        + '<div class="vchme-tt__row"><input id="'+m.id+'-a" value="'+(m.a||'')+'" disabled></div>'
        + '<div class="vchme-tt__row"><input id="'+m.id+'-b" value="'+(m.b||'')+'" disabled></div>'
        + (withScores? '<div class="vchme-tt__row vchme-tt__row--s"><input id="'+m.id+'-sa" type="number" min="0" placeholder="Punkte"><input id="'+m.id+'-sb" type="number" min="0" placeholder="Punkte"></div>' : '');
      if(withScores){
        var sa=el.querySelector('#'+m.id+'-sa'), sb=el.querySelector('#'+m.id+'-sb');
        if(sa) sa.value = Number.isFinite(m.sa) ? m.sa : ''; if(sb) sb.value = Number.isFinite(m.sb) ? m.sb : '';
        [sa,sb].forEach(function(inp){
          if(!inp || inp.dataset.b) return; inp.dataset.b=1;
          inp.addEventListener('change', function(){
            var a=parseInt(sa.value||'',10), b=parseInt(sb.value||'',10);
            if(Number.isFinite(a)&&Number.isFinite(b)){
              m.sa=a; m.sb=b;
              if(m.group){ renderGroupMatches(); }
              else { onKOScore(m.id); renderKO(); }
            }
          });
        });
      }
      return el;
    }
    function renderGroupMatches(){
      updateTables(); renderTables();
      var all = Object.values(st.g_matches);
      var next = all.filter(function(m){ return !(Number.isFinite(m.sa)&&Number.isFinite(m.sb)); }).slice().sort(function(a,b){ return ((a.slot||999)-(b.slot||999)) || a.group.localeCompare(b.group); });
      var done = all.filter(function(m){ return (Number.isFinite(m.sa)&&Number.isFinite(m.sb)); }).slice().sort(function(a,b){ return ((b.slot||0)-(a.slot||0)) || a.group.localeCompare(b.group); });
      function mkColGrid(container, list){
        container.innerHTML='';
        container.style.gridTemplateColumns = 'repeat('+st.courts+', minmax(220px,1fr))';
        var cols=[];
        for(var c=1;c<=st.courts;c++){
          var col=document.createElement('div'); col.className='vchme-tt__court-col'; col.innerHTML='<h4>Court '+c+'</h4>';
          container.appendChild(col); cols.push(col);
        }
        list.forEach(function(m){
          var num = (m.ci && Number.isFinite(m.ci)) ? m.ci : parseInt(String(m.court||'').replace(/\D+/g,''), 10) || 1;
          var idx = Math.max(1, Math.min(st.courts, num)) - 1;
          cols[idx].appendChild(renderMatchRow(m));
        });
      }
      mkColGrid(doneGrid, done);
      mkColGrid(nextGrid, next);
    }

    function computeStandings(){
      updateTables();
      var out={};
      Object.keys(st.g_tables).forEach(function(g){
        out[g]=sortRows(Object.values(st.g_tables[g]));
      });
      return out;
    }
    function qualifiersByAdvance(advance){
      var S=computeStandings(); var groups=Object.keys(S).sort();
      var quals=[];
      groups.forEach(function(g){
        for(var k=0;k<advance;k++){ if(S[g][k]) quals.push({team:S[g][k].team, group:g, rank:k+1}); }
      });
      return quals;
    }

    
function buildKO(){
  st.advance = parseInt(advSel.value,10); st.allPlaces = !!chkAllPlaces.checked;
  var quals = qualifiersByAdvance(st.advance);
  if(quals.length<2){ alert('Zu wenige Aufsteiger für KO.'); return; }

  // Seed by rank (1., dann 2., dann 3. ...) und gruppenstabil
  var byRank = {};
  quals.forEach(function(q){ if(!byRank[q.rank]) byRank[q.rank]=[]; byRank[q.rank].push(q); });
  Object.keys(byRank).forEach(function(r){ byRank[r].sort(function(a,b){ return a.group.localeCompare(b.group); }); });
  var seeded=[]; Object.keys(byRank).sort(function(a,b){return parseInt(a,10)-parseInt(b,10);}).forEach(function(r){ byRank[r].forEach(function(q){ seeded.push(q.team); }); });

  var teams = seeded.slice();
  var N = teams.length;
  var target=1; while((target<<1) <= N) target<<=1;
  var prelim=[], main=[];
  if(N!=target){
    var need = N - target;
    var low = teams.slice(-2*need);
    main = teams.slice(0, N - 2*need);
    for(var i=0;i<need;i++){ prelim.push([low[i*2], low[i*2+1]]); }
  } else { main=teams.slice(); }

  st.ko_matches = {}; st.ko_started=true; st._place58=false;

  var globalSlot=1;
  function assignCourt(roundName, slotIndex){
    if(roundName==='Halbfinale' || roundName==='Finale' || roundName==='Spiel um Platz 3') return 1;
    return ((slotIndex-1) % st.courts) + 1;
  }
  function roundNameForCount(cnt, roundNum){
    if(cnt>=16) return 'Sechzehntelfinale';
    if(cnt===8) return 'Viertelfinale';
    if(cnt===4) return 'Halbfinale'; // wird aber separat erzwungen auf Court 1
    if(cnt===2) return 'Finale';
    if(cnt===1) return 'Finale';
    if(cnt===0) return '—';
    // >8 aber <16 → Achtelfinale
    if(cnt>=9 && cnt<=15) return 'Achtelfinale';
    // sonst generisch
    return (roundNum?('Runde '+roundNum):'KO');
  }

  // Play-Ins zuerst (chrono)
  prelim.forEach(function(p,i){
    var id='KO0M'+(i+1);
    var ci = assignCourt('Play-In', globalSlot);
    st.ko_matches[id]={id:id, round:0, roundName:'Play-In', slot:globalSlot++, a:p[0], b:p[1], sa:null, sb:null, winner:null, loser:null, court:'Court '+ci, ci:ci};
  });

  // Runde 1 (z. B. Viertelfinale bei 8)
  var r1Pairs=[]; for(var i=0;i<main.length;i+=2){ r1Pairs.push([main[i]||null, main[i+1]||null]); }
  var r1Name = roundNameForCount(r1Pairs.length*2, 1);
  r1Pairs.forEach(function(p,i){
    var id='KO1M'+(i+1); var ci=assignCourt(r1Name, globalSlot);
    st.ko_matches[id]={id:id, round:1, roundName:r1Name, slot:globalSlot++, a:p[0], b:p[1], sa:null, sb:null, winner:null, loser:null, court:'Court '+ci, ci:ci};
  });

  // Falls "Alle Plätze" aktiv und wir befinden uns im Viertelfinale (4 Spiele): zuerst Platzierung 5–8 (HF), dann deren Finals (Platz 5/7),
  // danach erst die Halbfinale & Finalblöcke.
  var do58 = st.allPlaces && r1Pairs.length===4;
  if(do58){
    st._place58 = true;
    // Zwei HF (5–8) – Slots nach den Vierteln
    for(var c=1;c<=2;c++){
      var id='KC2M'+c; var ci = assignCourt('Platzierung 5–8 (HF)', globalSlot);
      st.ko_matches[id] = { id:id, round:200, roundName:'Platzierung 5–8 (HF)', slot:globalSlot++, a:null, b:null, sa:null, sb:null, winner:null, loser:null, court:'Court '+ci, ci:ci};
    }
    // Platz 5 + Platz 7 – ebenfalls vor den Halbfinals
    var ci5 = assignCourt('Platz 5', globalSlot);
    st.ko_matches['KC3M1'] = { id:'KC3M1', round:201, roundName:'Platz 5', slot:globalSlot++, a:null, b:null, sa:null, sb:null, winner:null, loser:null, court:'Court '+ci5, ci:ci5};
    var ci7 = assignCourt('Platz 7', globalSlot);
    st.ko_matches['KC3M2'] = { id:'KC3M2', round:201, roundName:'Platz 7', slot:globalSlot++, a:null, b:null, sa:null, sb:null, winner:null, loser:null, court:'Court '+ci7, ci:ci7};
  }

  // Halbfinale
  var semiPairs = new Array(2).fill(null).map(function(){return [null,null];}); // 2 Semis
  semiPairs.forEach(function(p,i){
    var id='KO2M'+(i+1); var ci=assignCourt('Halbfinale', globalSlot);
    st.ko_matches[id]={id:id, round:2, roundName:'Halbfinale', slot:globalSlot++, a:p[0], b:p[1], sa:null, sb:null, winner:null, loser:null, court:'Court '+ci, ci:ci};
  });

  // Bronze (vor Finale)
  var ciB = assignCourt('Spiel um Platz 3', globalSlot);
  st.ko_matches['KOBR1'] = { id:'KOBR1', round:99, roundName:'Spiel um Platz 3', slot:globalSlot++, a:null, b:null, sa:null, sb:null, winner:null, loser:null, court:'Court '+ciB, ci:ciB};

  // Finale
  var ciF = assignCourt('Finale', globalSlot);
  st.ko_matches['KO3M1'] = { id:'KO3M1', round:3, roundName:'Finale', slot:globalSlot++, a:null, b:null, sa:null, sb:null, winner:null, loser:null, court:'Court '+ciF, ci:ciF};

  renderKO();
}
(id){
      var m = st.ko_matches[id]; if(!m) return;
      if(Number.isFinite(m.sa) && Number.isFinite(m.sb)){
        if(m.sa===m.sb){ return; }
        m.winner = m.sa>m.sb ? m.a : m.b;
        m.loser  = m.sa>m.sb ? m.b : m.a;

        if(m.round===0){
          // fill the earliest Round-1 placeholder
          var r1 = Object.values(st.ko_matches).filter(function(x){return x.round===1;}).sort(function(a,b){return a.slot-b.slot;});
          var fill = r1.find(function(x){return !x.a || !x.b;});
          if(fill){ if(!fill.a) fill.a=m.winner; else fill.b=m.winner; }
        } else if(m.round>=1){
          var nextRound = m.round + 1;
          var nextSlot = Math.ceil(m.slot/2);
          var nextId = 'KO'+nextRound+'M'+nextSlot;
          if(st.ko_matches[nextId]){
            var isTop = (m.slot % 2 === 1);
            if(isTop){ st.ko_matches[nextId].a = m.winner; } else { st.ko_matches[nextId].b = m.winner; }
          }
          if(m.roundName==='Halbfinale'){
            // set Bronze teams
            var semis = Object.values(st.ko_matches).filter(function(x){return x.roundName==='Halbfinale';}).sort(function(a,b){return a.slot-b.slot;});
            var losers=[];
            semis.forEach(function(s){
              if(Number.isFinite(s.sa)&&Number.isFinite(s.sb)){
                losers.push( s.sa>s.sb? s.b : s.a );
              }
            });
            if(losers.length===2){
              var bronze = st.ko_matches['KOBR1'];
              if(bronze){ bronze.a=losers[0]; bronze.b=losers[1]; }
            }
          }
          
if(st._place58 && m.roundName==='Viertelfinale'){
  var consHF = [ st.ko_matches['KC2M1'], st.ko_matches['KC2M2'] ];
  for(var i=0;i<consHF.length;i++){
    var c = consHF[i]; if(!c) continue;
    if(!c.a){ c.a = m.loser; break; } else if(!c.b){ c.b = m.loser; break; }
  }
}
 else if(!c.b){ c.b = m.loser; break; }
            }
          }
        }
      }
      updateRanking(); renderKO(); // re-render to move matches between next/done
    }

    function renderKO(){
      koCard.style.display='block';
      koCourtsInfo.textContent = String(st.courts);

      var all = Object.values(st.ko_matches);
      // order by slot (chronological)
      var next = all.filter(function(m){ return !(Number.isFinite(m.sa)&&Number.isFinite(m.sb)) && !(m.a==null && m.b==null); }).slice().sort(function(a,b){ return a.slot-b.slot; });
      var done = all.filter(function(m){ return (Number.isFinite(m.sa)&&Number.isFinite(m.sb)); }).slice().sort(function(a,b){ return b.slot-a.slot; });

      function mkColGrid(container, list){
        container.innerHTML='';
        container.style.gridTemplateColumns = 'repeat('+st.courts+', minmax(220px,1fr))';
        var cols=[];
        for(var c=1;c<=st.courts;c++){
          var col=document.createElement('div'); col.className='vchme-tt__court-col'; col.innerHTML='<h4>Court '+c+'</h4>';
          container.appendChild(col); cols.push(col);
        }
        list.forEach(function(m){
          var num = (m.ci && Number.isFinite(m.ci)) ? m.ci : parseInt(String(m.court||'').replace(/\D+/g,''), 10) || 1;
          var idx = Math.max(1, Math.min(st.courts, num)) - 1;
          cols[idx].appendChild(renderMatchRow(m, true));
        });
      }
      mkColGrid(koDoneGrid, done);
      mkColGrid(koNextGrid, next);

      updateRanking();
    }

    function updateRanking(){
      var rows=[];
      var totals={};
      Object.values(st.g_tables).forEach(function(T){ Object.values(T).forEach(function(r){ totals[r.team]=(totals[r.team]||0)+r.P; }); });

      var finalM = Object.values(st.ko_matches).find(function(m){return m.roundName==='Finale';});
      var bronze = Object.values(st.ko_matches).find(function(m){return m.roundName==='Spiel um Platz 3';});
      if(finalM && Number.isFinite(finalM.sa) && Number.isFinite(finalM.sb)){
        var champ = finalM.sa>finalM.sb? finalM.a:finalM.b;
        var runner= finalM.sa>finalM.sb? finalM.b:finalM.a;
        rows.push({rank:1, team:champ, note:'Finalsieger', groupPts:totals[champ]||0});
        rows.push({rank:2, team:runner, note:'Finalist', groupPts:totals[runner]||0});
      }
      if(bronze && Number.isFinite(bronze.sa) && Number.isFinite(bronze.sb)){
        var third = bronze.sa>bronze.sb? bronze.a:bronze.b;
        var fourth= bronze.sa>bronze.sb? bronze.b:bronze.a;
        rows.push({rank:3, team:third, note:'3. Platz', groupPts:totals[third]||0});
        rows.push({rank:4, team:fourth, note:'4. Platz', groupPts:totals[fourth]||0});
      }

      var p5 = Object.values(st.ko_matches).find(function(m){return m.roundName==='Platz 5';});
      var p7 = Object.values(st.ko_matches).find(function(m){return m.roundName==='Platz 7';});
      if(p5 && Number.isFinite(p5.sa) && Number.isFinite(p5.sb)){
        var fifth = p5.sa>p5.sb? p5.a:p5.b;
        var sixth = p5.sa>p5.sb? p5.b:p5.a;
        rows.push({rank:5, team:fifth, note:'5. Platz', groupPts:totals[fifth]||0});
        rows.push({rank:6, team:sixth, note:'6. Platz', groupPts:totals[sixth]||0});
      }
      if(p7 && Number.isFinite(p7.sa) && Number.isFinite(p7.sb)){
        var seventh = p7.sa>p7.sb? p7.a:p7.b;
        var eighth  = p7.sa>p7.sb? p7.b:p7.a;
        rows.push({rank:7, team:seventh, note:'7. Platz', groupPts:totals[seventh]||0});
        rows.push({rank:8, team:eighth,  note:'8. Platz', groupPts:totals[eighth]||0});
      }

      var used=new Set(rows.map(function(r){return r.team;}));
      var restTeams = [].concat.apply([], Object.values(st.g_assign));
      restTeams.forEach(function(t){ if(!used.has(t)) rows.push({rank:'-', team:t, note:'', groupPts:totals[t]||0}); });
      rankBody.innerHTML='';
      var tbl=document.createElement('table');
      tbl.innerHTML = '<thead><tr><th>Platz</th><th>Team</th><th>Anmerkung</th><th>Punkte (Gruppe)</th></tr></thead><tbody></tbody>';
      var tb=tbl.querySelector('tbody');
      rows.forEach(function(r){ tb.insertAdjacentHTML('beforeend', '<tr><td>'+r.rank+'</td><td>'+ (r.team||'') +'</td><td>'+ (r.note||'') +'</td><td>'+r.groupPts+'</td></tr>'); });
      rankBody.appendChild(tbl);
    }

    document.addEventListener('click', function(ev){
      if(ev.target && ev.target.id==='tt-demo'){
        var n = parseInt(prompt('Wie viele Teams für die Demo? (2–16)', '12') || '12', 10);
        if(!Number.isFinite(n) || n<2) n=12; if(n>16) n=16;
        var demoTeams=[]; for(var i=1;i<=n;i++) demoTeams.push('Team '+i);
        st.teams = new Array(16).fill(''); demoTeams.forEach(function(t,i){ st.teams[i]=t; });
        buildTeamInputs(true);
      }
      if(ev.target && ev.target.id==='tt-fill-scores'){
        function rnd(){ return 1 + Math.floor(Math.random()*21); }
        Object.values(st.g_matches).forEach(function(m){
          var a=rnd(), b=rnd(); if(a===b){ b = (b%21)+1; if(b===a) b = ((b+1)%21)+1; }
          m.sa=a; m.sb=b;
        });
        planGroupSchedule(); renderGroupMatches();
      }
      if(ev.target && ev.target.id==='tt-apply-names'){ applyNames(); }
      if(ev.target && ev.target.id==='tt-toggle-setup'){
        var hidden = setup.style.display==='none';
        setup.style.display = hidden ? 'block' : 'none';
        ev.target.textContent = hidden ? 'Teilnehmer ausblenden' : 'Teilnehmer einblenden';
      }
      if(ev.target && ev.target.id==='tt-toggle-tables'){ ui.tablesHidden = !ui.tablesHidden; applyUI(); }
      if(ev.target && ev.target.id==='tt-toggle-groups2'){ ui.groupsVisible = !ui.groupsVisible; applyUI(); }
      if(ev.target && ev.target.id==='tt-toggle-done'){ ui.doneHidden = !ui.doneHidden; applyUI(); ev.target.textContent = ui.doneHidden ? 'Einblenden' : 'Ausblenden'; }
      if(ev.target && ev.target.id==='tt-toggle-ko-done'){ ui.koDoneHidden = !ui.koDoneHidden; applyUI(); }
      if(ev.target && ev.target.id==='tt-build-ko'){ buildKO(); }
      if(ev.target && ev.target.id==='tt-rebuild-ko'){ buildKO(); }
    });
    selCourts.addEventListener('change', function(){
      st.courts=parseInt(selCourts.value,10);
      courtsInfo.textContent=String(st.courts);
      Object.values(st.g_matches).forEach(function(m){
        var done = Number.isFinite(m.sa) && Number.isFinite(m.sb);
        if(!done){ m.slot=null; m.ci=null; m.court=null; }
      });
      planGroupSchedule(); renderGroupMatches();
    });
    selGroups.addEventListener('change', function(){ st.groups=parseInt(selGroups.value,10); });

    buildTeamInputs(true);
    document.getElementById('tt-start').addEventListener('click', function(){
      var t = st.teams.filter(function(x){return !!x;});
      if(t.length<2){ alert('Mindestens 2 Teams.'); return; }
      var desired = parseInt(selGroups.value,10) || st.groups;
      var G = effectiveGroups(t.length, desired); selGroups.value=String(G);
      var groups = new Array(G); for(var i=0;i<G;i++) groups[i]=[];
      t.forEach(function(x,i){ groups[i%G].push(x); });
      st.indexNames = st.teams.slice();
      st.g_assign={}; st.g_matches={}; st.g_tables={}; st.ko_matches={}; st.ko_started=false; st._place58=false;
      groups.forEach(function(list,i){ st.g_assign['G'+(i+1)] = list; });
      Object.keys(st.g_assign).forEach(function(g){
        var list=st.g_assign[g];
        st.g_tables[g]={};
        list.forEach(function(x){ st.g_tables[g][x]={team:x,P:0,W:0,L:0,PF:0,PA:0,Diff:0}; });
        var rr=rrPairs(list);
        rr.forEach(function(round,ri){
          round.forEach(function(p,mi){
            var id=g+'-R'+(ri+1)+'-M'+(mi+1);
            st.g_matches[id]={id:id, group:g, round:(ri+1), a:p[0], b:p[1], sa:null, sb:null, court:null, ci:null, slot:null};
          });
        });
      });
      courtsInfo.textContent=String(st.courts);
      setup.style.display='none'; gView.style.display='block'; 
      koCard.style.display='none';
      planGroupSchedule(); renderGroupMatches(); buildTeamInputs(true); applyUI();
    });
    document.getElementById('tt-clear').addEventListener('click', function(){ location.reload(); });
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
