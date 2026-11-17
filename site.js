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

/* Percorso su telefono: apre la sezione che passa al centro dello schermo */
(function(){
  var secs=[].slice.call(document.querySelectorAll('.cvsec'));
  if(!secs.length||!matchMedia('(hover:none),(pointer:coarse)').matches)return;
  var cur=null,raf=0;
  function pick(){
    raf=0;var line=innerHeight*0.66,best=secs[0];
    secs.forEach(function(s){if(s.getBoundingClientRect().top<line)best=s});
    if(scrollY>40&&scrollY+innerHeight>=document.documentElement.scrollHeight-24)best=secs[secs.length-1];
    if(best!==cur){if(cur)cur.classList.remove('on');if(best)best.classList.add('on');cur=best;lock=Date.now()+520;setTimeout(q,540)}
  }
  var lock=0;
  function q(){if(Date.now()<lock)return;if(!raf)raf=requestAnimationFrame(pick)}
  addEventListener('scroll',q,{passive:true});addEventListener('resize',q);
  secs.forEach(function(s){s.addEventListener('click',function(){if(cur)cur.classList.remove('on');s.classList.add('on');cur=s})});
  q();
})();
