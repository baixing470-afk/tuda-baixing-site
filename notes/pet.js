(()=>{
 'use strict';
 const scriptURL=document.currentScript.src;
 const asset=name=>new URL('pet-'+name+'.webp',scriptURL).href;
 const profiles={rabbit1:{name:'兔大',tag:'蓝围巾 · 元气竖耳兔',motion:'hop'},rabbit2:{name:'兔二',tag:'蝴蝶结 · 温柔垂耳兔',motion:'sway'},turtle:{name:'小龟',tag:'薄荷甲壳 · 慢悠悠伙伴',motion:'nod'},dog:{name:'狗狗',tag:'蓝领巾 · 纯白小狗',motion:'wiggle'}};
 const lines=window.BAIXING_PET_LINES;
 let saved={};try{saved=JSON.parse(localStorage.getItem('baixing-companion-v3')||'{}')||{}}catch{}
 let type=profiles[saved.type]?saved.type:'rabbit1',position=null,compact=!!saved.compact,timer,animationTimer,drag=null,suppressClick=false,touchClickUntil=0;
 const counters=Object.fromEntries(Object.keys(profiles).map(k=>[k,0]));
 const root=document.createElement('aside');root.id='journal-companion';root.setAttribute('aria-label','笔记小伙伴');
 root.innerHTML=`<div class="jc-bubble" role="status" aria-live="polite" hidden></div>
 <button class="jc-character" type="button" aria-label="摸摸伙伴，听一句话"><img draggable="false" alt=""><img class="jc-next" draggable="false" alt="" aria-hidden="true"><span class="jc-hearts" aria-hidden="true">♡ ✧ ♡</span></button>
 <div class="jc-controls"><button class="jc-switch" type="button" aria-expanded="false" aria-controls="jc-picker" aria-label="选择宠物" title="选择宠物"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="2"/><rect x="14" y="4" width="6" height="6" rx="2"/><rect x="4" y="14" width="6" height="6" rx="2"/><rect x="14" y="14" width="6" height="6" rx="2"/></svg></button><button class="jc-minimize" type="button" aria-label="收起宠物" title="收起宠物">−</button></div>
 <button class="jc-restore" type="button" hidden aria-label="展开宠物"><span aria-hidden="true">✧</span></button>
 <section id="jc-picker" class="jc-picker" hidden aria-label="选择小伙伴"><div class="jc-panel-head"><div><strong>换个小伙伴</strong><p>点头像选择，轻点宠物听它说话</p></div><button class="jc-close" type="button" aria-label="关闭选择框">×</button></div><div class="jc-options"></div><div class="jc-panel-foot">按住宠物可拖动 · 选择与位置保存在此设备</div></section>`;
 document.body.append(root);
 const button=root.querySelector('.jc-character'),picture=button.querySelector('img'),bubble=root.querySelector('.jc-bubble'),picker=root.querySelector('.jc-picker'),toggle=root.querySelector('.jc-switch');
 function persist(){try{localStorage.setItem('baixing-companion-v3',JSON.stringify({type,compact,position}))}catch{}}
 function keepInView(){const width=compact?104:152,height=compact?42:196;const maxX=Math.max(8,innerWidth-width-8),maxY=Math.max(8,innerHeight-height-8);const x=position?.x??maxX-12,y=position?.y??maxY-8;position={x:Math.max(8,Math.min(maxX,x)),y:Math.max(8,Math.min(maxY,y))};root.style.left=position.x+'px';root.style.top=position.y+'px';root.classList.toggle('jc-near-left',position.x<180);root.classList.toggle('jc-near-top',position.y<105);if(!picker.hidden)placePicker()}
 function placePicker(){const width=Math.min(320,innerWidth-24);picker.style.width=width+'px';picker.style.left=Math.max(12,Math.min(innerWidth-width-12,position.x+152-width))+'px';const height=picker.offsetHeight;const above=position.y-height-10;picker.style.top=Math.max(12,Math.min(innerHeight-height-12,above>=12?above:position.y+36))+'px'}
 function menu(open){picker.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open){bubble.hidden=true;placePicker()} }
 const next=button.querySelector('.jc-next');
 let poseTimer,idleTimer,swapToken=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const preloads=[];for(const key of Object.keys(profiles))for(const pose of ['','-happy','-love','-sleep']){const im=new Image();im.src=asset(key+pose);preloads.push(im)}
 function resetPose(){clearTimeout(poseTimer);clearTimeout(idleTimer);swapToken++;next.style.opacity='0';picture.style.opacity='1';root.dataset.pose='neutral';root.dataset.motion='';scheduleIdle()}
 function scheduleIdle(){clearTimeout(idleTimer);if(!compact&&!root.hidden&&!document.hidden)idleTimer=setTimeout(()=>{setPose('sleep');root.dataset.motion='';},24000)}
 async function setPose(pose){const token=++swapToken,url=asset(type+(pose==='neutral'?'':'-'+pose));const im=new Image();im.src=url;try{await im.decode()}catch{return}if(token!==swapToken)return;next.src=url;next.style.opacity='1';picture.style.opacity='0';root.dataset.pose=pose;setTimeout(()=>{if(token!==swapToken)return;picture.src=url;picture.style.opacity='1';next.style.opacity='0'},reduced.matches?0:160)}
 function react(){clearTimeout(poseTimer);clearTimeout(idleTimer);const pose=counters[type]%2?'happy':'love';setPose(pose);root.dataset.motion='';void button.offsetWidth;root.dataset.motion=pose==='love'?'affection':profiles[type].motion;poseTimer=setTimeout(()=>{setPose('neutral');root.dataset.motion='';scheduleIdle()},2200)}
 function show(){clearTimeout(timer);menu(false);const list=lines[type];bubble.textContent=list[counters[type]++%list.length];bubble.hidden=false;react();timer=setTimeout(()=>{bubble.hidden=true},6500)}
 button.addEventListener('pointerenter',()=>{if(root.dataset.pose==='sleep'){setPose('neutral');scheduleIdle()}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(idleTimer);clearTimeout(poseTimer);root.dataset.motion=''}else{setPose('neutral');scheduleIdle()}});
 function render(){picture.src=asset(type);picture.alt=profiles[type].tag;resetPose();button.setAttribute('aria-label','摸摸'+profiles[type].name+'，听一句话');root.dataset.pet=type;root.querySelectorAll('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.choice===type)))}
 for(const [key,p]of Object.entries(profiles)){const b=document.createElement('button');b.type='button';b.dataset.choice=key;b.innerHTML=`<img src="${asset(key)}" alt="" draggable="false"><strong>${p.name}</strong><span>${p.tag.split(' · ')[0]}</span>`;b.onclick=e=>{type=key;render();persist();show();if(e.detail===0)button.focus({preventScroll:true})};root.querySelector('.jc-options').append(b)}
 toggle.onclick=()=>menu(picker.hidden);root.querySelector('.jc-close').onclick=()=>{menu(false);toggle.focus()};
 button.onclick=event=>{if(event.detail>0&&Date.now()<touchClickUntil)return;if(suppressClick){suppressClick=false;return}show()};
 function setCompact(value){compact=value;resetPose();root.classList.toggle('jc-compact',compact);root.querySelector('.jc-restore').hidden=!compact;button.hidden=compact;root.querySelector('.jc-controls').hidden=compact;menu(false);bubble.hidden=true;keepInView();persist()}
 root.querySelector('.jc-minimize').onclick=()=>setCompact(true);root.querySelector('.jc-restore').onclick=()=>setCompact(false);
 button.addEventListener('pointerdown',event=>{if(event.button!==0||drag)return;suppressClick=false;drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:position.x,top:position.y,moved:false};button.setPointerCapture(event.pointerId)});
 button.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<7)return;drag.moved=true;root.classList.add('jc-dragging');clearTimeout(poseTimer);clearTimeout(idleTimer);root.dataset.motion='';menu(false);bubble.hidden=true;position={x:drag.left+dx,y:drag.top+dy};keepInView()});
 function finishDrag(event){if(!drag||event.pointerId!==drag.id)return;const tapped=!drag.moved&&event.type==='pointerup';suppressClick=drag.moved;drag=null;root.classList.remove('jc-dragging');if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);if(tapped&&event.pointerType==='touch'){touchClickUntil=Date.now()+700;show()}scheduleIdle();persist()}
 button.addEventListener('pointerup',finishDrag);button.addEventListener('pointercancel',finishDrag);button.addEventListener('lostpointercapture',()=>{drag=null;root.classList.remove('jc-dragging')});button.addEventListener('dragstart',event=>event.preventDefault());
 document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))menu(false)});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!picker.hidden){menu(false);toggle.focus()}});
 const modalObserver=new MutationObserver(()=>{root.hidden=!!document.querySelector('dialog[open]');if(root.hidden){resetPose();menu(false);bubble.hidden=true}else{setPose("neutral");scheduleIdle()}});document.querySelectorAll('dialog').forEach(d=>modalObserver.observe(d,{attributes:true,attributeFilter:['open']}));
 window.addEventListener('resize',()=>{keepInView();persist()});
 if(Number.isFinite(saved.position?.x)&&Number.isFinite(saved.position?.y))position=saved.position;
 render();setCompact(compact);
})();
