/* ===== Bande-son de Chasse-Bulles : instruments synthétisés + séquenceur ===== */
const SND=(()=>{
const A={ctx:null,muted:false,want:null,song:null,songGain:null,step:0,next:0,last:{}};
try{A.muted=localStorage.getItem('cb-muet')==='1'}catch(e){}
const NOTE={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const freq=n=>{const m=/^([A-G])(#?)(-?\d)$/.exec(n);return 440*Math.pow(2,(NOTE[m[1]]+(m[2]?1:0)+12*(+m[3]+1)-69)/12)};

function init(){
  if(A.ctx){if(A.ctx.state==='suspended'&&!A.paused)A.ctx.resume();return}
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  const c=A.ctx=new C();
  A.master=c.createGain();A.master.gain.value=A.muted?0:1;
  const comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;
  A.master.connect(comp);comp.connect(c.destination);
  A.music=c.createGain();A.music.gain.value=.34;A.music.connect(A.master);
  A.sfx=c.createGain();A.sfx.gain.value=.62;A.sfx.connect(A.master);
  const len=c.sampleRate*2.4,ir=c.createBuffer(2,len,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}
  A.rev=c.createConvolver();A.rev.buffer=ir;const rg=c.createGain();rg.gain.value=.3;A.rev.connect(rg);rg.connect(A.master);
  const nb=c.createBuffer(1,c.sampleRate,c.sampleRate),nd=nb.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;A.noise=nb;
  setInterval(schedule,25);
  if(A.want){const w=A.want;A.want=null;music(w)}
}

/* ---------- briques ---------- */
const now=()=>A.ctx.currentTime;
function o(type,f,t){const x=A.ctx.createOscillator();x.type=type;x.frequency.setValueAtTime(f,t);return x}
function g(v=1){const x=A.ctx.createGain();x.gain.value=v;return x}
function env(node,t,a,peak,hold,rel){const p=node.gain;p.setValueAtTime(.0001,t);p.exponentialRampToValueAtTime(peak,t+a);if(hold>0)p.setValueAtTime(peak,t+a+hold);p.exponentialRampToValueAtTime(.0001,t+a+hold+rel);return t+a+hold+rel}
function filt(type,f,q=1){const x=A.ctx.createBiquadFilter();x.type=type;x.frequency.value=f;x.Q.value=q;return x}
function send(node,dest,wet){node.connect(dest);if(wet){const s=g(wet);node.connect(s);s.connect(A.rev)}}
function noise(t,dur){const s=A.ctx.createBufferSource();s.buffer=A.noise;s.loop=true;s.start(t,Math.random()*.5);s.stop(t+dur+.05);return s}
function run(src,t,end){src.start(t);src.stop(end+.05)}

/* ---------- instruments ---------- */
const INS={
  pluck(t,f,d,v,dest){const a=o('triangle',f,t),b=o('sine',f*2,t),lp=filt('lowpass',2600),e=g();const bb=g(.25);
    a.connect(lp);b.connect(bb);bb.connect(lp);lp.connect(e);const end=env(e,t,.004,v,0,.38);send(e,dest,.2);run(a,t,end);run(b,t,end)},
  glock(t,f,d,v,dest){const e=g();[[1,1,1.1],[2.76,.28,.45],[5.4,.1,.22]].forEach(([m,a,r])=>{const x=o('sine',f*m,t),k=g();x.connect(k);k.connect(e);env(k,t,.002,a,0,r);run(x,t,t+r+.02)});
    e.gain.value=v;send(e,dest,.4)},
  harpsi(t,f,d,v,dest){const a=o('sawtooth',f,t),b=o('square',f*2,t),hp=filt('highpass',260),lp=filt('lowpass',4200),e=g(),bg=g(.35);
    a.connect(hp);b.connect(bg);bg.connect(hp);hp.connect(lp);lp.connect(e);const end=env(e,t,.003,v,0,.45);send(e,dest,.22);run(a,t,end);run(b,t,end)},
  organ(t,f,d,v,dest){const e=g(),trem=o('sine',5.2,t),tg=g(v*.12);trem.connect(tg);tg.connect(e.gain);
    [[1,1],[2,.5],[3,.25],[4,.15]].forEach(([m,a])=>{const x=o('sine',f*m,t),k=g(a);x.connect(k);k.connect(e);run(x,t,t+d+.3)});
    const end=env(e,t,.04,v,Math.max(.01,d-.08),.25);send(e,dest,.35);run(trem,t,end)},
  theremin(t,f,d,v,dest,prev){const x=o('sine',prev||f,t),x2=o('triangle',prev||f,t),lfo=o('sine',5.6,t),lg=g(f*.014),e=g(),k=g(.18);
    x.frequency.setTargetAtTime(f,t,.05);x2.frequency.setTargetAtTime(f,t,.05);lfo.connect(lg);lg.connect(x.frequency);lg.connect(x2.frequency);
    x.connect(e);x2.connect(k);k.connect(e);const end=env(e,t,.09,v,Math.max(.01,d-.1),.3);send(e,dest,.5);[x,x2,lfo].forEach(n=>run(n,t,end))},
  bass(t,f,d,v,dest){const a=o('triangle',f,t),b=o('sine',f,t),lp=filt('lowpass',900),e=g();a.connect(lp);b.connect(lp);lp.connect(e);
    const end=env(e,t,.006,v,Math.min(d*.5,.12),.22);send(e,dest,0);run(a,t,end);run(b,t,end)},
  brass(t,f,d,v,dest){const a=o('sawtooth',f,t),b=o('sawtooth',f*1.006,t),lp=filt('lowpass',700,2),e=g();a.connect(lp);b.connect(lp);lp.connect(e);
    lp.frequency.setValueAtTime(600,t);lp.frequency.linearRampToValueAtTime(3200,t+.06);lp.frequency.exponentialRampToValueAtTime(1500,t+.25);
    const end=env(e,t,.035,v,Math.max(.01,d-.06),.14);send(e,dest,.25);run(a,t,end);run(b,t,end)},
  choir(t,f,d,v,dest){const e=g(),bp=filt('bandpass',900,.8);[0.996,1,1.005].forEach(m=>{const x=o('sawtooth',f*m,t);x.connect(bp);run(x,t,t+d+.7)});
    bp.connect(e);env(e,t,.35,v,Math.max(.01,d-.35),.6);send(e,dest,.6)},
};
const DR={
  k(t,v,dest){const x=o('sine',150,t),e=g();x.frequency.exponentialRampToValueAtTime(42,t+.13);x.connect(e);send(e,dest,0);run(x,t,env(e,t,.002,v,0,.3))},
  s(t,v,dest){const n=noise(t,.2),bp=filt('bandpass',1900,.7),e=g();n.connect(bp);bp.connect(e);env(e,t,.002,v*.7,0,.16);send(e,dest,.2);
    const x=o('triangle',190,t),e2=g();x.connect(e2);send(e2,dest,0);run(x,t,env(e2,t,.002,v*.4,0,.08))},
  h(t,v,dest){const n=noise(t,.06),hp=filt('highpass',7200),e=g();n.connect(hp);hp.connect(e);env(e,t,.001,v*.35,0,.045);send(e,dest,0)},
};

/* ---------- partitions (pas = croche) ---------- */
const bar=(s,n)=>Array(n).fill(s).join(' ');
const SONGS={
 menu:{gain:2,bpm:160,loop:true,tr:[
  ['glock',.2,'A4 - D5 - F5 - E5 - D5 - A4 - A#4 - D5 - G5 - F5 - E5 - C#5 - D5 - F5 - A5 - A#5 - A5 - F5 - G5 - E5 - C#5 - D5 - - - - .'],
  ['pluck',.42,'D3 . . . . . D3 . . . . . G2 . . . . . A2 . . . . . D3 . . . . . A#2 . . . . . G2 . . . A2 . D3 . . . . .'],
  ['harpsi',.07,'. . D4+F4+A4 . D4+F4+A4 . . . D4+F4+A4 . D4+F4+A4 . . . D4+G4+A#4 . D4+G4+A#4 . . . C#4+E4+G4 . C#4+E4+A4 . . . D4+F4+A4 . D4+F4+A4 . . . D4+F4+A#4 . D4+F4+A#4 . . . D4+G4+A#4 . C#4+E4+A4 . . . D4+F4+A4 . . .'],
 ]},
 w0:{gain:1.8,bpm:132,loop:true,tr:[
  ['glock',.2,'E5 . A5 . C6 B5 A5 . G#5 - E5 - - - - . F5 . A5 . C6 . D6 C6 B5 - G#5 - E5 - - . E5 . A5 . C6 B5 A5 . C6 . E6 . D6 C6 B5 . A5 . F5 . D5 . F5 A5 G#5 - B5 - A5 - - .'],
  ['pluck',.45,'A2 . E3 . A2 . E3 . A2 . E3 . A2 . E3 . F2 . C3 . F2 . C3 . E2 . B2 . E2 . G#2 . A2 . E3 . A2 . E3 . A2 . E3 . A2 . E3 . D2 . A2 . D2 . A2 . E2 . B2 . E2 . G#2 .'],
  ['organ',.05,'A3+C4+E4 - - - - - - - A3+C4+E4 - - - - - - - F3+A3+C4 - - - - - - - E3+G#3+B3 - - - - - - - A3+C4+E4 - - - - - - - A3+C4+E4 - - - - - - - D3+F3+A3 - - - - - - - E3+G#3+B3 - - - - - - -'],
  ['drums',.5,bar('k . h . s . h .',8)],
 ]},
 w1:{gain:.8,bpm:112,loop:true,tr:[
  ['theremin',.17,'B4 - - - E5 - - - G5 - - - F#5 - E5 - C5 - - - E5 - A5 - F#5 - - - - - - - B4 - - - E5 - G5 - B5 - - - A5 - G5 - A5 - G5 - F#5 - E5 - D#5 - - - B4 - - -'],
  ['bass',.5,'E2 . G2 . B2 . G2 . C2 . E2 . G2 . E2 . A1 . C2 . E2 . C2 . B1 . D#2 . F#2 . A2 . E2 . G2 . B2 . G2 . G1 . B1 . D2 . B1 . A1 . C2 . E2 . C2 . B1 . D#2 . F#2 . A2 .'],
  ['glock',.09,'. . . E6 . . . B5 . . . E6 . . . C6 . . . C6 . . . A5 . . . D#6 . . . B5 . . . E6 . . . B5 . . . D6 . . . B5 . . . C6 . . . A5 . . . D#6 . . . B5'],
  ['choir',.035,'E3+G3+B3 - - - - - - - C3+E3+G3 - - - - - - - A2+C3+E3 - - - - - - - B2+D#3+A3 - - - - - - - E3+G3+B3 - - - - - - - G2+B2+D3 - - - - - - - A2+C3+E3 - - - - - - - B2+D#3+A3 - - - - - - -'],
  ['drums',.4,bar('k . h . s . h h',8)],
 ]},
 w2:{gain:.75,bpm:140,loop:true,tr:[
  ['brass',.1,'C5 - - G4 C5 - D#5 - D5 - C5 - G#4 - - - F4 - G#4 - C5 - F5 - D#5 - D5 - B4 - G4 - C5 - - G4 C5 - D#5 - G5 - F5 - D#5 - A#4 - G#4 - C5 - F5 - G#5 - G5 - F5 - D5 - B4 -'],
  ['bass',.42,[bar('C2 C3',4),bar('G#1 G#2',4),bar('F1 F2',4),bar('G1 G2',4),bar('C2 C3',4),bar('D#2 D#3',4),bar('F1 F2',4),bar('G1 G2',4)].join(' ')],
  ['organ',.04,'C4+D#4+G4 - - - - - - - C4+D#4+G#4 - - - - - - - C4+F4+G#4 - - - - - - - B3+D4+G4 - - - - - - - C4+D#4+G4 - - - - - - - A#3+D#4+G4 - - - - - - - C4+F4+G#4 - - - - - - - B3+D4+G4 - - - - - - -'],
  ['drums',.55,bar('k h s h k k s h',8)],
 ]},
 w3:{gain:1.3,bpm:100,loop:true,tr:[  // Grottes de Cristal : marimba en échos, gouttes de glockenspiel
  ['glock',.18,'A5 - - - - - F5 - E5 - - - G5 - - - F5 - - - D5 - - - C#5 - - - - - - - A5 - - - D6 - - - C6 - A5 - F5 - - - G5 - - - B5 - D6 - C#6 - - - - - - -'],
  ['pluck',.26,'D4 A4 F4 A4 D5 A4 F4 A4 C4 G4 E4 G4 C5 G4 E4 G4 A#3 F4 D4 F4 A#4 F4 D4 F4 A3 E4 C#4 E4 A4 E4 C#4 E4 D4 A4 F4 A4 D5 A4 F4 A4 F3 C4 A3 C4 F4 C4 A3 C4 G3 D4 B3 D4 G4 D4 B3 D4 A3 E4 C#4 E4 A4 E4 C#4 E4'],
  ['bass',.5,'D2 - - - - - - - C2 - - - - - - - A#1 - - - - - - - A1 - - - - - - - D2 - - - - - - - F1 - - - - - - - G1 - - - - - - - A1 - - - - - - -'],
  ['choir',.03,'D3+F3+A3 - - - - - - - C3+E3+G3 - - - - - - - A#2+D3+F3 - - - - - - - A2+C#3+E3 - - - - - - - D3+F3+A3 - - - - - - - F2+A2+C3 - - - - - - - G2+B2+D3 - - - - - - - A2+C#3+E3 - - - - - - -'],
  ['drums',.35,bar('k . . h . . h .',8)],
 ]},
 w4:{gain:1.4,bpm:88,loop:true,tr:[   // Abysses : harpe en arpèges, nappe douce, mélodie de glockenspiel
  ['glock',.17,'G#5 - - - B5 - - - C#6 - - - B5 - A5 - G#5 - - - E5 - - - F#5 - - - - - - - G#5 - - - B5 - D#6 - E6 - - - C#6 - A5 - C#6 - - - A5 - F#5 - D#5 - - - - - - -'],
  ['pluck',.24,'E3 B3 E4 G#4 B4 G#4 E4 B3 A2 E3 A3 C#4 E4 C#4 A3 E3 C#3 G#3 C#4 E4 G#4 E4 C#4 G#3 B2 F#3 B3 D#4 F#4 D#4 B3 F#3 E3 B3 E4 G#4 B4 G#4 E4 B3 A2 E3 A3 C#4 E4 C#4 A3 E3 F#2 C#3 F#3 A3 C#4 A3 F#3 C#3 B2 F#3 B3 D#4 F#4 D#4 B3 F#3'],
  ['bass',.45,'E2 - - - - - - - A1 - - - - - - - C#2 - - - - - - - B1 - - - - - - - E2 - - - - - - - A1 - - - - - - - F#1 - - - - - - - B1 - - - - - - -'],
  ['organ',.035,'E3+G#3+B3+D#4 - - - - - - - A3+C#4+E4 - - - - - - - C#3+E3+G#3 - - - - - - - B2+D#3+F#3 - - - - - - - E3+G#3+B3+D#4 - - - - - - - A3+C#4+E4 - - - - - - - F#3+A3+C#4 - - - - - - - B2+D#3+F#3 - - - - - - -'],
 ]},
 boss:{gain:.7,bpm:168,loop:true,tr:[
  ['brass',.1,'D5 . A4 . D5 . F5 E5 D5 . C#5 . A4 - - . A#4 . D5 . F5 . A#5 A5 G5 . E5 . C#5 . A4 .'],
  ['harpsi',.06,'D5 . A4 . D5 . F5 E5 D5 . C#5 . A4 - - . A#4 . D5 . F5 . A#5 A5 G5 . E5 . C#5 . A4 .'],
  ['bass',.5,'D2 D2 D3 D2 F2 D2 E2 C#2 D2 D2 D3 D2 F2 D2 E2 C#2 A#1 A#1 A#2 A#1 D2 A#1 C2 A1 A1 A1 A2 A1 C#2 A1 E2 C#2'],
  ['organ',.045,'. . D4+F4+A4 . . . D4+F4+A4 . . . D4+F4+A4 . . . D4+F4+A4 . . . D4+F4+A#4 . . . D4+F4+A#4 . . . C#4+E4+A4 . . . C#4+E4+G4 .'],
  ['drums',.65,bar('kh h sh h kh kh sh h',4)],
 ]},
 clear:{bpm:200,loop:false,tr:[
  ['glock',.3,'C5 E5 G5 C6 - - - - . .'],['pluck',.4,'C3 . G3 . C4 - - - . .'],['organ',.06,'C4+E4+G4 - - - - - - - . .']]},
 win:{bpm:150,loop:false,tr:[
  ['brass',.14,'G4 . C5 . E5 . G5 - - E5 G5 - - - C6 - - - - - - - . . . .'],
  ['glock',.18,'. . . . . . . . . . . . . . C6 . E6 . G6 . C7 - - - . . . .'],
  ['organ',.06,'C4+E4+G4 - - - - - - - - - - - - - C4+E4+G4+C5 - - - - - - - . . . .'],
  ['drums',.6,'s s s s s s s s k . . . k . k . k . . . . . . . . . . .']]},
};
for(const s of Object.values(SONGS)){
  s.p=s.tr.map(([ins,vol,str])=>{
    const tk=str.trim().split(/\s+/),ev=new Array(tk.length).fill(null);
    tk.forEach((x,i)=>{if(x==='.'||x==='-')return;let d=1;while(tk[i+d]==='-')d++;
      ev[i]=ins==='drums'?{dr:x}:{f:x.split('+').map(freq),d}});
    return{ins,vol,ev,prev:0};
  });
  s.len=Math.max(...s.p.map(p=>p.ev.length));
}
function schedule(){
  const s=A.song,c=A.ctx;if(!s||!c||c.state!=='running')return;
  const sd=60/s.bpm/2;
  if(A.next<c.currentTime-.2)A.next=c.currentTime+.05;
  while(A.next<c.currentTime+.15){
    if(A.step>=s.len){if(s.loop)A.step=0;else{A.song=null;if(s.then)music(s.then);return}}
    for(const tr of s.p){
      const e=tr.ev[A.step];if(!e)continue;
      if(e.dr){for(const ch of e.dr)DR[ch]&&DR[ch](A.next,tr.vol,A.songGain)}
      else for(const f of e.f){INS[tr.ins](A.next,f,e.d*sd,tr.vol,A.songGain,tr.prev);tr.prev=f}
    }
    A.step++;A.next+=sd;
  }
}
function music(name,then){
  if(!A.ctx){A.want=name;return}
  if(A.cur===name&&A.song)return;
  const c=A.ctx;
  if(A.songGain){const old=A.songGain;old.gain.setTargetAtTime(.0001,c.currentTime,.15);setTimeout(()=>old.disconnect(),900)}
  A.cur=name;A.song=null;
  if(!name)return;
  const s=SONGS[name];s.then=then;s.p.forEach(p=>p.prev=0);
  A.songGain=g(s.gain||1);A.songGain.connect(A.music);
  A.song=s;A.step=0;A.next=c.currentTime+.08;
}

/* ---------- bruitages ---------- */
function ok(key,ms){const t=performance.now();if(A.last[key]&&t-A.last[key]<ms)return false;A.last[key]=t;return true}
function sweep(type,f0,f1,dur,v,wet=0,t=now()){const x=o(type,f0,t),e=g();x.frequency.exponentialRampToValueAtTime(f1,t+dur);x.connect(e);send(e,A.sfx,wet);run(x,t,env(e,t,.004,v,0,dur));return x}
function nz(type,f,q,dur,v,t=now(),f1){const n=noise(t,dur),fl=filt(type,f,q),e=g();if(f1)fl.frequency.exponentialRampToValueAtTime(f1,t+dur);n.connect(fl);fl.connect(e);env(e,t,.003,v,0,dur);send(e,A.sfx,.15)}
const S={
  pop(size,combo=1){if(!A.ctx||!ok('pop',25))return;const t=now(),b=[0,1150,720,420][size]*Math.pow(1.059,Math.min(combo-1,12));
    sweep('sine',b,b*.32,.12+size*.05,.55,.15,t);sweep('sine',b*2.1,b*.7,.06,.2,0,t);nz('bandpass',b*1.8,2,.08,.35,t)},
  tick(){if(!A.ctx||!ok('tick',40))return;sweep('sine',1400,900,.04,.15)},
  jump(){if(!A.ctx)return;const t=now(),x=sweep('square',260,620,.14,.09,0,t);const l=o('sine',28,t),lg=g(25);l.connect(lg);lg.connect(x.frequency);run(l,t,t+.16)},
  airjump(){if(!A.ctx)return;nz('bandpass',600,1.2,.22,.4,now(),2600);sweep('sine',500,900,.12,.08)},
  land(){if(!A.ctx||!ok('land',80))return;sweep('sine',140,60,.08,.3);nz('lowpass',500,1,.05,.2)},
  hurt(){if(!A.ctx)return;const t=now();const x=sweep('square',720,240,.32,.13,.2,t);const l=o('sine',18,t),lg=g(40);l.connect(lg);lg.connect(x.frequency);run(l,t,t+.34);nz('lowpass',1200,1,.15,.3,t)},
  combo(n){if(!A.ctx||!ok('combo',90))return;const t=now(),root=523*Math.pow(1.059,Math.min(n-3,12)*2);
    [1,1.26,1.5,2].slice(0,Math.min(4,n-1)).forEach((m,i)=>INS.glock(t+i*.05,root*m,.2,.09,A.sfx))},
  shield(){if(!A.ctx)return;const t=now();sweep('sine',1800,900,.3,.2,.4,t);INS.glock(t,1320,.3,.12,A.sfx);nz('highpass',5000,1,.15,.2,t)},
  cards(){if(!A.ctx)return;const t=now();for(let i=0;i<3;i++){nz('bandpass',3200,1.5,.07,.35,t+i*.09);INS.glock(t+i*.09+.05,784*Math.pow(1.26,i),.2,.07,A.sfx)}},
  thunder(w){if(!A.ctx)return;const t=now()+.15;nz('lowpass',w===1?900:600,.8,.12,.35,t);nz('lowpass',260,.7,2.6,w===1?.55:.4,t+.08,50)},
  select(){if(!A.ctx)return;sweep('sine',600,1300,.08,.25,.2);sweep('sine',900,1800,.06,.12,0,now()+.05)},
  bossHit(){if(!A.ctx||!ok('bh',70))return;sweep('sine',150,55,.14,.5);nz('lowpass',900,1,.08,.3)},
  boom(){if(!A.ctx)return;const t=now();sweep('sine',95,28,.6,.9,.2,t);nz('lowpass',300,1,.5,.7,t,80)},
  screech(){if(!A.ctx)return;const t=now(),x=sweep('sawtooth',2200,3100,.38,.06,.3,t),l=o('sine',32,t),lg=g(500);l.connect(lg);lg.connect(x.frequency);run(l,t,t+.4);sweep('sine',2800,3600,.3,.08,.3,t)},
  laugh(){if(!A.ctx)return;const t0=now();for(let i=0;i<5;i++){const t=t0+i*.14,f=230-i*14,x=o('sawtooth',f,t),bp=filt('bandpass',700-i*30,3),e=g();
    x.frequency.exponentialRampToValueAtTime(f*.82,t+.11);x.connect(bp);bp.connect(e);send(e,A.sfx,.35);run(x,t,env(e,t,.01,.7,.04,.08));sweep('sine',900+i*120,1600+i*120,.05,.08,0,t+.07)}},
  roar(){if(!A.ctx)return;const t=now(),x=o('sawtooth',90,t),y=o('sawtooth',93,t),ws=A.ctx.createWaveShaper(),cv=new Float32Array(256);
    for(let i=0;i<256;i++){const k=i/128-1;cv[i]=Math.tanh(k*4)}ws.curve=cv;const lp=filt('lowpass',300,4),e=g();
    lp.frequency.linearRampToValueAtTime(1600,t+.25);lp.frequency.exponentialRampToValueAtTime(250,t+.9);x.frequency.linearRampToValueAtTime(70,t+.9);
    x.connect(ws);y.connect(ws);ws.connect(lp);lp.connect(e);send(e,A.sfx,.35);const end=env(e,t,.06,.45,.4,.45);run(x,t,end);run(y,t,end)},
  explode(){if(!A.ctx)return;const t=now();nz('lowpass',2400,.7,1.6,.9,t,120);sweep('sine',110,25,1.2,.9,.3,t);
    [0,.5,.8].forEach((d,i)=>[523,659,784].forEach(f=>INS.glock(t+1+d,f*(i+1)/1.5,.4,.12,A.sfx)))},
  gameover(){if(!A.ctx)return;const t0=now()+.1;[[233,.42],[220,.42],[208,.42],[196,1.1]].forEach(([f,d],i)=>{
    const t=t0+i*.46,x=o('sawtooth',f,t),lp=filt('lowpass',900,2),e=g(),l=o('sine',i===3?6:0.1,t),lg=g(i===3?6:0);
    l.connect(lg);lg.connect(x.frequency);x.frequency.linearRampToValueAtTime(f*.97,t+d);x.connect(lp);lp.connect(e);send(e,A.sfx,.3);const end=env(e,t,.05,.45,d-.1,.12);run(x,t,end);run(l,t,end)})},
};
S.shot={
  dracula(){const t=now();for(let i=0;i<4;i++)nz('bandpass',1800,3,.035,.35,t+i*.03);sweep('sine',2600,3300,.08,.07,.2,t)},
  zombie(){const t=now();nz('lowpass',1400,6,.16,.55,t,250);sweep('sine',420,160,.12,.2,0,t);sweep('sine',800,1300,.04,.1,0,t+.08)},
  frank(){const t=now(),x=o('sawtooth',1500,t),fm=o('square',73,t),fg=g(900),hp=filt('highpass',900),e=g();
    fm.connect(fg);fg.connect(x.frequency);x.connect(hp);hp.connect(e);send(e,A.sfx,.2);const end=env(e,t,.003,.18,.06,.12);run(x,t,end);run(fm,t,end);nz('highpass',4000,1,.12,.25,t)},
  loup(){nz('bandpass',5200,2.5,.13,.55,now(),900)},
  fantome(){const t=now(),x=sweep('sine',520,360,.32,.14,.5,t),l=o('sine',7,t),lg=g(18);l.connect(lg);lg.connect(x.frequency);run(l,t,t+.34)},
  momie(){const t=now();nz('highpass',3500,.7,.2,.3,t,7000);INS.glock(t+.02,1568,.2,.05,A.sfx)},
  sorciere(){const t=now();[2093,2637,3136].forEach((f,i)=>INS.glock(t+i*.045,f*(1+Math.random()*.03),.2,.07,A.sfx))},
  squelette(){const t=now();nz('bandpass',1900,9,.04,.8,t);nz('bandpass',1500,9,.04,.7,t+.07)},
};
function shot(id){if(A.ctx&&ok('shot'+id,45))(S.shot[id]||S.tick)()}
function setMuted(m){A.muted=m;try{localStorage.setItem('cb-muet',m?'1':'0')}catch(e){}
  if(A.master)A.master.gain.setTargetAtTime(m?0:1,A.ctx.currentTime,.05)}
function pause(p){A.paused=p;if(!A.ctx)return;p?A.ctx.suspend():A.ctx.resume()}
return{...S,init,music,shot,setMuted,pause,get muted(){return A.muted}};
})();
