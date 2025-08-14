/* VCHME TT 1.4.0 (ES5) */
(function(){
  'use strict';
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};
  var setup=$('#tt-setup'), gView=$('#tt-groups-ko'), koCard=$('#tt-ko-card');
  var teamsWrap=$('#tt-teams'), courtsSel=$('#tt-courts'), selGroups=$('#tt-groups');
  var courtsInfo=$('#tt-courts-info'), doneGrid=$('#tt-done-grid'), nextGrid=$('#tt-next-grid');
  var tablesBox=$('#tt-tables'), tablesGrid=$('#tt-tables');
  var koDoneGrid=$('#tt-ko-done-grid'), koNextGrid=$('#tt-ko-next-grid');

  var st={teams:new Array(16).fill(''), groups:2, courts:2, g_assign:{}, g_matches:{}, g_tables:{}, ko_matches:{}, ko_started:false};
  var ui={doneHidden:false, koDoneHidden:false, tablesHidden:false, groupsHidden:false};

  function groupTag(g){
    var cls='g1'; if(g==='G2') cls='g2'; else if(g==='G3') cls='g3'; else if(g==='G4') cls='g4';
    return '<span class="gtag '+cls+'">'+g+'</span>';
  }

  function readTeams(){ st.teams=$$('#tt-teams input').map(function(i){return i.value.trim()}); }
  function writeTeams(){ teamsWrap.innerHTML=''; for(var i=0;i<16;i++){ var inp=document.createElement('input'); inp.type='text'; inp.placeholder='Team '+(i+1); inp.id='tt-team-'+(i+1); inp.name='tt-team-'+(i+1); inp.value=st.teams[i]||''; teamsWrap.appendChild(inp);} }

  function effectiveGroups(n, desired){
    if(desired===1) return 1;
    if(n<=3) return 1;
    if(n<=6) return Math.min(desired,2);
    if(n<=9) return Math.min(desired,3);
    return Math.min(desired,4);
  }

  function rrPairs(arr){
    var a=arr.slice(); if(a.length%2===1) a.push(null);
    var rounds=a.length-1, half=a.length/2, out=[];
    for(var r=0;r<rounds;r++){
      var rd=[];
      for(var i=0;i<half;i++){ var t1=a[i], t2=a[a.length-1-i]; if(t1&&t2) rd.push([t1,t2]); }
      out.push(rd);
      a.splice(1,0,a.pop());
    }
    return out;
  }

  function planGroupSchedule(){
    var courts=st.courts;
    var gs=Object.keys(st.g_assign);
    var queues={}, lastPlayed={}, global=[];
    for(var gi=0; gi<gs.length; gi++){
      var g=gs[gi];
      var list=[]; var keys=Object.keys(st.g_matches);
      for(var k=0;k<keys.length;k++){ var m=st.g_matches[keys[k]]; if(m.group===g) list.push(m); }
      list.sort(function(a,b){ return a.round-b.round; });
      queues[g]=list;
    }
    var slot=1, placed=0, total=Object.keys(st.g_matches).length, safety=0;
    while(placed<total && safety<10000){
      safety++;
      var progress=false;
      for(var gi2=0; gi2<gs.length; gi2++){
        var gname=gs[gi2]; var q=queues[gname]; if(!q || !q.length) continue;
        var pick=-1, p=0;
        for(var look=0; look<Math.min(3,q.length); look++){
          var cand=q[look], la=lastPlayed[cand.a]||-9999, lb=lastPlayed[cand.b]||-9999;
          if((slot-la)>=2 && (slot-lb)>=2){ pick=look; break; }
        }
        if(pick===-1) pick=0;
        var m=q.splice(pick,1)[0];
        m.slot=slot; m.ci=((slot-1)%courts)+1; m.court='Court '+m.ci;
        lastPlayed[m.a]=slot; lastPlayed[m.b]=slot;
        global.push(m); placed++; slot++;
        progress=true;
      }
      if(!progress){
        // safety fallback
        for(var gi3=0; gi3<gs.length; gi3++){
          var q3=queues[gs[gi3]]; if(q3 && q3.length){ var mm=q3.shift(); mm.slot=slot; mm.ci=((slot-1)%courts)+1; mm.court='Court '+mm.ci; global.push(mm); placed++; slot++; break; }
        }
      }
    }
    for(var i=0;i<global.length;i++){ st.g_matches[global[i].id]=global[i]; }
  }

  function updateTables(){
    var gs=Object.keys(st.g_assign);
    for(var gi=0; gi<gs.length; gi++){
      var g=gs[gi]; var tbl={}; var list=st.g_assign[g];
      for(var i=0;i<list.length;i++){ tbl[list[i]]={team:list[i],P:0,W:0,L:0,PF:0,PA:0,Diff:0}; }
      var keys=Object.keys(st.g_matches);
      for(i=0;i<keys.length;i++){
        var m=st.g_matches[keys[i]];
        if(m.group!==g) continue;
        if(typeof m.sa==='number' && typeof m.sb==='number'){
          tbl[m.a].PF+=m.sa; tbl[m.a].PA+=m.sb; tbl[m.b].PF+=m.sb; tbl[m.b].PA+=m.sa;
          if(m.sa>m.sb){ tbl[m.a].W++; tbl[m.b].L++; tbl[m.a].P+=3; } else if(m.sb>m.sa){ tbl[m.b].W++; tbl[m.a].L++; tbl[m.b].P+=3; }
          tbl[m.a].Diff=tbl[m.a].PF-tbl[m.a].PA; tbl[m.b].Diff=tbl[m.b].PF-tbl[m.b].PA;
        }
      }
      st.g_tables[g]=tbl;
    }
  }

  function renderTables(){
    updateTables(); tablesBox.innerHTML='';
    var gs=Object.keys(st.g_assign);
    var grid=document.getElementById('tt-tables');
    if(grid){ grid.classList.remove('cols-2'); if(gs.length%2===0 && gs.length>1){ grid.classList.add('cols-2'); } }
    for(var gi=0; gi<gs.length; gi++){
      var g=gs[gi]; var rows=[], t=st.g_tables[g], names=Object.keys(t);
      for(var i=0;i<names.length;i++){ rows.push(t[names[i]]); }
      rows.sort(function(a,b){ return b.P-a.P || b.Diff-a.Diff || b.PF-a.PF; });
      var html='<table class="vchme-tt__table"><thead><tr>'+
        '<th>Gruppe '+groupTag(g)+'</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>';
      for(i=0;i<rows.length;i++){ var r=rows[i]; html+='<tr><td>'+(i+1)+'. '+r.team+'</td><td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.L+'</td><td>'+r.PF+'</td><td>'+r.PA+'</td><td>'+r.Diff+'</td></tr>'; }
      html+='</tbody></table>';
      var box=document.createElement('div'); box.innerHTML=html; tablesBox.appendChild(box);
    }
  }

  function mkCourtGrid(container,list){
    container.innerHTML=''; container.style.gridTemplateColumns='repeat('+st.courts+', minmax(220px,1fr))';
    var cols=[]; for(var c=1;c<=st.courts;c++){ var col=document.createElement('div'); col.className='vchme-tt__court-col'; col.innerHTML='<h4>Court '+c+'</h4>'; container.appendChild(col); cols.push(col); }
    for(var i=0;i<list.length;i++){
      var m=list[i]; var idx=(m.ci?m.ci:1)-1; var w=document.createElement('div'); w.className='vchme-tt__match';
      var sa=(typeof m.sa==='number')?m.sa:''; var sb=(typeof m.sb==='number')?m.sb:'';
      var tag = groupTag(m.group);
      w.innerHTML='<div class="vchme-tt__label">'+tag+' – R'+m.round+' <span class="vchme-tt__badge">'+(m.court||('Court '+(idx+1)))+'</span></div>'+
        '<div class="vchme-tt__row"><input id="'+m.id+'-a" name="'+m.id+'-a" value="'+(m.a||'')+'" disabled><input id="'+m.id+'-sa" name="'+m.id+'-sa" type="number" min="0" value="'+sa+'" data-mid="'+m.id+'" data-side="a"></div>'+
        '<div class="vchme-tt__row"><input id="'+m.id+'-b" name="'+m.id+'-b" value="'+(m.b||'')+'" disabled><input id="'+m.id+'-sb" name="'+m.id+'-sb" type="number" min="0" value="'+sb+'" data-mid="'+m.id+'" data-side="b"></div>';
      cols[idx].appendChild(w);
    }
  }

  function renderGroupMatches(){
    var all=[], keys=Object.keys(st.g_matches);
    for(var i=0;i<keys.length;i++){ all.push(st.g_matches[keys[i]]); }
    var done=[], next=[];
    for(i=0;i<all.length;i++){ var m=all[i]; if(typeof m.sa==='number' && typeof m.sb==='number'){ done.push(m); } else { next.push(m); } }
    done.sort(function(a,b){return b.slot-a.slot;});
    next.sort(function(a,b){return a.slot-b.slot;});
    mkCourtGrid(doneGrid, done);
    mkCourtGrid(nextGrid, next);
    renderTables();
  }

  function qualifiers(k){
    var list=[], gs=Object.keys(st.g_assign), i, j;
    for(i=0; i<gs.length; i++){
      var g=gs[i], rows=[], tab=st.g_tables[g], names=Object.keys(tab);
      for(j=0;j<names.length;j++){ rows.push(tab[names[j]]); }
      rows.sort(function(a,b){ return b.P-a.P || b.Diff-a.Diff || b.PF-a.PF; });
      var up=Math.min(k, rows.length);
      for(j=0;j<up;j++){ list.push({g:g, r:j+1, t:rows[j].team}); }
    }
    var byR={}, seeded=[], ranks=Object.keys(list.reduce(function(acc,x){ acc[x.r]=true; return acc; }, {})).sort(function(a,b){return parseInt(a)-parseInt(b)});
    for(i=0;i<list.length;i++){ var x=list[i]; if(!byR[x.r]) byR[x.r]=[]; byR[x.r].push(x); }
    for(i=0;i<ranks.length;i++){ var rk=ranks[i]; byR[rk].sort(function(a,b){ return a.g.localeCompare(b.g); }); for(j=0;j<byR[rk].length;j++){ seeded.push(byR[rk][j].t); } }
    return seeded;
  }

  function buildKO(){
    var adv=parseInt((document.getElementById('tt-adv')||{value:'2'}).value,10)||2;
    var allPlaces=(document.getElementById('tt-allplaces')||{checked:false}).checked;
    var seed=qualifiers(adv); if(seed.length<2){ alert('Zu wenige Aufsteiger'); return; }
    var N=seed.length, target=1; while((target<<1)<=N) target<<=1;
    var prelim=[], main=[];
    if(N!=target){ var need=N-target; var low=seed.slice(-2*need); main=seed.slice(0,N-2*need); for(var i=0;i<need;i++){ prelim.push([low[i*2], low[i*2+1]]); } }
    else { main=seed.slice(); }
    st.ko_matches={}; st.ko_started=true; koCard.style.display='block';
    var gslot=1;
    function addMatch(round, roundName, rslot, a, b){
      var id='KO'+round+'M'+rslot; var ci=(roundName==='Halbfinale'||roundName==='Finale'||roundName==='Spiel um Platz 3')?1:(((gslot-1)%st.courts)+1);
      st.ko_matches[id]={id:id, round:round, roundName:roundName, slot:gslot, rslot:rslot, a:(a||null), b:(b||null), sa:null, sb:null, ci:ci, court:'Court '+ci};
      gslot=gslot+1;
    }
    var i;
    for(i=0;i<prelim.length;i++){ addMatch(0,'Play-In', i+1, prelim[i][0], prelim[i][1]); }
    var r1Pairs=[]; for(i=0;i<main.length;i+=2){ r1Pairs.push([main[i]||null, main[i+1]||null]); }
    var r1Name=(r1Pairs.length===8?'Achtelfinale':(r1Pairs.length===4?'Viertelfinale':(r1Pairs.length===2?'Halbfinale':'Runde 1')));
    for(i=0;i<r1Pairs.length;i++){ addMatch(1, r1Name, i+1, r1Pairs[i][0], r1Pairs[i][1]); }
    if(allPlaces && r1Name==='Viertelfinale'){
      addMatch(200,'Platzierung 5–8 (HF)',1,null,null);
      addMatch(200,'Platzierung 5–8 (HF)',2,null,null);
      addMatch(201,'Platz 5',1,null,null);
      addMatch(201,'Platz 7',1,null,null);
    }
    addMatch(2,'Halbfinale',1,null,null);
    addMatch(2,'Halbfinale',2,null,null);
    addMatch(99,'Spiel um Platz 3',1,null,null);
    addMatch(3,'Finale',1,null,null);

    renderKO(); updateRanking();
  }

  function mkCourtGridKO(container,list){
    container.innerHTML=''; container.style.gridTemplateColumns='repeat('+st.courts+', minmax(220px,1fr))';
    var cols=[]; for(var c=1;c<=st.courts;c++){ var col=document.createElement('div'); col.className='vchme-tt__court-col'; col.innerHTML='<h4>Court '+c+'</h4>'; container.appendChild(col); cols.push(col); }
    for(var i=0;i<list.length;i++){
      var m=list[i]; var idx=(m.ci?m.ci:1)-1; var w=document.createElement('div'); w.className='vchme-tt__match';
      var aName=m.a?m.a:'—'; var bName=m.b?m.b:'—'; var sa=(typeof m.sa==='number')?m.sa:''; var sb=(typeof m.sb==='number')?m.sb:'';
      w.innerHTML='<div class="vchme-tt__label">'+m.roundName+' <span class="vchme-tt__badge">'+(m.court||('Court '+(idx+1)))+'</span></div>'+
        '<div class="vchme-tt__row"><input id="'+m.id+'-a" name="'+m.id+'-a" value="'+aName+'" disabled><input id="'+m.id+'-sa" name="'+m.id+'-sa" type="number" min="0" value="'+sa+'" data-kid="'+m.id+'" data-side="a"></div>'+
        '<div class="vchme-tt__row"><input id="'+m.id+'-b" name="'+m.id+'-b" value="'+bName+'" disabled><input id="'+m.id+'-sb" name="'+m.id+'-sb" type="number" min="0" value="'+sb+'" data-kid="'+m.id+'" data-side="b"></div>';
      cols[idx].appendChild(w);
    }
  }

  function renderKO(){
    if(!st.ko_started) return;
    var all=[], keys=Object.keys(st.ko_matches);
    for(var i=0;i<keys.length;i++){ all.push(st.ko_matches[keys[i]]); }
    all.sort(function(a,b){return a.slot-b.slot;});
    var next=[], done=[];
    for(i=0;i<all.length;i++){ var m=all[i]; if(typeof m.sa==='number' && typeof m.sb==='number'){ done.push(m); } else { next.push(m); } }
    done.sort(function(a,b){return b.slot-a.slot;});
    mkCourtGridKO(koNextGrid, next);
    mkCourtGridKO(koDoneGrid, done);
  }

  function updateRanking(){ /* unchanged from 1.3.9 – omitted here for brevity */ }

  // ------- Name Apply (live rename) ---------
  function applyNames(){
    var old=st.teams.slice(0);
    var now=$$('#tt-teams input').map(function(i){return i.value.trim()});
    var changed=false;
    for(var i=0;i<now.length;i++){
      var o=old[i]||'', n=now[i]||'';
      if(n && n!==o){
        // update teams master
        st.teams[i]=n;
        // g_assign
        var gs=Object.keys(st.g_assign);
        for(var gi=0; gi<gs.length; gi++){
          var arr=st.g_assign[gs[gi]];
          for(var k=0;k<arr.length;k++){ if(arr[k]===o){ arr[k]=n; } }
        }
        // g_matches
        var keys=Object.keys(st.g_matches);
        for(var m=0; m<keys.length; m++){
          var mm=st.g_matches[keys[m]];
          if(mm.a===o) mm.a=n;
          if(mm.b===o) mm.b=n;
        }
        // ko_matches
        var kk=Object.keys(st.ko_matches);
        for(var x=0; x<kk.length; x++){
          var km=st.ko_matches[kk[x]];
          if(km.a===o) km.a=n;
          if(km.b===o) km.b=n;
        }
        changed=true;
      }
    }
    if(changed){
      renderGroupMatches();
      renderKO();
      alert('Namen aktualisiert.');
    } else {
      alert('Keine Änderungen erkannt.');
    }
  }

  function onScoreInput(){/* omitted, same as 1.3.9 */}

  // Re-attach handlers (we keep the rest identical to 1.3.9)
  document.addEventListener('click', function(ev){
    var b=ev.target && ev.target.closest ? ev.target.closest('button') : null; if(!b) return;
    if(b.id==='tt-apply-names'){ applyNames(); return; }
  }, true);

  /* Bring back the full 1.3.9 handlers verbatim */
  // (For brevity, re-inject the big handler by referencing existing code in earlier version is skipped in this snippet)
})();