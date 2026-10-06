/* ============================================================
   tg-pad.js  ザ・ゲーム 共通コントローラー
   スティック + ABXY + LR（タッチ／キーボード／ゲームパッド対応）

   使い方:
     <div id="pad"></div>
     <script src="tg-pad.js"></script>
     TGPad.mount('#pad', {labels:{A:'ジャンプ',B:'こうげき',X:'',Y:'',L:'',R:''}, hide:[]});
     毎フレーム:
       const s = TGPad.stick;      // {x,y} -1〜1（右・下が正）
       TGPad.down('A')             // 押している間 true
       TGPad.pressed('A')          // 押した瞬間だけ true（読むと消える）
       TGPad.released('A')         // 離した瞬間だけ true
       TGPad.on('A', down=>{})     // 押した/離したときのコールバック
   キーボード: 矢印/WASD=スティック  K=A  J=B  I=X  U=Y  Q=L  E=R
   ゲームパッド: 標準配置（右=A 下=B 上=X 左=Y LB/LT=L RB/RT=R 左スティック/十字キー）
   ============================================================ */
(function(){
 const BTN=['A','B','X','Y','L','R'];
 const COL={A:'#ff5a5a',B:'#ffc53a',X:'#4aa8ff',Y:'#4ad87a',L:'#c8c8d8',R:'#c8c8d8'};
 const KEYS={k:'A',K:'A',j:'B',J:'B',i:'X',I:'X',u:'Y',U:'Y',q:'L',Q:'L',e:'R',E:'R'};
 const GP={A:1,B:0,X:3,Y:2,L:[4,6],R:[5,7]};
 const st={touch:{},key:{},gp:{}};const prev={};const edgeDown={},edgeUp={};const cbs={};
 const stick={x:0,y:0,touch:{x:0,y:0},key:{x:0,y:0},gp:{x:0,y:0}};
 const css=`
.tgp{position:relative;width:100%;height:100%;min-height:170px;-webkit-user-select:none;user-select:none;touch-action:none;-webkit-touch-callout:none;font-family:"Hiragino Sans","Noto Sans JP",sans-serif}
.tgp *{box-sizing:border-box}
.tgp-zone{position:absolute;left:0;top:0;bottom:0;width:50%}
.tgp-base{position:absolute;left:14px;bottom:calc(10px + env(safe-area-inset-bottom));width:108px;height:108px;border-radius:50%;
 background:radial-gradient(circle at 50% 50%,rgba(255,255,255,.04) 0 40%,rgba(255,255,255,.09) 41% 43%,rgba(255,255,255,.04) 44%),radial-gradient(circle,#2a2d3a,#15161e 72%);
 box-shadow:inset 0 3px 10px rgba(0,0,0,.8),0 0 0 2px rgba(255,255,255,.12),0 0 0 6px rgba(0,0,0,.35)}
.tgp-base::before{content:'';position:absolute;inset:0;border-radius:50%;background:
 linear-gradient(transparent 48.5%,rgba(255,255,255,.07) 48.5% 51.5%,transparent 51.5%),linear-gradient(90deg,transparent 48.5%,rgba(255,255,255,.07) 48.5% 51.5%,transparent 51.5%)}
.tgp-arrow{position:absolute;width:0;height:0;border:6px solid transparent;opacity:.35}
.tgp-knob{position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;
 background:radial-gradient(circle at 38% 30%,#6a6e80,#2e3040 62%,#1c1d28);box-shadow:0 6px 10px rgba(0,0,0,.6),inset 0 2px 0 rgba(255,255,255,.25),inset 0 -3px 0 rgba(0,0,0,.4)}
.tgp-knob::after{content:'';position:absolute;inset:11px;border-radius:50%;background:radial-gradient(circle,#3a3d4e,#24252f);box-shadow:inset 0 2px 4px rgba(0,0,0,.6)}
.tgp-knob.on{box-shadow:0 2px 6px rgba(0,0,0,.6),0 0 14px rgba(120,180,255,.45),inset 0 2px 0 rgba(255,255,255,.25)}
.tgp-b{position:absolute;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-weight:900;line-height:1;
 background:radial-gradient(circle at 38% 28%,var(--hl),var(--c) 55%,var(--dk));box-shadow:0 5px 0 var(--sh),0 7px 12px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.35);text-shadow:0 1px 2px rgba(0,0,0,.5);transition:transform .05s}
.tgp-b b{font-size:18px}.tgp-b small{font-size:8.5px;margin-top:2px;font-weight:800;white-space:nowrap;opacity:.95}
.tgp-b.on{transform:translateY(4px);box-shadow:0 1px 0 var(--sh),0 0 16px var(--c),inset 0 2px 0 rgba(255,255,255,.35);filter:brightness(1.15)}
.tgp-face{position:absolute;right:12px;bottom:calc(8px + env(safe-area-inset-bottom));width:144px;height:144px}
.tgp-face .tgp-b{width:50px;height:50px}
.tgp-A{right:0;top:47px}.tgp-B{left:47px;bottom:0}.tgp-X{left:47px;top:0}.tgp-Y{left:0;top:47px}
.tgp-sh{position:absolute;bottom:calc(158px + env(safe-area-inset-bottom));width:78px;height:32px;border-radius:12px 12px 8px 8px;display:flex;align-items:center;justify-content:center;gap:6px;color:#2a2d3a;font-weight:900;
 background:linear-gradient(#f0f0f8,#a8a8b8);box-shadow:0 4px 0 #6a6a7a,0 6px 10px rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.8);transition:transform .05s}
.tgp-sh b{font-size:15px}.tgp-sh small{font-size:9px;font-weight:800}
.tgp-sh.on{transform:translateY(3px);box-shadow:0 1px 0 #6a6a7a,0 0 12px rgba(255,255,255,.6)}
.tgp-L{left:14px}.tgp-R{right:14px}
.tgp-hide{display:none!important}
@media (max-height:700px){.tgp-base{width:96px;height:96px}.tgp-face{width:132px;height:132px}.tgp-face .tgp-b{width:46px;height:46px}.tgp-A,.tgp-Y{top:43px}.tgp-B,.tgp-X{left:43px}.tgp-sh{height:28px;bottom:calc(144px + env(safe-area-inset-bottom))}}`;
 function shadeHex(c,k){const n=parseInt(c.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const f=x=>Math.max(0,Math.min(255,Math.round(k<0?x*(1+k):x+(255-x)*k)));return `rgb(${f(r)},${f(g)},${f(b)})`;}
 let root=null,knob=null,base=null,stickId=null,opts={};const els={};
 function setBtn(b,src,v){if(!!st[src][b]===v)return;st[src][b]=v;}
 function isDown(b){return !!(st.touch[b]||st.key[b]||st.gp[b]);}
 function sync(){for(const b of BTN){const d=isDown(b);if(d!==!!prev[b]){prev[b]=d;if(d){edgeDown[b]=true;if(navigator.vibrate&&opts.vibrate!==false)try{navigator.vibrate(8);}catch(e){}}else edgeUp[b]=true;(cbs[b]||[]).forEach(f=>{try{f(d);}catch(e){}});if(els[b])els[b].classList.toggle('on',d);}}
  const s=[stick.touch,stick.gp,stick.key].find(v=>Math.hypot(v.x,v.y)>0.01)||{x:0,y:0};stick.x=s.x;stick.y=s.y;}
 function mount(sel,o){opts=o||{};const host=typeof sel==='string'?document.querySelector(sel):sel;if(!host)return;
  if(!document.getElementById('tgp-css')){const s=document.createElement('style');s.id='tgp-css';s.textContent=css;document.head.appendChild(s);}
  const lb=Object.assign({A:'',B:'',X:'',Y:'',L:'',R:''},opts.labels||{});const hide=new Set(opts.hide||[]);
  root=document.createElement('div');root.className='tgp';
  root.innerHTML=`<div class="tgp-zone"></div><div class="tgp-base"><div class="tgp-knob"></div></div><div class="tgp-face">${['X','Y','A','B'].map(b=>`<div class="tgp-b tgp-${b}" data-b="${b}"><b>${b}</b>${lb[b]?`<small>${lb[b]}</small>`:''}</div>`).join('')}</div>${['L','R'].map(b=>`<div class="tgp-sh tgp-${b}" data-b="${b}"><b>${b}</b>${lb[b]?`<small>${lb[b]}</small>`:''}</div>`).join('')}`;
  host.innerHTML='';host.appendChild(root);knob=root.querySelector('.tgp-knob');base=root.querySelector('.tgp-base');
  root.querySelectorAll('[data-b]').forEach(el=>{const b=el.dataset.b;els[b]=el;if(hide.has(b))el.classList.add('tgp-hide');
   const c=COL[b];el.style.setProperty('--c',c);el.style.setProperty('--hl',shadeHex(c,.45));el.style.setProperty('--dk',shadeHex(c,-.35));el.style.setProperty('--sh',shadeHex(c,-.6));
   const ids=new Set();
   el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();try{el.setPointerCapture(e.pointerId);}catch(_){}ids.add(e.pointerId);setBtn(b,'touch',true);sync();});
   const up=e=>{ids.delete(e.pointerId);if(!ids.size){setBtn(b,'touch',false);sync();}};
   el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);});
  const zone=root.querySelector('.tgp-zone');
  const move=e=>{const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2-8;let dx=e.clientX-cx,dy=e.clientY-cy;const m=Math.hypot(dx,dy);if(m>R){dx*=R/m;dy*=R/m;}
   knob.style.transform=`translate(${dx}px,${dy}px)`;let x=dx/R,y=dy/R;const mm=Math.hypot(x,y),dz=opts.deadzone==null?.18:opts.deadzone;if(mm<dz){x=0;y=0;}else{const k=(mm-dz)/(1-dz)/mm;x*=k;y*=k;}stick.touch.x=x;stick.touch.y=y;sync();};
  const start=e=>{if(stickId!==null)return;e.preventDefault();stickId=e.pointerId;try{e.target.setPointerCapture(e.pointerId);}catch(_){}knob.classList.add('on');move(e);};
  const end=e=>{if(e.pointerId!==stickId)return;stickId=null;knob.style.transform='';knob.classList.remove('on');stick.touch.x=stick.touch.y=0;sync();};
  for(const t of [zone,base]){t.addEventListener('pointerdown',start);t.addEventListener('pointermove',e=>{if(e.pointerId===stickId)move(e);});t.addEventListener('pointerup',end);t.addEventListener('pointercancel',end);t.addEventListener('lostpointercapture',end);}
  return api;}
 // キーボード
 const kd={};
 function keyStick(){let x=0,y=0;if(kd.ArrowLeft||kd.a||kd.A)x-=1;if(kd.ArrowRight||kd.d||kd.D)x+=1;if(kd.ArrowUp||kd.w||kd.W)y-=1;if(kd.ArrowDown||kd.s||kd.S)y+=1;const m=Math.hypot(x,y)||1;stick.key.x=x/m;stick.key.y=y/m;}
 addEventListener('keydown',e=>{if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName))return;kd[e.key]=true;if(KEYS[e.key]){setBtn(KEYS[e.key],'key',true);}keyStick();sync();if(KEYS[e.key]||/^Arrow/.test(e.key))e.preventDefault();});
 addEventListener('keyup',e=>{kd[e.key]=false;if(KEYS[e.key])setBtn(KEYS[e.key],'key',false);keyStick();sync();});
 addEventListener('blur',()=>{for(const k in kd)kd[k]=false;for(const b of BTN)st.key[b]=false;keyStick();sync();});
 // ゲームパッド
 function pollGP(){const pads=navigator.getGamepads?navigator.getGamepads():[];let p=null;for(const g of pads)if(g&&g.connected){p=g;break;}
  if(p){const pr=i=>!!(p.buttons[i]&&p.buttons[i].pressed);for(const b of BTN){const m=GP[b];st.gp[b]=Array.isArray(m)?m.some(pr):pr(m);}
   let x=p.axes[0]||0,y=p.axes[1]||0;if(pr(14))x=-1;if(pr(15))x=1;if(pr(12))y=-1;if(pr(13))y=1;const m=Math.hypot(x,y);if(m<.2){x=0;y=0;}else if(m>1){x/=m;y/=m;}stick.gp.x=x;stick.gp.y=y;sync();}
  requestAnimationFrame(pollGP);}
 requestAnimationFrame(pollGP);
 const api={mount,stick,BTN,
  down:b=>isDown(b),
  pressed:b=>{const v=!!edgeDown[b];edgeDown[b]=false;return v;},
  released:b=>{const v=!!edgeUp[b];edgeUp[b]=false;return v;},
  on:(b,f)=>{(cbs[b]=cbs[b]||[]).push(f);},
  label:(b,s)=>{const el=els[b];if(!el)return;let sm=el.querySelector('small');if(!s){if(sm)sm.remove();return;}if(!sm){sm=document.createElement('small');el.appendChild(sm);}sm.textContent=s;},
  show:(b,v)=>{if(els[b])els[b].classList.toggle('tgp-hide',!v);},
  dir8:()=>{const m=Math.hypot(stick.x,stick.y);if(m<.3)return -1;return Math.round(((Math.atan2(stick.y,stick.x)+Math.PI*2)%(Math.PI*2))/(Math.PI/4))%8;},
  reset:()=>{for(const s of ['touch','key','gp'])for(const b of BTN)st[s][b]=false;stick.touch.x=stick.touch.y=0;sync();}};
 window.TGPad=api;})();
