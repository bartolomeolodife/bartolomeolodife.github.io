// Ingrandimento delle immagini e trascinamento della timeline.
(function(){
  var L = {it:['Immagine ingrandita','Chiudi'], en:['Enlarged image','Close'], fr:['Image agrandie','Fermer']}[document.documentElement.lang] || ['Immagine ingrandita','Chiudi'];
  var lb = document.createElement('div'); lb.className = 'lb'; lb.setAttribute('role','dialog'); lb.setAttribute('aria-modal','true'); lb.setAttribute('aria-label',L[0]);
  lb.innerHTML = '<button type="button">'+L[1]+'</button><img alt="">';
  document.body.appendChild(lb);
  var big = lb.querySelector('img'), last = null;
  function close(){ lb.classList.remove('on'); big.removeAttribute('src'); if(last) last.focus(); }
  lb.addEventListener('click', close);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && lb.classList.contains('on')) close(); });
  document.addEventListener('click', function(e){
    var img = e.target.closest('.gallery img, .zoom');
    if(!img) return;
    last = img; big.src = img.dataset.full || img.currentSrc || img.src; big.alt = img.alt || '';
    lb.classList.add('on'); lb.querySelector('button').focus();
  });

  Array.prototype.forEach.call(document.querySelectorAll('.strip'), function(s){
    var down = false, x0 = 0, s0 = 0, moved = false;
    s.addEventListener('pointerdown', function(e){ down = true; moved = false; x0 = e.clientX; s0 = s.scrollLeft; });
    window.addEventListener('pointerup', function(){ down = false; });
    s.addEventListener('pointermove', function(e){ if(!down) return; var d = e.clientX - x0; if(Math.abs(d) > 4) moved = true; s.scrollLeft = s0 - d; });
    s.addEventListener('click', function(e){ if(moved){ e.stopPropagation(); e.preventDefault(); } }, true);
    var pos = document.getElementById(s.id + '-pos');
    if(pos){ s.addEventListener('scroll', function(){ var p = s.scrollLeft / Math.max(1, s.scrollWidth - s.clientWidth); pos.textContent = Math.round(p*100) + '%'; }); }
  });
})();

