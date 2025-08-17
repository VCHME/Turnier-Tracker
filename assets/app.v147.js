(function(){'use strict';
function $ (s,c){return (c||document).querySelector(s)}
function $$ (s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))}

function readTeams(){
  return $$('#tt-teams input').map(function(i){ return (i.value||'').trim(); }).filter(Boolean);
}
function fillDemo(){
  var n = parseInt(window.prompt('Wie viele Teams? (2–16)','12')||'12',10);
  if(isNaN(n)||n<2) n=12; if(n>16) n=16;
  var arr=[]; for(var i=1;i<=n;i++) arr.push('Team '+i);
  var inputs = $$('#tt-teams input');
  inputs.forEach(function(inp,idx){ inp.value = arr[idx]||''; });
}
function startTournament(){
  var teams = readTeams();
  if(teams.length<2){ alert('Mindestens 2 Teams erforderlich.'); return; }
  $('#tt-setup').style.display='none';
  $('#tt-live').style.display='block';
  $('#tt-status').textContent = 'Status: Turnier gestartet ('+teams.length+' Teams)';
  var sum = '<ul>'+teams.map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul>';
  $('#tt-summary').innerHTML = '<strong>Teams:</strong>'+sum;
}
function resetTournament(){
  location.reload();
}

document.addEventListener('DOMContentLoaded', function(){
  var s=$('#tt-start'), d=$('#tt-demo'), c=$('#tt-clear');
  if(s){ s.addEventListener('click', startTournament); }
  if(d){ d.addEventListener('click', fillDemo); }
  if(c){ c.addEventListener('click', resetTournament); }
});
})();