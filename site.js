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
