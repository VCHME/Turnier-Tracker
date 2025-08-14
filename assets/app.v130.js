console.log('VCHME TT 1.3.0 boot');
(function(){
  var $=function(s,c){return (c||document).querySelector(s)}, $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};
  var setup=$('#tt-setup'), gView=$('#tt-groups-ko'), koCard=$('#tt-ko-card');
  var teamsWrap=$('#tt-teams'), courtsSel=$('#tt-courts'), selGroups=$('#tt-groups'), advSel=$('#tt-adv'), chkAll=$('#tt-allplaces');
  var courtsInfo=$('#tt-courts-info'), doneGrid=$('#tt-done-grid'), nextGrid=$('#tt-next-grid'), tablesBox=$('#tt-tables');
  var koDoneGrid=$('#tt-ko-done-grid'), koNextGrid=$('#tt-ko-next-grid'), rankBody=$('#tt-rank-body');

  var st={teams:new Array(16).fill(''), groups:2, courts:2, g_assign:{}, g_matches:{}, g_tables:{}, ko_matches:{}, ko_started:false};
  var ui={doneHidden:false, koDoneHidden:false};

  function readTeams(){ st.teams=$$('#tt-teams input').map(function(i){return i.value.trim()}); }
  function writeTeams(){ teamsWrap.innerHTML=''; for(var i=0;i<16;i++){ var inp=document.createElement('input'); inp.type='text'; inp.placeholder='Team '+(i+1); inp.value=st.teams[i]||''; teamsWrap.appendChild(inp);} }

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
    Object.keys(st.g_assign).forEach(function(g){
      var matches=Object.values(st.g_matches).filter(function(m){return m.group===g;});
      matches.sort(function(a,b){ return a.round-b.round; });
      var roundSlots={};
      matches.forEach(function(m){
        var s = roundSlots[m.round] = (roundSlots[m.round]||0)+1;
        m.slot = globalSlot++;
        m.ci = ((s-1) % courts) + 1;
        m.court = 'Court '+m.ci;
      });
    });
  }

  function updateTables(){
    Object.keys(st.g_assign).forEach(function(g){
      var tbl={}; st.g_assign[g].forEach(function(t){ tbl[t]={team:t,P:0,W:0,L:0,PF:0,PA:0,Diff:0}; });
      Object.values(st.g_matches).filter(function(m){return m.group===g;}).forEach(function(m){
        if(Number.isFinite(m.sa)&&Number.isFinite(m.sb)){
          tbl[m.a].PF+=m.sa; tbl[m.a].PA+=m.sb; tbl[m.b].PF+=m.sb; tbl[m.b].PA+=m.sa;
          if(m.sa>m.sb){ tbl[m.a].W++; tbl[m.b].L++; tbl[m.a].P+=3; } else if(m.sb>m.sa){ tbl[m.b].W++; tbl[m.a].L++; tbl[m.b].P+=3; }
          tbl[m.a].Diff=tbl[m.a].PF-tbl[m.a].PA; tbl[m.b].Diff=tbl[m.b].PF-tbl[m.b].PA;
        }
      });
      st.g_tables[g]=tbl;
    });
  }

  function renderTables(){
    updateTables(); tablesBox.innerHTML='';
    Object.keys(st.g_assign).forEach(function(g){
      var rows=Object.values(st.g_tables[g]).sort(function(a,b){ return b.P-a.P || b.Diff-a.Diff || b.PF-a.PF; });
      var html='<table class="vchme-tt__table"><thead><tr><th>'+g+'</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>';
      rows.forEach(function(r,i){ html+='<tr><td>'+(i+1)+'. '+r.team+'</td><td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.L+'</td><td>'+r.PF+'</td><td>'+r.PA+'</td><td>'+r.Diff+'</td></tr>'; });
      html+='</tbody></table>'; var box=document.createElement('div'); box.innerHTML=html; tablesBox.appendChild(box);
    });
  }

  function renderGroupMatches(){
    var all=Object.values(st.g_matches);
    var done=all.filter(function(m){return Number.isFinite(m.sa)&&Number.isFinite(m.sb);}).sort(function(a,b){return b.slot-a.slot;});
    var next=all.filter(function(m){return !(Number.isFinite(m.sa)&&Number.isFinite(m.sb));}).sort(function(a,b){return a.slot-b.slot;});
    function mk(container,list){
      container.innerHTML=''; container.style.gridTemplateColumns='repeat('+st.courts+', minmax(220px,1fr))';
      var cols=[]; for(var c=1;c<=st.courts;c++){ var col=document.createElement('div'); col.className='vchme-tt__court-col'; col.innerHTML='<h4>Court '+c+'</h4>'; container.appendChild(col); cols.push(col); }
      list.forEach(function(m){ var idx=(m.ci?m.ci:1)-1; var w=document.createElement('div'); w.className='vchme-tt__match';
        w.innerHTML='<div class="vchme-tt__label">'+m.group+' – R'+m.round+' <span class="vchme-tt__badge">'+(m.court||('Court '+(idx+1)))+'</span></div>'+
          '<div class="vchme-tt__row"><input value="'+(m.a||'')+'" disabled><input type="number" min="0" value="'+(m.sa??'')+'" data-mid="'+m.id+'" data-side="a"></div>'+
          '<div class="vchme-tt__row"><input value="'+(m.b||'')+'" disabled><input type="number" min="0" value="'+(m.sb??'')+'" data-mid="'+m.id+'" data-side="b"></div>';
        cols[idx].appendChild(w);
      });
    }
    mk(doneGrid, done);
    mk(nextGrid, next);
    renderTables();
  }

  function qualifiers(k){
    var list=[]; Object.keys(st.g_assign).forEach(function(g){
      var rows=Object.values(st.g_tables[g]).sort(function(a,b){ return b.P-a.P || b.Diff-a.Diff || b.PF-a.PF; });
      for(var i=0;i<Math.min(k,rows.length);i++){ list.push({g:g, r:i+1, t:rows[i].team}); }
    });
    // Seed: erst alle 1., dann 2., usw.
    var byR={}; list.forEach(function(x){ (byR[x.r]||(byR[x.r]=[])).push(x); });
    Object.keys(byR).forEach(function(k){ byR[k].sort(function(a,b){ return a.g.localeCompare(b.g); }); });
    var seeded=[]; Object.keys(byR).sort(function(a,b){return parseInt(a)-parseInt(b)}).forEach(function(k){ byR[k].forEach(function(x){ seeded.push(x.t); }); });
    return seeded;
  }

  function buildKO(){
    var adv=parseInt(($('#tt-adv')||{}).value||'2',10)||2; var allPlaces=($('#tt-allplaces')||{}).checked||false;
    var seed=qualifiers(adv); if(seed.length<2){ alert('Zu wenige Aufsteiger'); return; }
    var N=seed.length, target=1; while((target<<1)<=N) target<<=1;
    var prelim=[], main=[];
    if(N!=target){ var need=N-target; var low=seed.slice(-2*need); main=seed.slice(0,N-2*need); for(var i=0;i<need;i++){ prelim.push([low[i*2], low[i*2+1]]);} }
    else { main=seed.slice(); }
    st.ko_matches={}; st.ko_started=true; $('#tt-ko-card').style.display='block';
    var slot=1; function courtFor(name){ return (name==='Halbfinale'||name==='Finale'||name==='Spiel um Platz 3')?1:((slot-1)%st.courts)+1; }
    prelim.forEach(function(p){ var name='Play-In', ci=courtFor(name); st.ko_matches['KO0M'+slot]={id:'KO0M'+slot,round:0,roundName:name,slot:slot++,a:p[0],b:p[1],sa:null,sb:null,ci:ci,court:'Court '+ci}; });
    var r1Pairs=[]; for(var i=0;i<main.length;i+=2){ r1Pairs.push([main[i]||null, main[i+1]||null]); }
    var r1Name=(r1Pairs.length===8?'Achtelfinale':(r1Pairs.length===4?'Viertelfinale':(r1Pairs.length===2?'Halbfinale':'Runde 1')));
    r1Pairs.forEach(function(p){ var ci=courtFor(r1Name); st.ko_matches['KO1M'+slot]={id:'KO1M'+slot,round:1,roundName:r1Name,slot:slot++,a:p[0],b:p[1],sa:null,sb:null,ci:ci,court:'Court '+ci}; });
    if(allPlaces && r1Name==='Viertelfinale'){
      for(var c=1;c<=2;c++){ var ci=courtFor('Platzierung 5–8 (HF)'); st.ko_matches['KC2M'+c]={id:'KC2M'+c,round:200,roundName:'Platzierung 5–8 (HF)',slot:slot++,a:null,b:null,sa:null,sb:null,ci:ci,court:'Court '+ci}; }
      var ci5=courtFor('Platz 5'); st.ko_matches['KC3M1']={id:'KC3M1',round:201,roundName:'Platz 5',slot:slot++,a:null,b:null,sa:null,sb:null,ci:ci5,court:'Court '+ci5};
      var ci7=courtFor('Platz 7'); st.ko_matches['KC3M2']={id:'KC3M2',round:201,roundName:'Platz 7',slot:slot++,a:null,b:null,sa:null,sb:null,ci:ci7,court:'Court '+ci7};
    }
    for(var s=1;s<=2;s++){ var ci=courtFor('Halbfinale'); st.ko_matches['KO2M'+s]={id:'KO2M'+s,round:2,roundName:'Halbfinale',slot:slot++,a:null,b:null,sa:null,sb:null,ci:ci,court:'Court '+ci}; }
    var ciB=courtFor('Spiel um Platz 3'); st.ko_matches['KOBR1']={id:'KOBR1',round:99,roundName:'Spiel um Platz 3',slot:slot++,a:null,b:null,sa:null,sb:null,ci:ciB,court:'Court '+ciB};
    var ciF=courtFor('Finale'); st.ko_matches['KO3M1']={id:'KO3M1',round:3,roundName:'Finale',slot:slot++,a:null,b:null,sa:null,sb:null,ci:ciF,court:'Court '+ciF};
    renderKO();
  }

  function renderKO(){
    if(!st.ko_started) return;
    function mk(container, list){
      container.innerHTML=''; container.style.gridTemplateColumns='repeat('+st.courts+', minmax(220px,1fr))';
      var cols=[]; for(var c=1;c<=st.courts;c++){ var col=document.createElement('div'); col.className='vchme-tt__court-col'; col.innerHTML='<h4>Court '+c+'</h4>'; container.appendChild(col); cols.push(col); }
      list.forEach(function(m){ if(!m.a&&!m.b) return; var idx=(m.ci?m.ci:1)-1; var w=document.createElement('div'); w.className='vchme-tt__match';
        w.innerHTML='<div class="vchme-tt__label">'+m.roundName+' <span class="vchme-tt__badge">'+(m.court||('Court '+(idx+1)))+'</span></div>'+
          '<div class="vchme-tt__row"><input value="'+(m.a||'')+'" disabled><input type="number" min="0" value="'+(m.sa??'')+'" data-kid="'+m.id+'" data-side="a"></div>'+
          '<div class="vchme-tt__row"><input value="'+(m.b||'')+'" disabled><input type="number" min="0" value="'+(m.sb??'')+'" data-kid="'+m.id+'" data-side="b"></div>';
        cols[idx].appendChild(w);
      });
    }
    var all=Object.values(st.ko_matches).sort(function(a,b){return a.slot-b.slot;});
    var next=all.filter(function(m){return !(Number.isFinite(m.sa)&&Number.isFinite(m.sb));});
    var done=all.filter(function(m){return Number.isFinite(m.sa)&&Number.isFinite(m.sb);}).sort(function(a,b){return b.slot-a.slot;});
    mk(koNextGrid, next);
    mk(koDoneGrid, done);
  }

  function updateRanking(){
    var rows=[]; var totals={};
    Object.values(st.g_tables).forEach(function(T){ Object.values(T).forEach(function(r){ totals[r.team]=(totals[r.team]||0)+r.P; }); });
    var finalM=Object.values(st.ko_matches).find(function(m){return m.roundName==='Finale';});
    var bronze=Object.values(st.ko_matches).find(function(m){return m.roundName==='Spiel um Platz 3';});
    if(finalM && Number.isFinite(finalM.sa)&&Number.isFinite(finalM.sb)){
      var champ=finalM.sa>finalM.sb?finalM.a:finalM.b; var runner=finalM.sa>finalM.sb?finalM.b:finalM.a;
      rows.push({pl:1,team:champ,note:'Finalsieger',gp:totals[champ]||0});
      rows.push({pl:2,team:runner,note:'Finalist',gp:totals[runner]||0});
    }
    if(bronze && Number.isFinite(bronze.sa)&&Number.isFinite(bronze.sb)){
      var third=bronze.sa>bronze.sb?bronze.a:bronze.b; var fourth=bronze.sa>bronze.sb?bronze.b:bronze.a;
      rows.push({pl:3,team:third,note:'3. Platz',gp:totals[third]||0});
      rows.push({pl:4,team:fourth,note:'4. Platz',gp:totals[fourth]||0});
    }
    var html='<table class="vchme-tt__table"><thead><tr><th>Platz</th><th>Team</th><th>Anmerkung</th><th>Punkte (Gruppe)</th></tr></thead><tbody>';
    rows.forEach(function(r){ html+='<tr><td>'+r.pl+'</td><td>'+r.team+'</td><td>'+r.note+'</td><td>'+r.gp+'</td></tr>'; });
    html+='</tbody></table>'; $('#tt-ranking').style.display=rows.length?'block':'none'; $('#tt-rank-body').innerHTML=html;
  }

  function onScoreInput(id,isKO,side,val){
    if(isKO){
      var m=st.ko_matches[id]; if(!m) return; if(side==='a') m.sa=val; else m.sb=val;
      if(Number.isFinite(m.sa)&&Number.isFinite(m.sb)&&m.sa!==m.sb){
        var winner=m.sa>m.sb?m.a:m.b, loser=m.sa>m.sb?m.b:m.a;
        if(m.round===0){
          var r1=Object.values(st.ko_matches).filter(function(x){return x.round===1;}).sort(function(a,b){return a.slot-b.slot;});
          var fill=r1.find(function(x){return !x.a||!x.b;}); if(fill){ if(!fill.a) fill.a=winner; else fill.b=winner; }
        } else if(m.round>=1){
          var nextId='KO'+(m.round+1)+'M'+Math.ceil(m.slot/2); if(st.ko_matches[nextId]){ if(m.slot%2===1) st.ko_matches[nextId].a=winner; else st.ko_matches[nextId].b=winner; }
          if(m.roundName==='Viertelfinale'){
            var cons=[st.ko_matches['KC2M1'], st.ko_matches['KC2M2']].filter(Boolean);
            for(var i=0;i<cons.length;i++){ var c=cons[i]; if(!c.a){ c.a=loser; break; } else if(!c.b){ c.b=loser; break; } }
          }
          if(m.roundName==='Halbfinale'){
            var semis=Object.values(st.ko_matches).filter(function(x){return x.roundName==='Halbfinale';}).sort(function(a,b){return a.slot-b.slot;});
            var losers=[]; semis.forEach(function(s){ if(Number.isFinite(s.sa)&&Number.isFinite(s.sb)){ losers.push(s.sa>s.sb? s.b:s.a); } });
            if(losers.length===2 && st.ko_matches['KOBR1']){ st.ko_matches['KOBR1'].a=losers[0]; st.ko_matches['KOBR1'].b=losers[1]; }
          }
          if(m.id==='KC2M1' || m.id==='KC2M2'){
            var c1=st.ko_matches['KC2M1'], c2=st.ko_matches['KC2M2'];
            if(c1&&c2 && Number.isFinite(c1.sa)&&Number.isFinite(c1.sb)&&Number.isFinite(c2.sa)&&Number.isFinite(c2.sb)){
              var w1=c1.sa>c1.sb? c1.a:c1.b, l1=c1.sa>c1.sb? c1.b:c1.a;
              var w2=c2.sa>c2.sb? c2.a:c2.b, l2=c2.sa>c2.sb? c2.b:c2.a;
              if(st.ko_matches['KC3M1']){ st.ko_matches['KC3M1'].a=w1; st.ko_matches['KC3M1'].b=w2; }
              if(st.ko_matches['KC3M2']){ st.ko_matches['KC3M2'].a=l1; st.ko_matches['KC3M2'].b=l2; }
            }
          }
        }
      }
      renderKO(); updateRanking();
    } else {
      var m=st.g_matches[id]; if(!m) return; if(side==='a') m.sa=val; else m.sb=val;
      renderGroupMatches();
    }
  }

  document.addEventListener('change', function(ev){
    var t=ev.target;
    if(t && t.matches('input[type="number"][data-mid]')){
      var id=t.getAttribute('data-mid'), side=t.getAttribute('data-side'), val=parseInt(t.value,10);
      onScoreInput(id,false,side,Number.isFinite(val)?val:null);
    }
    if(t && t.matches('input[type="number"][data-kid]')){
      var id=t.getAttribute('data-kid'), side=t.getAttribute('data-side'), val=parseInt(t.value,10);
      onScoreInput(id,true,side,Number.isFinite(val)?val:null);
    }
  }, true);

  document.addEventListener('click', function(ev){
    var b=ev.target.closest('button'); if(!b) return;
    switch(b.id){
      case 'tt-demo': {
        var n = parseInt(prompt('Wie viele Teams für die Demo? (2–16)', '12')||'12',10);
        if(!Number.isFinite(n) || n<2) n=12; if(n>16) n=16;
        st.teams=new Array(16).fill(''); for(var i=0;i<n;i++) st.teams[i]='Team '+(i+1);
        writeTeams(); break;
      }
      case 'tt-apply-names': { readTeams(); alert('Namen übernommen.'); break; }
      case 'tt-start': {
        readTeams();
        var t = st.teams.filter(Boolean);
        if(t.length<2){ alert('Mindestens 2 Teams.'); return; }
        st.groups = effectiveGroups(t.length, parseInt(selGroups.value||'2',10));
        st.courts = parseInt(courtsSel.value||'2',10);
        if($('#tt-courts-info')) $('#tt-courts-info').textContent=String(st.courts);
        st.g_assign={}; var G=st.groups, arr=new Array(G); for(var gi=0;gi<G;gi++) arr[gi]=[];
        t.forEach(function(x,i){ arr[i%G].push(x); }); arr.forEach(function(list,i){ st.g_assign['G'+(i+1)]=list; });
        st.g_matches={};
        Object.keys(st.g_assign).forEach(function(g){
          var rr=rrPairs(st.g_assign[g]);
          rr.forEach(function(round,ri){ round.forEach(function(p,mi){
            var id=g+'-R'+(ri+1)+'-M'+(mi+1);
            st.g_matches[id]={id:id,group:g,round:ri+1,a:p[0],b:p[1],sa:null,sb:null,ci:null,court:null,slot:null};
          }); });
        });
        planGroupSchedule(); updateTables();
        setup.style.display='none'; $('#tt-groups-ko').style.display='block';
        renderGroupMatches();
        break;
      }
      case 'tt-clear': { location.reload(); break; }
      case 'tt-toggle-setup': { setup.style.display = (setup.style.display==='none')?'block':'none'; break; }
      case 'tt-fill-scores': {
        function rnd(){ return 1 + Math.floor(Math.random()*21); }
        Object.values(st.g_matches).forEach(function(m){ var a=rnd(), b=rnd(); if(a===b) b=(b%21)+1; m.sa=a; m.sb=b; });
        planGroupSchedule(); renderGroupMatches(); break;
      }
      case 'tt-build-ko': {
        updateTables(); buildKO(); break;
      }
      case 'tt-toggle-done': { ui.doneHidden=!ui.doneHidden; if($('#tt-done-grid')) $('#tt-done-grid').style.display=ui.doneHidden?'none':'grid'; break; }
      case 'tt-toggle-ko-done': { ui.koDoneHidden=!ui.koDoneHidden; if($('#tt-ko-done-grid')) $('#tt-ko-done-grid').style.display=ui.koDoneHidden?'none':'grid'; break; }
    }
  }, true);
})();
