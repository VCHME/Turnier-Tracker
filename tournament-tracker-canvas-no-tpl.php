<?php
/*
Plugin Name: Tournament Tracker Canvas (Inline, No ES6 Templates)
Description: Renders the Tournament Tracker via shortcode [tournament_tracker_canvas] with inline scripts (no footer dependency). Uses no JS template literals to avoid escaping issues.
Version: 1.0.2
Author: ChatGPT
*/

if (!defined('ABSPATH')) exit;

function ttc2_shortcode_cb($atts = [], $content = null){
    $uid = 'ttc-root-' . wp_generate_uuid4();
    ob_start();
    ?>
<div id="<?php echo esc_attr($uid); ?>" class="ttc-root"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script>
window.addEventListener('error', function(e){
  if(!document.getElementById('ttc-vendor-error')){
    var m = document.createElement('div');
    m.id = 'ttc-vendor-error';
    m.style.cssText='margin:12px 0;padding:10px;border:1px solid #f00;color:#900;background:#fee;font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial';
    m.textContent = 'Tournament Tracker: Vendor-Skripte (React/Babel) konnten nicht geladen werden. Prüfe CSP/Caching oder erlaube unpkg.com.';
    document.getElementById('<?php echo esc_js($uid); ?>').appendChild(m);
  }
}, {once:true});
</script>
<script type="text/babel" data-presets="react">
const {useState, useMemo} = React;

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const GROUP_COLORS=["bg-blue-100 text-blue-800 border-blue-300","bg-amber-100 text-amber-800 border-amber-300","bg-emerald-100 text-emerald-800 border-emerald-300","bg-pink-100 text-pink-800 border-pink-300","bg-indigo-100 text-indigo-800 border-indigo-300","bg-teal-100 text-teal-800 border-teal-300","bg-rose-100 text-rose-800 border-rose-300","bg-lime-100 text-lime-800 border-lime-300"];
const badgeClass=(gi)=>"inline-block px-2 py-0.5 rounded-full text-xs font-semibold border "+GROUP_COLORS[gi % GROUP_COLORS.length];

function chunkEven(arr,g){g=clamp(g,1,8);const out=Array.from({length:g},()=>[]);arr.forEach((t,i)=>out[i%g].push(t));return out;}
function roundRobinPairs(ids){const a=ids.slice();if(a.length%2===1)a.push(null);const rounds=a.length-1,half=a.length/2,out=[];for(let r=0;r<rounds;r++){const round=[];for(let i=0;i<half;i++){const t1=a[i],t2=a[a.length-1-i];if(t1!=null&&t2!=null)round.push([t1,t2]);}out.push(round);a.splice(1,0,a.pop());}return out;}
const resolveRefIdx=(list,ref)=>{if(!ref)return null;const m=list.find(x=>x.id===ref.fromId);if(!m||typeof m.scoreA!=="number"||typeof m.scoreB!=="number")return null;const aWins=m.scoreA>m.scoreB;return ref.outcome==="W"?(aWins?m.a:m.b):(aWins?m.b:m.a)};
const propagate=(list)=>{const next=list.map(m=>({...m}));let changed=true,guard=0;while(changed&&guard<50){changed=false;guard++;for(const m of next){const aNew=m.a??resolveRefIdx(next,m.aRef);const bNew=m.b??resolveRefIdx(next,m.bRef);if(aNew!==m.a||bNew!==m.b){m.a=aNew;m.b=bNew;changed=true;}}}return next;};

function buildKO(seeds,courts,playAllPlaces){
  const out=[];let slot=1;const push=(stage,label,a,b,aRef=null,bRef=null)=>{out.push({id:(stage+"-"+slot+"-"+Math.random().toString(36).slice(2,6)),stage,label,a,b,aRef,bRef,scoreA:null,scoreB:null,court:0,slot});slot++;};
  const Q=seeds.length;if(Q<2)return out;const pow2=2**Math.floor(Math.log2(Q));const playInCount=Q-pow2;const seedsCopy=[...seeds];
  if(playInCount>0){const pool=seedsCopy.splice(-2*playInCount);for(let i=0;i<pool.length;i+=2)push("PI","Play-in",pool[i],pool[i+1]);}
  const N=pow2||Q;const base=seedsCopy;for(let i=0;i<Q-N;i++)base.push(null);
  const pairs=[];for(let l=0,r=base.length-1;l<r;l++,r--)pairs.push([base[l],base[r]]);
  const piList=out.filter(m=>m.stage==="PI");let piIdx=0;const initial=[];
  for(const pair of pairs){const A=pair[0],B=pair[1];let a=A,b=B,aRef=null,bRef=null;if(a==null){const s=piList[piIdx++];if(s)aRef={fromId:s.id,outcome:"W"};}if(b==null){const s=piList[piIdx++];if(s)bRef={fromId:s.id,outcome:"W"};}const label=(N===16?"Achtelfinale":(N===8?"Viertelfinale":(N===4?"Halbfinale":("Runde "+N))));push(("R"+N),label,a,b,aRef,bRef);initial.push(out[out.length-1]);}
  let cur=initial,size=N;
  while(size>1){
    const nextSize=size/2;const next=[];
    for(let i=0;i+1<cur.length;i+=2){
      const Aref={fromId:cur[i].id,outcome:"W"};const Bref={fromId:cur[i+1].id,outcome:"W"};
      if(size===8)push("SF","Halbfinale",null,null,Aref,Bref);
      else if(size===4)push("F","Finale",null,null,Aref,Bref);
      else push(("R"+nextSize),("Runde "+nextSize),null,null,Aref,Bref);
      next.push(out[out.length-1]);
    }
    if(playAllPlaces&&size===8){
      const losers=cur.map(m=>({fromId:m.id,outcome:"L"}));
      if(losers.length>=4){
        const pA={id:("p58a-"+Math.random().toString(36).slice(2,6)),stage:"P5-8",label:"Platz 5-8 Halbfinale",a:null,b:null,aRef:losers[0],bRef:losers[1],scoreA:null,scoreB:null,court:0,slot:slot++};
        const pB={id:("p58b-"+Math.random().toString(36).slice(2,6)),stage:"P5-8",label:"Platz 5-8 Halbfinale",a:null,b:null,aRef:losers[2],bRef:losers[3],scoreA:null,scoreB:null,court:0,slot:slot++};
        out.push(pA,pB);
        push("P5","Spiel um Platz 5",null,null,{fromId:pA.id,outcome:"W"},{fromId:pB.id,outcome:"W"});
        push("P7","Spiel um Platz 7",null,null,{fromId:pA.id,outcome:"L"},{fromId:pB.id,outcome:"L"});
      }
    }
    if(size===4){
      const sfs=out.filter(m=>m.stage==="SF").slice(-2);
      if(sfs.length===2){
        out.push({id:("bronze-"+Math.random().toString(36).slice(2,6)),stage:"BRONZE",label:"Spiel um Platz 3",a:null,b:null,aRef:{fromId:sfs[0].id,outcome:"L"},bRef:{fromId:sfs[1].id,outcome:"L"},scoreA:null,scoreB:null,court:0,slot:slot++});
      }
    }
    cur=next;size=nextSize;
  }
  const C=Math.max(1,courts||1);
  const isRound=(x)=>x.stage[0]==='R'&&!isNaN(parseInt(x.stage.slice(1)));
  const piMatches=out.filter(m=>m.stage==="PI");
  const roundsNoSF=out.filter(isRound);
  const semis=out.filter(m=>m.stage==="SF");
  const p58=out.filter(m=>m.stage==="P5-8");
  const p5=out.filter(m=>m.stage==="P5");
  const p7=out.filter(m=>m.stage==="P7");
  const bronze=out.filter(m=>m.stage==="BRONZE");
  const finale=out.filter(m=>m.stage==="F");
  let slotCounter=1;const across=list=>{for(let i=0;i<list.length;i++){list[i].court=(i%C)+1;list[i].slot=slotCounter++;}};const c1=list=>{for(let i=0;i<list.length;i++){list[i].court=1;list[i].slot=slotCounter++;}};
  across(piMatches);across(roundsNoSF);across(semis);across(p58);across(p5);across(p7);c1(bronze);c1(finale);
  return [].concat(piMatches,roundsNoSF,semis,p58,p5,p7,bronze,finale);
}

function App(){
  const {useState, useMemo} = React;
  const [teams,setTeams]=React.useState(Array(16).fill(""));
  const [courts,setCourts]=React.useState(2);
  const [groups,setGroups]=React.useState(4);
  const [groupsCreated,setGroupsCreated]=React.useState(false);
  const [teamGroups,setTeamGroups]=React.useState(Array(16).fill(0));
  const [showSetup,setShowSetup]=React.useState(true);
  const [started,setStarted]=React.useState(false);
  const [matches,setMatches]=React.useState([]);
  const [advance,setAdvance]=React.useState(2);
  const [playAllPlaces,setPlayAllPlaces]=React.useState(false);
  const [ko,setKO]=React.useState([]);
  const [hidePastGroups,setHidePastGroups]=React.useState(true);
  const [hidePastKO,setHidePastKO]=React.useState(true);
  const nameOf=(i)=>teams[i]&&teams[i].trim()?teams[i].trim():("Team "+(i+1));

  const askDemo=()=>{var n=prompt("Wie viele Teams? (2–16)","16");var v=clamp(parseInt(String(n||"16"),10)||16,2,16);setTeams(Array.from({length:16},(_,i)=>(i<v?("Team "+(i+1)):"")));setGroupsCreated(false);setTeamGroups(Array(16).fill(0));};

  const createGroups=()=>{if(started)return;const ids=teams.map((t,i)=>(t&&t.trim()?i:-1)).filter(i=>i>=0);if(!ids.length){alert("Bitte zuerst Teams eintragen");return;}const chunks=chunkEven(ids,groups);const tg=Array(16).fill(0);chunks.forEach((lst,gi)=>lst.forEach((i)=>tg[i]=gi));setTeamGroups(tg);setGroupsCreated(true);};
  const changeGroup=(idx,gi)=>setTeamGroups(p=>{const c=p.slice();c[idx]=gi;return c;});

  const start=()=>{
    if(started)return;
    const ids=teams.map((t,i)=>(t&&t.trim()?i:-1)).filter(i=>i>=0);
    if(ids.length<2){alert("Mindestens 2 Teams erforderlich.");return;}
    let gW=clamp(groups,1,8);
    if(ids.length<=3)gW=1;else if(ids.length<=6)gW=Math.min(gW,2);else if(ids.length<=9)gW=Math.min(gW,3);
    let grouped=[];
    if(groupsCreated){grouped=Array.from({length:gW},()=>[]);ids.forEach(i=>grouped[clamp(teamGroups[i]||0,0,gW-1)].push(i));}else{grouped=chunkEven(ids,gW);}
    grouped=grouped.filter(x=>x.length>0);
    const per=grouped.map(idxs=>roundRobinPairs(idxs));const maxRounds=Math.max(0,...per.map(g=>g.length));const roundCursor=per.map(()=>0);
    const queue=[];for(let r=0;r<maxRounds;r++){let again=true;while(again){again=false;for(let gi=0;gi<per.length;gi++){const pairs=per[gi][r];if(!pairs)continue;const cur=roundCursor[gi]||0;if(cur<pairs.length){const p=pairs[cur];queue.push({gi:gi,round:r+1,a:p[0],b:p[1]});roundCursor[gi]=cur+1;again=true;}}}for(let gi=0;gi<roundCursor.length;gi++)roundCursor[gi]=0;}
    const last=new Map();const pending=queue.slice();const out=[];let slot=1;while(pending.length){const taken=new Set();let filled=0;for(let c=1;c<=Math.max(1,courts);c++){let pick=-1,best=-1;for(let i=0;i<pending.length;i++){const m=pending[i];if(taken.has(m.a)||taken.has(m.b))continue;const ra=slot-(last.get(m.a)||-999);const rb=slot-(last.get(m.b)||-999);const s=ra>=2&&rb>=2?2:(ra>=1&&rb>=1?1:0);if(s>best){best=s;pick=i;if(s===2)break;}}if(pick>=0){const m=pending.splice(pick,1)[0];out.push({gi:m.gi,a:m.a,b:m.b,scoreA:null,scoreB:null,round:m.round,court:c,slot:slot});taken.add(m.a);taken.add(m.b);last.set(m.a,slot);last.set(m.b,slot);filled++;}}if(!filled){const m=pending.shift();out.push({gi:m.gi,a:m.a,b:m.b,scoreA:null,scoreB:null,round:m.round,court:1,slot:slot});last.set(m.a,slot);last.set(m.b,slot);}slot++;}
    setMatches(out);setStarted(true);setShowSetup(false);
  };

  const reset=()=>{setTeams(Array(16).fill(""));setTeamGroups(Array(16).fill(0));setGroupsCreated(false);setShowSetup(true);setStarted(false);setMatches([]);setKO([]);};

  const updateScore=(ref, side, val)=>{setMatches(prev=>{const next=prev.map(m=>({...m}));const idx=next.findIndex(m=>m.court===ref.court&&m.slot===ref.slot);if(idx<0)return prev;const v=val===""?null:Math.max(0,parseInt(String(val))||0);if(side==="A")next[idx].scoreA=v;else next[idx].scoreB=v;return next;});};
  const fillDummyGroupResults=()=>{setMatches(prev=>prev.map(m=>({...m,scoreA:m.scoreA==null?Math.ceil(Math.random()*21):m.scoreA,scoreB:m.scoreB==null?Math.ceil(Math.random()*21):m.scoreB})));};

  const tables=React.useMemo(()=>{
    const gCount=matches.length?1+Math.max(...matches.map(m=>m.gi)):groups;
    const per=Array.from({length:Math.max(1,gCount)},()=>new Map());
    matches.forEach(m=>{const map=per[m.gi];const ensure=(idx)=>{if(!map.has(idx))map.set(idx,{idx:idx,team:nameOf(idx),P:0,W:0,L:0,PF:0,PA:0,Diff:0});return map.get(idx)};const A=ensure(m.a),B=ensure(m.b);
      if(typeof m.scoreA==="number"&&typeof m.scoreB==="number"){A.PF+=m.scoreA;A.PA+=m.scoreB;B.PF+=m.scoreB;B.PA+=m.scoreA;A.Diff=A.PF-A.PA;B.Diff=B.PF-B.PA;if(m.scoreA>m.scoreB){A.W++;B.L++;A.P+=3;}else if(m.scoreB>m.scoreA){B.W++;A.L++;B.P+=3;}}});
    return per.map(map=>Array.from(map.values()).sort((a,b)=>b.P-a.P||b.Diff-a.Diff||b.PF-a.PF||a.team.localeCompare(b.team)));
  },[matches,teams,groups]);

  const courtsView=React.useMemo(()=>{const C=Math.max(1,courts);const arr=Array.from({length:C},()=>[]);matches.forEach(m=>{const i=Math.min(C,Math.max(1,m.court||1))-1;arr[i].push(m)});arr.forEach(l=>l.sort((a,b)=>a.slot-b.slot));return arr;},[matches,courts]);

  const buildKOFromTables=()=>{const adv=clamp(advance,1,4);const quals=[];tables.forEach(rows=>rows.slice(0,adv).forEach((r,p)=>quals.push({place:p+1,idx:r.idx,P:r.P,Diff:r.Diff,PF:r.PF})));if(quals.length<2){alert("Zu wenige Aufsteiger für KO.");return;}const seeds=[];for(let p=1;p<=adv;p++){const tier=quals.filter(q=>q.place===p).sort((a,b)=>b.P-a.P||b.Diff-a.Diff||b.PF-a.PF);seeds.push.apply(seeds,tier.map(x=>x.idx));}const tree=buildKO(seeds,courts,playAllPlaces);setKO(propagate(tree));};

  const onScoreKO=(id, side, val)=>{setKO(prev=>{const v=val===""?null:Math.max(0,parseInt(String(val))||0);const copy=prev.map(m=>m.id!==id?m:({...m,[(side==="A")?"scoreA":"scoreB"]:v}));return propagate(copy);});};

  const lastFinishedIdx=(list)=>{let i=-1;for(let k=0;k<list.length;k++){const m=list[k];if(typeof m.scoreA==="number"&&typeof m.scoreB==="number")i=k;}return i;};

  const TeamRow=({label,score,onScore})=>React.createElement("div",{style:{display:"flex",justifyContent:"space-between",gap:"8px"}}, 
    React.createElement("div",{style:{flex:"1 1 auto",overflow:"hidden",textOverflow:"ellipsis"}}, label||"—"),
    React.createElement("input",{type:"number",min:0,value:score??"",onChange:e=>onScore(e.target.value),style:{width:"2.6rem"}})
  );

  const MatchCard=({header,aName,bName,aScore,bScore,onA,onB,dimmed})=>React.createElement("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,padding:12,background:dimmed?"#f9fafb":"#fff",opacity:dimmed?0.7:1}},
    React.createElement("div",{style:{fontSize:12,color:"#6b7280",marginBottom:6}}, header),
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
      React.createElement(TeamRow,{label:aName,score:aScore,onScore:onA}),
      React.createElement(TeamRow,{label:bName,score:bScore,onScore:onB})
    )
  );

  return React.createElement("div",{style:{padding:"16px"}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"}},
      React.createElement("h2",{style:{margin:0}},"Turnier-Tracker"),
      React.createElement("button",{onClick:()=>setShowSetup(s=>!s)}, showSetup?"Setup ausblenden":"Setup einblenden")
    ),

    showSetup && React.createElement("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,padding:12,marginTop:12}},
      React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:12}},
        React.createElement("label",null,"Courts ", React.createElement("input",{type:"number",min:1,max:4,value:courts,onChange:e=>setCourts(clamp(parseInt(e.target.value)||2,1,4))})),
        React.createElement("label",null,"Gruppen ", React.createElement("input",{type:"number",min:1,max:8,value:groups,onChange:e=>setGroups(clamp(parseInt(e.target.value)||4,1,8))}))
      ),
      !groupsCreated ?
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginBottom:12}},
          teams.map((t,i)=>React.createElement("input",{key:i,value:t,placeholder:("Team "+(i+1)),onChange:e=>setTeams(p=>{const c=p.slice();c[i]=e.target.value;return c;})}))
        )
      :
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12,marginBottom:12}},
          Array.from({length:Math.max(1,groups)}).map((_,gi)=>React.createElement("div",{key:gi,style:{border:"1px solid #e5e7eb",borderRadius:8,padding:8}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:8}},
              React.createElement("strong",null,"Gruppe G"+(gi+1)),
              React.createElement("span",{style:{border:"1px solid #93c5fd",background:"#dbeafe",color:"#1e40af",borderRadius:999,padding:"2px 6px",fontSize:12}},"G"+(gi+1))
            ),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
              teams.map((t,i)=> teamGroups[i]===gi ? React.createElement("div",{key:i,style:{display:"flex",gap:8,alignItems:"center"}},
                React.createElement("input",{value:t,onChange:e=>setTeams(p=>{const c=p.slice();c[i]=e.target.value;return c;}),style:{flex:"1 1 auto"}}),
                React.createElement("select",{value:teamGroups[i],onChange:e=>changeGroup(i,parseInt(e.target.value))},
                  Array.from({length:Math.max(1,groups)}).map((_,g2)=>React.createElement("option",{key:g2,value:g2},"G"+(g2+1)))
                )
              ): null)
            )
          ))
        ),
      React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
        React.createElement("button",{onClick:start},"Turnier starten"),
        React.createElement("button",{onClick:createGroups,disabled:started},"Gruppen erstellen"),
        React.createElement("button",{onClick:askDemo},"Demo befüllen…"),
        React.createElement("button",{onClick:reset},"Zurücksetzen")
      )
    ),

    started && React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:24,marginTop:16}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"}},
        React.createElement("h3",{style:{margin:0}},"Spiele – Gruppenphase"),
        React.createElement("button",{onClick:()=>setHidePastGroups(s=>!s)}, hidePastGroups?"Vergangene Spiele einblenden":"Vergangene Spiele ausblenden")
      ),
      React.createElement("div",{style:{display:"grid",gap:12,gridTemplateColumns:"repeat("+Math.max(1,courts)+", minmax(0,1fr))"}},
        courtsView.map((list,ci)=>{
          const last=(function(list){let i=-1;for(let k=0;k<list.length;k++){const m=list[k];if(typeof m.scoreA==="number"&&typeof m.scoreB==="number")i=k;}return i;})(list);
          return React.createElement("div",{key:ci,style:{border:"1px solid #e5e7eb",borderRadius:8,padding:12}},
            React.createElement("div",{style:{fontWeight:600,marginBottom:8}},"Court "+(ci+1)),
            React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
              list.map((m,i)=>{
                const done=typeof m.scoreA==="number"&&typeof m.scoreB==="number";
                const dimmed=hidePastGroups && done && i!==last;
                return React.createElement(MatchCard,{key:m.slot,header:("R "+m.round+" · Slot "+m.slot+" · G"+(m.gi+1)),aName:nameOf(m.a),bName:nameOf(m.b),aScore:m.scoreA,bScore:m.scoreB,onA:v=>updateScore(m,"A",v),onB:v=>updateScore(m,"B",v),dimmed:dimmed});
              })
            )
          );
        })
      ),

      React.createElement("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,padding:12}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}},
          React.createElement("strong",null,"KO-Konfigurator")
        ),
        React.createElement("div",{style:{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:8}},
          React.createElement("label",null,"Aufsteiger je Gruppe ", React.createElement("input",{type:"number",min:1,max:4,value:advance,onChange:e=>setAdvance(clamp(parseInt(e.target.value)||2,1,4))})),
          React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:playAllPlaces,onChange:e=>setPlayAllPlaces(e.target.checked)})," Alle Plätze ausspielen")
        ),
        React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
          React.createElement("button",{onClick:buildKOFromTables},"KO-Phase starten"),
          React.createElement("button",{onClick:fillDummyGroupResults},"Dummy-Ergebnisse (Gruppenphase)"),
          React.createElement("button",{onClick:reset},"Zurücksetzen")
        )
      ),

      ko.length>0 && React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:16}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"}},
          React.createElement("strong",null,"KO-Phase"),
          React.createElement("button",{onClick:()=>setHidePastKO(s=>!s)}, hidePastKO?"Vergangene Spiele einblenden":"Vergangene Spiele ausblenden")
        ),
        React.createElement("div",{style:{display:"grid",gap:12,gridTemplateColumns:"repeat("+Math.max(1,courts)+", minmax(0,1fr))"}},
          Array.from({length:Math.max(1,courts)}).map((_,ci)=>{
            const list = ko.filter(m=>(Math.max(1,Math.min(courts,m.court||1))-1)===ci).slice().sort((a,b)=>a.slot-b.slot);
            const last=(function(){let i=-1;for(let k=0;k<list.length;k++){const m=list[k];if(typeof m.scoreA==="number"&&typeof m.scoreB==="number")i=k;}return i;})();
            return React.createElement("div",{key:ci,style:{border:"1px solid #e5e7eb",borderRadius:8,padding:12}},
              React.createElement("div",{style:{fontWeight:600,marginBottom:8}},"Court "+(ci+1)),
              React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
                list.map((m,i)=>{
                  const aN = m.a!=null?nameOf(m.a):(m.aRef?"Sieger/Verlierer":"—");
                  const bN = m.b!=null?nameOf(m.b):(m.bRef?"Sieger/Verlierer":"—");
                  const done = typeof m.scoreA==="number"&&typeof m.scoreB==="number";
                  const dimmed = hidePastKO && done && i!==last;
                  const header = (m.label+" · Court "+(Math.max(1,Math.min(courts,m.court||1)))+" · Slot "+m.slot);
                  return React.createElement(MatchCard,{key:m.id,header:header,aName:aN,bName:bN,aScore:m.scoreA,bScore:m.scoreB,onA:v=>onScoreKO(m.id,"A",v),onB:v=>onScoreKO(m.id,"B",v),dimmed:dimmed});
                })
              )
            );
          })
        ),
        React.createElement("div",{style:{border:"1px solid #e5e7eb",borderRadius:8,padding:12}},
          React.createElement("strong",null,"Gesamtergebnisse"),
          React.createElement("div",{id:"ttc-standings-note",style:{fontSize:12,color:"#6b7280",marginTop:6}},"Ergebnisse erscheinen sobald Bronze & Finale eingetragen sind.")
        )
      )
    )
  );
}

(function mount(){
  try{
    const root = document.getElementById("<?php echo esc_js($uid); ?>");
    if(!root){console.error("Tournament Tracker: root not found");return;}
    const r = ReactDOM.createRoot(root);
    r.render(React.createElement(App, {}));
  }catch(e){
    console.error("Tournament Tracker init error:", e);
  }
})();
</script>
    <?php
    return ob_get_clean();
}
add_shortcode('tournament_tracker_canvas', 'ttc2_shortcode_cb');