/* Cursore: un punto tipografico che si ingrandisce al clic (solo con mouse) */
(function(){
  if(!window.matchMedia || !matchMedia('(pointer:fine)').matches) return;
  var d = document.createElement('div'); d.className = 'dot'; d.setAttribute('aria-hidden','true');
  document.body.appendChild(d); document.documentElement.classList.add('dotcursor');
  var x = -100, y = -100, raf = 0;
  function draw(){ raf = 0; d.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
  document.addEventListener('mousemove', function(e){
    x = e.clientX; y = e.clientY; d.classList.add('on');
    var t = e.target.closest && e.target.closest('a,button,[role=button],label,select,.zoom,.gallery img,input[type=range]');
    d.classList.toggle('link', !!t);
    if(!raf) raf = requestAnimationFrame(draw);
  }, {passive:true});
  document.addEventListener('mousedown', function(){ d.classList.add('down'); });
  document.addEventListener('mouseup', function(){ d.classList.remove('down'); });
  document.addEventListener('mouseleave', function(){ d.classList.remove('on'); });
  window.addEventListener('blur', function(){ d.classList.remove('on','down'); });
})();

/* Barra di scorrimento della pagina: una lineetta tipografica verticale */
(function(){
  var t = document.createElement('div'); t.className = 'vdash-track'; t.setAttribute('aria-hidden','true');
  var d = document.createElement('span'); d.className = 'vdash'; t.appendChild(d); document.body.appendChild(t);
  document.documentElement.classList.add('vdash-on');
  var raf = 0;
  function upd(){ raf = 0;
    var se = document.scrollingElement || document.documentElement, max = se.scrollHeight - window.innerHeight;
    t.style.display = max > 4 ? '' : 'none'; if(max <= 4) return;
    var p = Math.min(1, Math.max(0, se.scrollTop / max));
    d.style.transform = 'translateY(' + (p * (t.clientHeight - d.offsetHeight)).toFixed(1) + 'px)';
  }
  function q(){ if(!raf) raf = requestAnimationFrame(upd); }
  window.addEventListener('scroll', q, {passive:true}); window.addEventListener('resize', q); window.addEventListener('load', q);
  if(window.ResizeObserver) new ResizeObserver(q).observe(document.body);
  upd();
})();

/* Telefono: la sezione al centro dello schermo si accende (Percorso, Come lavoro) */
(function(){
  var secs=[].slice.call(document.querySelectorAll('.cvsec, .come > section.block'));
  if(!secs.length||!matchMedia('(hover:none),(pointer:coarse)').matches)return;
  var cur=null,raf=0;
  function pick(){
    raf=0;var mid=innerHeight*0.5,best=null,bd=1e9;
    secs.forEach(function(s){var r=s.getBoundingClientRect();
      var d=(r.top<=mid&&r.bottom>=mid)?0:Math.min(Math.abs(r.top-mid),Math.abs(r.bottom-mid));
      if(d<bd){bd=d;best=s}});
    if(scrollY<60)best=secs[0];
    if(scrollY+innerHeight>=document.documentElement.scrollHeight-24&&secs[secs.length-1].getBoundingClientRect().bottom>0&&best===secs[secs.length-2])best=secs[secs.length-1];
    if(best!==cur){if(cur)cur.classList.remove('on');if(best)best.classList.add('on');cur=best;lock=Date.now()+520;setTimeout(q,540)}
  }
  var lock=0;
  function q(){if(Date.now()<lock)return;if(!raf)raf=requestAnimationFrame(pick)}
  addEventListener('scroll',q,{passive:true});addEventListener('resize',q);
  secs.forEach(function(s){s.addEventListener('click',function(){if(cur)cur.classList.remove('on');s.classList.add('on');cur=s})});
  q();
})();

/* Come lavoro su telefono: le competenze si accendono una dopo l'altra */
(function(){
  var sp=document.querySelector('.come .specimen-text');
  if(!sp||!matchMedia('(hover:none),(pointer:coarse)').matches)return;
  var w=[].slice.call(sp.querySelectorAll('a')),done=false;
  sp.classList.add('reveal');
  function go(){if(done)return;var r=sp.getBoundingClientRect();if(r.top>innerHeight*0.9||r.bottom<0)return;done=true;
    w.forEach(function(a,i){setTimeout(function(){a.classList.add('in')},250+i*90)})}
  addEventListener('scroll',go,{passive:true});go();
})();

/* Comparsa dei contenuti: al caricamento e mentre si scorre */
(function(){
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var sel='main h1, main h2, main h3, main p, main figure, main .list > *, main .eyebrow, main .yr, main .specimen, main .specimen-meta, main .tr-hero, main .expo, main .credits, main .statua-img figure, main .cards > *, main .gallery > *, main .strip, main .tavola';
  var picked=[],set=new Set();
  [].forEach.call(document.querySelectorAll(sel),function(el){
    if(el.closest('#prow, .lb, [data-no-rv]'))return;
    if(el.querySelector('canvas')||el.closest('canvas'))return;
    if(!el.getClientRects().length)return;
    for(var a=el.parentElement;a;a=a.parentElement){if(set.has(a))return}
    set.add(el);picked.push(el);
  });
  var batch=0,bt=0;
  function done(el){el.classList.remove('rv','in');el.style.removeProperty('--d')}
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      var el=e.target;io.unobserve(el);
      el.style.setProperty('--d',Math.min(batch++*70,700)+'ms');
      clearTimeout(bt);bt=setTimeout(function(){batch=0},120);
      requestAnimationFrame(function(){el.classList.add('in')});
      setTimeout(function(){done(el)},1700);
    });
  },{rootMargin:'0px',threshold:0});
  picked.forEach(function(el){el.classList.add('rv');io.observe(el)});
  setTimeout(function(){picked.forEach(function(el){if(el.classList.contains('rv')&&!el.classList.contains('in')){var r=el.getBoundingClientRect();if(r.bottom<0)done(el)}})},2500);
})();

