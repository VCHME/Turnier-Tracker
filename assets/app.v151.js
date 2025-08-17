(function(){'use strict';
function $ (s,c){return (c||document).querySelector(s)}
function $$ (s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}

var state={courts:2, groups:2, teams:[], matches:[], tables:{}};

function groupTag(idx){ var map=['g1','g2','g3','g4']; var cls=map[idx%4]; return '<span class=\"gtag '+cls+'\">Gruppe G'+(idx+1)+'</span>'; }

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
    var rr = roundRobinPairs(groups[g]);
    state.tables['G'+(g+1)]={};
    groups[g].forEach(function(t){ state.tables['G'+(g+1)][t]={team:t,P:0,W:0,L:0,PF:0,PA:0,Diff:0}; });
    for(var r=0;r<rr.length;r++){
      for(var m=0;m<rr[r].length;m++){
        var pair = rr[r][m];
        state.matches.push({group:'G'+(g+1), a:pair[0], b:pair[1], round:r+1, sa:null, sb:null});
      }
    }
  }
  state.matches.sort(function(x,y){ return x.round - y.round; });
  for(var i=0;i<state.matches.length;i++){
    state.matches[i].court = 'Court '+(((i)%state.courts)+1);
  }
}

function renderTables(){
  var wrap = $('#tt-tables'); if(!wrap) return; wrap.innerHTML='';
  var groupKeys = Object.keys(state.tables);
  if(groupKeys.length%2===0 && groupKeys.length>1){ wrap.classList.add('cols-2'); } else { wrap.classList.remove('cols-2'); }
  for(var gi=0; gi<groupKeys.length; gi++){
    var gname = groupKeys[gi];
    var rows = Object.keys(state.tables[gname]).map(function(k){ return state.tables[gname][k]; });
    rows.sort(function(a,b){ return b.P-a.P || b.Diff-a.Diff || b.PF-a.PF; });
    var html = '<table class=\"vchme-tt__table\"><thead><tr><th>'+groupTag(gi)+'</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>';
    for(var i=0;i<rows.length;i++){
      var r=rows[i];
      html += '<tr><td>'+(i+1)+'. '+r.team+'</td><td>'+r.P+'</td><td>'+r.W+'</td><td>'+r.L+'</td><td>'+r.PF+'</td><td>'+r.PA+'</td><td>'+r.Diff+'</td></tr>';
    }
    html += '</tbody></table>';
    var box = document.createElement('div');
    box.innerHTML = html;
    wrap.appendChild(box);
  }
}

function renderMatches(){
  var cont = $('#tt-next-grid'); if(!cont) return; cont.innerHTML='';
  cont.style.gridTemplateColumns = 'repeat('+state.courts+', minmax(220px,1fr))';
  var cols = []; for(var c=1;c<=state.courts;c++){ var col=document.createElement('div'); col.className='vchme-tt__court-col'; col.innerHTML='<h4>Court '+c+'</h4>'; cont.appendChild(col); cols.push(col); }
  for(var i=0;i<state.matches.length;i++){
    var m = state.matches[i];
    var idx = parseInt(m.court.split(' ')[1],10)-1;
    var el = document.createElement('div'); el.className='vchme-tt__match';
    el.innerHTML = '<div class=\"vchme-tt__row\"><div>'+m.a+'</div><div>'+m.b+'</div></div><div>Gruppe '+m.group+' – Runde '+m.round+' ('+m.court+')</div>';
    cols[idx].appendChild(el);
  }
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
// Fallback falls Theme später DOM ersetzt (z.B. PJAX/Preview):
setTimeout(bindOnce, 1000);
})();