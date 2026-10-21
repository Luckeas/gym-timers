const fs=require('fs');
const src=fs.readFileSync('assets/timer.js','utf8');
const body=src.slice(src.indexOf('function S('),src.indexOf('/* ---------------- sound'));
const buildSteps=new Function(body+'; return buildSteps;')();
for(let n=4;n<=32;n++){
  const h=fs.readFileSync(`immortals/week-${n}/index.html`,'utf8');
  const c=JSON.parse(h.match(/window.CIRCUIT = (.*?);<\/script>/s)[1].replace(/<\\\//g,'</'));
  const st=buildSteps(c);
  const t=st.reduce((a,s)=>a+(s.secs||0),0), man=st.filter(s=>s.manual).length;
  const cues={};st.forEach(s=>{if(s.cue)cues[s.cue]=(cues[s.cue]||0)+1});
  const bad=st.filter(s=>!s.manual&&!(s.secs>0));
  console.log(`W${n} ${c.format.padEnd(9)} steps ${String(st.length).padStart(3)} timed ${(t/60).toFixed(1).padStart(5)}min ${man?'+'+man+' sets':''} ${JSON.stringify(cues)} ${bad.length?'BAD '+bad.length:''}`);
}
