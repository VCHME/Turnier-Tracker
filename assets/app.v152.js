(function(){'use strict';
function $ (s,c){return (c||document).querySelector(s)}
function $$ (s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}

var state={courts:2, groups:2, teams:[], matches:[], tables:{}};

function groupClass(gname){
  var n=parseInt(String(gname).replace(/\D+/g,''),10)||1;
  return ['g1','g2','g3','g4'][(n-1)%4];
}
function groupBadge(gname){
  return '<span class="gtag '+groupClass(gname)+'">Gruppe '+gname+'</span>';
}

function readControls(){
  var c=$('#tt-courts'), g=$('#tt-groups');
  state.courts = c?parseInt(c.value,10)||2:2;
  state.groups = g?parseInt(g.value,10)||2:2;
}
function readTeams(){
  state.teams = $$('#tt-teams input').map(function(i){ return (i.value||'').trim(); }).filter(Boolean);
}
function fillDemo(){
  var n = parseInt(window.prompt('Wie viele Teams? (2–16)','12')||'12',10);
  if(isNaN(n)||n<2) n=12; if(n>16) n=16;
  var arr=[]; for(var i=1;i<=n;i++) arr.push('Team '+i);
  var inputs = $$('#tt-teams input');
  inputs.forEach(function(inp,idx){ inp.value = arr[idx]||''; });
}

function chunkEven(arr,k){
  var out = Array.from({length:k}, function(){return []});
  for(var i=0;i<arr.length;i++){ out[i%k].push(arr[i]); }
  return out;
}
function roundRobinPairs(list){
  var a=list.slice();
  if(a.length%2===1) a.push(null);
  var rounds=a.length-1, half=a.length/2, out=[];
  for(var r=0;r<rounds;r++){
    var rd=[];
    for(var i=0;i<half;i++){
      var t1=a[i], t2=a[a.length-1-i];
      if(t1 && t2) rd.push([t1,t2]);
    }
    out.push(rd);
    a.splice(1,0,a.pop());
  }
  return out;
}

function planGroups(){
  var gs = state.groups;
  var teams = state.teams.slice();
  var G = Math.max(1, Math.min(gs, 4));
  if(teams.length<=3) G=1;
  if(teams.length<=6) G=Math.min(G,2);
  if(teams.length<=9) G=Math.min(G,3);
  var groups = chunkEven(teams, G);
  state.matches=[];
  state.tables={};
  for(var g=0; g<groups.length; g++){
    var gname='G'+(g+1);
    var rr = roundRobinPairs(groups[g]);
    state.tables[gname]={};
    groups[g].forEach(function(t){ state.tables[gname][t]={team:t,P:0,W:0,L:0,PF:0,PA:0,Diff:0}; });
    for(var r=0;r<rr.length;r++){
      for(var m=0;m<rr[r].length;m++){
        var pair = rr[r][m];
        state.matches.push({id:gname+'-R'+(r+1)+'-M'+(m+1), group:gname, a:pair[0], b:pair[1], round:r+1, sa:null, sb:null});
      }
    }
  }
  state.matches.sort(function(x,y){ return x.round - y.round; });
  for(var i=0;i<state.matches.length;i++){
    state.matches[i].court = 'Court '+(((i)%state.courts)+1);
  }
}

function recomputeTables(){
  Object.keys(state.tables).forEach(function(g){
    var rows=state.tables[g];
    Object.keys(rows).forEach(function(t){
      rows[t].P=rows[t].W=rows[t].L=rows[t].PF=rows[t].PA=rows[t].Diff=0;
    });
  });
  state.matches.forEach(function(m){
    if(typeof m.sa==='number' && typeof m.sb==='number'){
      var T = state.tables[m.group];
      if(!T) return;
      if(!T[m.a]) T[m.a]={team:m.a,P:0,W:0,L:0,PF:0,PA:0,Diff:0};
      if(!T[m.b]) T[m.b]={team:m.b,P:0,W:0,L:0,PF:0,PA:0,Diff:0};
      T[m.a].PF += m.sa; T[m.a].PA += m.sb;
      T[m.b].PF += m.sb; T[m.b].PA += m.sa;
      if(m.sa>m.sb){ T[m.a].W++; T[m.b].L++; T[m.a].P += 3; }
      else if(m.sb>m.sa){ T[m.b].W++; T[m.a].L++; T[m.b].P += 3; }
    }
  });
  Object.keys(state.tables).forEach(function(g){
    var rows=state.tables[g];
    Object.keys(rows).forEach(function(t){
      rows[t].Diff = rows[t].PF - rows[t].PA;
    });
  });
}

function renderTables(){
  recomputeTables();
  var wrap = $('#tt-tables'); if(!wrap) return; wrap.innerHTML='';
  var groupKeys = Object.keys(state.tables);
  if(groupKeys.length%2===0 && groupKeys.length>1){ wrap.classList.add('cols-2'); } else { wrap.classList.remove('cols-2'); }
  groupKeys.forEach(function(gname){
    var rows = Object.keys(state.tables[gname]).map(function(k){ return state.tables[gname][k]; });
    rows.sort(function(a,b){ return b.P-a.P || b.Diff-a.Diff || b.PF-a.PF; });
    var html = '<table class="vchme-tt__table"><thead><tr><th><span class="gtag '+groupClass(gname)+'">Gruppe '+gname+'</span></th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>';
    rows.forEach(function(r,i){
      html += '<tr><td>'+(i+1)+'. '+r.team+'</td><td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.L+'</td><td>'+r.PF+'</td><td>'+r.PA+'</td><td>'+r.Diff+'</td></tr>';
    });
    html += '</tbody></table>';
    var box = document.createElement('div');
    box.innerHTML = html;
    wrap.appendChild(box);
  });
}

function bindScoreInputs(){
  $$('input[data-mid][data-side]').forEach(function(inp){
    if(inp.dataset.bound) return; inp.dataset.bound='1';
    inp.addEventListener('change', function(){
      var id = inp.getAttribute('data-mid');
      var side = inp.getAttribute('data-side');
      var m = state.matches.find(function(x){return x.id===id;}); if(!m) return;
      var v = parseInt((inp.value||'').trim(),10);
      if(!isNaN(v)) { if(side==='a') m.sa=v; else m.sb=v; } else { if(side==='a') m.sa=null; else m.sb=null; }
      renderTables();
      renderMatches();
    });
  });
}

function renderMatches(){
  var cont = $('#tt-next-grid'); if(!cont) return; cont.innerHTML='';
  cont.style.gridTemplateColumns = 'repeat('+state.courts+', minmax(220px,1fr))';
  var cols = []; 
  for(var c=1;c<=state.courts;c++){ 
    var col=document.createElement('div'); col.className='vchme-tt__court-col'; col.innerHTML='<h4>Court '+c+'</h4>'; 
    cont.appendChild(col); cols.push(col); 
  }
  var list = state.matches.slice().sort(function(a,b){
    return (a.round-b.round) || (a.court.localeCompare(b.court));
  });
  list.forEach(function(m){
    var idx = Math.max(0, parseInt(m.court.split(' ')[1],10)-1);
    var done = (typeof m.sa==='number' && typeof m.sb==='number');
    var el = document.createElement('div'); 
    el.className='vchme-tt__match' + (done?' vchme-tt__match--done':'');
    el.innerHTML = ''
      + '<div class="vchme-tt__label">'+ groupBadge(m.group) +' – Runde '+m.round+' <span class="vchme-tt__badge">'+m.court+'</span></div>'
      + '<div class="vchme-tt__row vchme-tt__row--score">'
      +   '<input class="vchme-tt__name" value="'+m.a+'" disabled>'
      +   '<input class="vchme-tt__score" data-mid="'+m.id+'" data-side="a" type="number" min="0" placeholder="A" value="'+(typeof m.sa==='number'?m.sa:'')+'">'
      + '</div>'
      + '<div class="vchme-tt__row vchme-tt__row--score">'
      +   '<input class="vchme-tt__name" value="'+m.b+'" disabled>'
      +   '<input class="vchme-tt__score" data-mid="'+m.id+'" data-side="b" type="number" min="0" placeholder="B" value="'+(typeof m.sb==='number'?m.sb:'')+'">'
      + '</div>';
    cols[idx].appendChild(el);
  });
  bindScoreInputs();
}

function startTournament(){
  readControls(); readTeams();
  if(state.teams.length<2){ alert('Mindestens 2 Teams erforderlich.'); return; }
  planGroups();
  var setup=$('#tt-setup'), gc=$('#tt-groups-card');
  if(setup) setup.style.display='none';
  if(gc) gc.style.display='block';
  renderTables();
  renderMatches();
}
function resetTournament(){ location.reload(); }

function bindOnce(){
  if(bindOnce._done) return; bindOnce._done=true;
  var s=$('#tt-start'), d=$('#tt-demo'), c=$('#tt-clear'), t=$('#tt-toggle-tables'), sh=$('#tt-show-setup');
  if(s) s.addEventListener('click', startTournament);
  if(d) d.addEventListener('click', fillDemo);
  if(c) c.addEventListener('click', resetTournament);
  if(t) t.addEventListener('click', function(){
    var box = $('#tt-tables');
    if(!box) return;
    if(box.style.display==='none'){ box.style.display='grid'; this.textContent='Ausblenden'; } else { box.style.display='none'; this.textContent='Einblenden'; }
  });
  if(sh) sh.addEventListener('click', function(){ var su=$('#tt-setup'); if(su){ su.style.display='block'; window.scrollTo({top:0,behavior:'smooth'});} });
}
document.addEventListener('DOMContentLoaded', bindOnce);
setTimeout(bindOnce, 1000);
})();