/* Strisce orizzontali (es. timeline del Trattato): lineetta tipografica al posto della barra */
(function(){
  [].forEach.call(document.querySelectorAll('.strip'),function(s){
    if(s.id==='prow')return;
    s.classList.add('strip-dash');s.style.paddingBottom='0';
    var t=document.createElement('div');t.className='dash-track';t.setAttribute('aria-hidden','true');
    var d=document.createElement('span');d.className='dash';t.appendChild(d);
    s.parentNode.insertBefore(t,s.nextSibling);
    function upd(){var m=s.scrollWidth-s.clientWidth;var p=m>0?s.scrollLeft/m:0;
      t.style.visibility=m>2?'visible':'hidden';
      d.style.transform='translateX('+(p*(t.clientWidth-d.offsetWidth)).toFixed(1)+'px)'}
    s.addEventListener('scroll',function(){requestAnimationFrame(upd)},{passive:true});
    addEventListener('resize',upd);addEventListener('load',upd);upd();
    function seek(e){var r=t.getBoundingClientRect(),x=(e.clientX-r.left-d.offsetWidth/2)/(r.width-d.offsetWidth);
      s.scrollLeft=Math.max(0,Math.min(1,x))*(s.scrollWidth-s.clientWidth)}
    var on=false;
    t.addEventListener('pointerdown',function(e){on=true;t.setPointerCapture(e.pointerId);seek(e)});
    t.addEventListener('pointermove',function(e){if(on)seek(e)});
    t.addEventListener('pointerup',function(){on=false});t.addEventListener('pointercancel',function(){on=false});
  });
})();

/* Bazar del Cashmere: manifesti che ruotano in 3D, consultabili uno alla volta */
(function(){
  var root=document.querySelector('.bz3d');if(!root)return;
  var still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items=[].slice.call(root.querySelectorAll('.bz-item'));
  var btns=[].slice.call(root.querySelectorAll('.bz-ctl button'));
  function view(v){
    btns.forEach(function(b){b.classList.toggle('on',b.dataset.v===String(v))});
    root.classList.toggle('solo',v!=='all');
    items.forEach(function(it){it.classList.toggle('on',it.dataset.i===String(v))});
    if(v!=='all'&&cards[v]){var s=cards[v];s.vy=0;s.goal=Math.round(s.ry/360)*360}
  }
  var cards=[];
  btns.forEach(function(b){b.addEventListener('click',function(){view(b.dataset.v)})});
  cards=items.map(function(it,k){
    var el=it.querySelector('.bz-card'),s={el:el,ry:0,rx:0,vy:0,drag:false,moved:0,ph:k*1.7};
    var lx=0,ly=0,lt=0;
    el.addEventListener('pointerdown',function(e){s.goal=null;s.drag=true;s.moved=0;lx=e.clientX;ly=e.clientY;lt=performance.now();s.vy=0;el.setPointerCapture(e.pointerId)});
    el.addEventListener('pointermove',function(e){if(!s.drag)return;var dx=e.clientX-lx,dy=e.clientY-ly,now=performance.now();
      s.moved+=Math.abs(dx)+Math.abs(dy);s.ry+=dx*0.45;s.rx=Math.max(-25,Math.min(25,s.rx-dy*0.25));
      s.vy=dx*0.45/Math.max(8,now-lt)*16;lx=e.clientX;ly=e.clientY;lt=now});
    function up(){if(!s.drag)return;s.drag=false;if(s.moved<6){view(root.classList.contains('solo')?'all':it.dataset.i)}}
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
    el.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){s.vy=-9}else if(e.key==='ArrowRight'){s.vy=9}else if(e.key==='Enter'||e.key===' '){e.preventDefault();view(root.classList.contains('solo')?'all':it.dataset.i)}});
    return s;
  });
  addEventListener('keydown',function(e){if(e.key==='Escape')view('all')});
  var t0=performance.now();
  (function loop(now){
    var t=(now-t0)/1000;
    cards.forEach(function(s){
      if(!s.drag){
        if(s.goal!=null){s.ry+=(s.goal-s.ry)*0.08;if(Math.abs(s.goal-s.ry)<0.3)s.goal=null}
        else{s.ry+=s.vy;s.vy*=0.94;}
        if(s.goal==null&&Math.abs(s.vy)<0.4){var tgt=Math.round(s.ry/360)*360;s.ry+=(tgt-s.ry)*0.05;s.vy=0}
        s.rx*=0.9;
      }
      var sway=(still||s.drag)?0:Math.sin(t*0.6+s.ph)*7, tilt=(still||s.drag)?0:Math.sin(t*0.45+s.ph)*2;
      s.el.style.transform='rotateX('+(s.rx+tilt).toFixed(2)+'deg) rotateY('+(s.ry+sway).toFixed(2)+'deg)';
    });
    requestAnimationFrame(loop);
  })(t0);
})();
