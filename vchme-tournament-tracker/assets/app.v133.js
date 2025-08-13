/* VCHME TT 1.3.3 (strict ES5) */
(function(){
  'use strict';
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};
  var setup=$('#tt-setup'), gView=$('#tt-groups-ko'), koCard=$('#tt-ko-card');
  var teamsWrap=$('#tt-teams'), courtsSel=$('#tt-courts'), selGroups=$('#tt-groups');
  var courtsInfo=$('#tt-courts-info'), doneGrid=$('#tt-done-grid'), nextGrid=$('#tt-next-grid'), tablesBox=$('#tt-tables');
  var koDoneGrid=$('#tt-ko-done-grid'), koNextGrid=$('#tt-ko-next-grid'), rankBody=$('#tt-rank-body');

  var st={teams:new Array(16).fill(''), groups:2, courts:2, g_assign:{}, g_matches:{}, g_tables:{}, ko_matches:{}, ko_started:false};
  var ui={doneHidden:false, koDoneHidden:false};

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
    var courts=st.courts; var globalSlot=1;
    var gs=Object.keys(st.g_assign);
    for(var gi=0; gi<gs.length; gi++){
      var g=gs[gi];
      var matches=[];
      var keys=Object.keys(st.g_matches);
      for(var k=0;k<keys.length;k++){ var m=st.g_matches[keys[k]]; if(m.group===g) matches.push(m); }
      matches.sort(function(a,b){ return a.round-b.round; });
      var roundSlots={};
      for(var mi=0; mi<matches.length; mi++){
        var m2=matches[mi];
        var s = (roundSlots[m2.round]||0)+1; roundSlots[m2.round]=s;
        m2.slot = globalSlot++;
        m2.rslot = s;
        m2.ci = ((s-1) % courts) + 1;
        m2.court = 'Court '+m2.ci;
      }
    }
  }

  function updateTables(){
    var gs=Object.keys(st.g_assign);
    for(var gi=0; gi<gs.length; gi++){
      var g=gs[gi];
      var tbl={};
      var list=st.g_assign[g];
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
    for(var gi=0; gi<gs.length; gi++){
      var g=gs[gi];
      var rows=[], t=st.g_tables[g], names=Object.keys(t);
      for(var i=0;i<names.length;i++){ rows.push(t[names[i]]); }
      rows.sort(function(a,b){ return b.P-a.P || b.Diff-a.Diff || b.PF-a.PF; });
      var html='<table class="vchme-tt__table"><thead><tr><th>'+g+'</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>';
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
      w.innerHTML='<div class="vchme-tt__label">'+m.group+' – R'+m.round+' <span class="vchme-tt__badge">'+(m.court||('Court '+(idx+1)))+'</span></div>'+
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
      var id='KO'+round+'M'+rslot; var ci=(roundName==='Halbfinale'||roundName==='Finale'||roundName==='Spiel um Platz 3')?1:(((rslot-1)%st.courts)+1);
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

  function updateRanking(){
    var totals={}, rows=[], gi, i, j;
    var gKeys=Object.keys(st.g_tables);
    for(gi=0; gi<gKeys.length; gi++){
      var T=st.g_tables[gKeys[gi]], teams=Object.keys(T);
      for(i=0; i<teams.length; i++){ var t=teams[i]; totals[t]=(totals[t]||0)+T[t].P; }
    }
    var all=[], keys=Object.keys(st.ko_matches);
    for(i=0;i<keys.length;i++){ all.push(st.ko_matches[keys[i]]); }
    var finalM=null, bronzeM=null;
    for(i=0;i<all.length;i++){ if(all[i].roundName==='Finale') finalM=all[i]; if(all[i].roundName==='Spiel um Platz 3') bronzeM=all[i]; }
    var body=document.getElementById('tt-rank-body'); var wrap=document.getElementById('tt-ranking'); if(!body||!wrap) return;
    if(finalM && typeof finalM.sa==='number' && typeof finalM.sb==='number'){
      var champ=finalM.sa>finalM.sb?finalM.a:finalM.b; var runner=finalM.sa>finalM.sb?finalM.b:finalM.a;
      rows.push({pl:1,team:champ,note:'Finalsieger',gp:(totals[champ]||0)});
      rows.push({pl:2,team:runner,note:'Finalist',gp:(totals[runner]||0)});
    }
    if(bronzeM && typeof bronzeM.sa==='number' && typeof bronzeM.sb==='number'){
      var third=bronzeM.sa>bronzeM.sb?bronzeM.a:bronzeM.b; var fourth=bronzeM.sa>bronzeM.sb?bronzeM.b:bronzeM.a;
      rows.push({pl:3,team:third,note:'3. Platz',gp:(totals[third]||0)});
      rows.push({pl:4,team:fourth,note:'4. Platz',gp:(totals[fourth]||0)});
    }
    var html='<table class="vchme-tt__table"><thead><tr><th>Platz</th><th>Team</th><th>Anmerkung</th><th>Punkte (Gruppe)</th></tr></thead><tbody>';
    for(i=0;i<rows.length;i++){ var r=rows[i]; html+='<tr><td>'+r.pl+'</td><td>'+r.team+'</td><td>'+r.note+'</td><td>'+r.gp+'</td></tr>'; }
    html+='</tbody></table>';
    if(rows.length){ wrap.style.display='block'; body.innerHTML=html; } else { wrap.style.display='none'; body.innerHTML=''; }
  }

  function onScoreInput(id,isKO,side,val){
    if(isKO){
      var m=st.ko_matches[id]; if(!m) return; if(side==='a') m.sa=val; else m.sb=val;
      if(typeof m.sa==='number' && typeof m.sb==='number' && m.sa!==m.sb){
        var winner=m.sa>m.sb?m.a:m.b; var loser=m.sa>m.sb?m.b:m.a;
        if(m.round===0){
          var r1=[], keys=Object.keys(st.ko_matches);
          for(var i=0;i<keys.length;i++){ var x=st.ko_matches[keys[i]]; if(x.round===1) r1.push(x); }
          r1.sort(function(a,b){return a.rslot-b.rslot;});
          var fill=null; for(i=0;i<r1.length;i++){ if(!r1[i].a || !r1[i].b){ fill=r1[i]; break; } }
          if(fill){ if(!fill.a) fill.a=winner; else fill.b=winner; }
        } else if(m.round>=1){
          var nextId='KO'+(m.round+1)+'M'+Math.ceil(m.rslot/2);
          if(st.ko_matches[nextId]){ if(m.rslot%2===1) st.ko_matches[nextId].a=winner; else st.ko_matches[nextId].b=winner; }
          if(m.roundName==='Viertelfinale'){
            var c1=st.ko_matches['KO200M1']; var c2=st.ko_matches['KO200M2'];
            if(c1 && (!c1.a || !c1.b)){ if(!c1.a) c1.a=loser; else c1.b=loser; }
            else if(c2 && (!c2.a || !c2.b)){ if(!c2.a) c2.a=loser; else c2.b=loser; }
          }
          if(m.roundName==='Halbfinale'){
            var semis=[], ks=Object.keys(st.ko_matches);
            for(var j=0;j<ks.length;j++){ var y=st.ko_matches[ks[j]]; if(y.roundName==='Halbfinale') semis.push(y); }
            semis.sort(function(a,b){return a.rslot-b.rslot;});
            if(semis.length===2){
              if(typeof semis[0].sa==='number' && typeof semis[0].sb==='number' && typeof semis[1].sa==='number' && typeof semis[1].sb==='number'){
                var lA=semis[0].sa>semis[0].sb? semis[0].b:semis[0].a;
                var lB=semis[1].sa>semis[1].sb? semis[1].b:semis[1].a;
                if(st.ko_matches['KO99M1']){ st.ko_matches['KO99M1'].a=lA; st.ko_matches['KO99M1'].b=lB; }
              }
            }
          }
          if(m.round===200){
            var k1=st.ko_matches['KO200M1']; var k2=st.ko_matches['KO200M2'];
            if(k1 && k2 && typeof k1.sa==='number' && typeof k1.sb==='number' && typeof k2.sa==='number' && typeof k2.sb==='number'){
              var w1=k1.sa>k1.sb?k1.a:k1.b; var l1=k1.sa>k1.sb?k1.b:k1.a;
              var w2=k2.sa>k2.sb?k2.a:k2.b; var l2=k2.sa>k2.sb?k2.b:k2.a;
              if(st.ko_matches['KO201M1']){ st.ko_matches['KO201M1'].a=w1; st.ko_matches['KO201M1'].b=w2; }
              if(st.ko_matches['KO201M2']){ st.ko_matches['KO201M2'].a=l1; st.ko_matches['KO201M2'].b=l2; }
            }
          }
        }
      }
      renderKO(); updateRanking();
    } else {
      var m2=st.g_matches[id]; if(!m2) return; if(side==='a') m2.sa=val; else m2.sb=val;
      renderGroupMatches();
    }
  }

  document.addEventListener('change', function(ev){
    var t=ev.target;
    if(t && t.matches('input[type="number"][data-mid]')){
      var id=t.getAttribute('data-mid'), side=t.getAttribute('data-side'), val=parseInt(t.value,10);
      onScoreInput(id,false,side, (isNaN(val)?null:val));
    }
    if(t && t.matches('input[type="number"][data-kid]')){
      var id2=t.getAttribute('data-kid'), side2=t.getAttribute('data-side'), val2=parseInt(t.value,10);
      onScoreInput(id2,true,side2, (isNaN(val2)?null:val2));
    }
  }, true);

  document.addEventListener('click', function(ev){
    var b=ev.target && ev.target.closest ? ev.target.closest('button') : null; if(!b) return;
    switch(b.id){
      case 'tt-demo': {
        var n = parseInt((window.prompt('Wie viele Teams für die Demo? (2–16)', '12')||'12'),10);
        if(isNaN(n) || n<2) n=12; if(n>16) n=16;
        st.teams=new Array(16).fill('');
        for(var i=0;i<n;i++){ st.teams[i]='Team '+(i+1); }
        writeTeams(); break;
      }
      case 'tt-apply-names': { readTeams(); window.alert('Namen übernommen.'); break; }
      case 'tt-start': {
        readTeams();
        var t = st.teams.filter(function(x){ return x && x.length; });
        if(t.length<2){ window.alert('Mindestens 2 Teams.'); return; }
        st.groups = effectiveGroups(t.length, parseInt(selGroups.value||'2',10));
        st.courts = parseInt(courtsSel.value||'2',10);
        if(courtsInfo) courtsInfo.textContent=String(st.courts);
        st.g_assign={}; var G=st.groups, arr=[], gi;
        for(gi=0; gi<G; gi++){ arr.push([]); }
        for(var i=0;i<t.length;i++){ arr[i%G].push(t[i]); }
        for(gi=0; gi<G; gi++){ st.g_assign['G'+(gi+1)] = arr[gi]; }
        st.g_matches={};
        var gs=Object.keys(st.g_assign);
        for(gi=0; gi<gs.length; gi++){
          var g=gs[gi]; var rr=rrPairs(st.g_assign[g]);
          for(var ri=0; ri<rr.length; ri++){
            var round=rr[ri];
            for(var mi=0; mi<round.length; mi++){
              var p=round[mi], id=g+'-R'+(ri+1)+'-M'+(mi+1);
              st.g_matches[id]={id:id,group:g,round:(ri+1),a:p[0],b:p[1],sa:null,sb:null,ci:null,court:null,slot:null,rslot:null};
            }
          }
        }
        planGroupSchedule();
        setup.style.display='none'; gView.style.display='block';
        renderGroupMatches();
        break;
      }
      case 'tt-clear': { window.location.reload(); break; }
      case 'tt-toggle-setup': { setup.style.display = (setup.style.display==='none')?'block':'none'; break; }
      case 'tt-fill-scores': {
        function rnd(){ return 1 + Math.floor(Math.random()*21); }
        var vals=Object.keys(st.g_matches);
        for(var i=0;i<vals.length;i++){
          var m=st.g_matches[vals[i]]; var a=rnd(), b=rnd(); if(a===b) b=(b%21)+1; m.sa=a; m.sb=b;
        }
        planGroupSchedule(); renderGroupMatches(); break;
      }
      case 'tt-build-ko': { updateTables(); buildKO(); break; }
      case 'tt-toggle-done': { ui.doneHidden=!ui.doneHidden; if(doneGrid) doneGrid.style.display=ui.doneHidden?'none':'grid'; break; }
      case 'tt-toggle-ko-done': { ui.koDoneHidden=!ui.koDoneHidden; if(koDoneGrid) koDoneGrid.style.display=ui.koDoneHidden?'none':'grid'; break; }
    }
  }, true);

  writeTeams();
})();