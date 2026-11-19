/* Trattato del ribelle — libro e catalogo in 3D.
   Insieme: impilati come nelle foto, si girano insieme. Clic: si separano e si girano uno per uno.
   Clic su un volume: si apre e si sfoglia come carta. */
(function () {
  var host = document.getElementById('libro3d');
  if (!host || !window.THREE) return;
  var T3 = THREE, D = host.dataset;
  var W = 2.30, H = 3.10;                                   // formato 230 × 310 mm (in dm)
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer: coarse)').matches;
  function lin(hex) { return new T3.Color(hex).convertSRGBToLinear(); }

  /* ---------- scena condivisa ---------- */
  var renderer = new T3.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = T3.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T3.PCFSoftShadowMap;
  host.insertBefore(renderer.domElement, host.firstChild);
  var scene = new T3.Scene();
  var camera = new T3.PerspectiveCamera(28, 1, 0.1, 80);
  scene.add(new T3.HemisphereLight(0xffffff, 0xe6e4e0, 0.6));
  var sun = new T3.DirectionalLight(0xffffff, 0.42);
  sun.position.set(-2.2, 6, 3.2); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 16;
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.004; sun.shadow.radius = 6;
  scene.add(sun);
  var fill = new T3.DirectionalLight(0xffffff, 0.12); fill.position.set(3, 2, -2); scene.add(fill);
  var ground = new T3.Mesh(new T3.PlaneGeometry(40, 40), new T3.ShadowMaterial({ opacity: 0.1, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  var stackGroup = new T3.Group(); scene.add(stackGroup);

  var imgLoader = new T3.ImageLoader(), cache = {}, maxAniso = renderer.capabilities.getMaxAnisotropy(), dirty = true, onTexReady = [];
  function mkTex(mirror) {
    var t = new T3.Texture(); t.encoding = T3.sRGBEncoding; t.anisotropy = maxAniso; t._ready = false;
    t.generateMipmaps = true; t.minFilter = T3.LinearMipmapLinearFilter;
    if (mirror) { t.wrapS = T3.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
    return t;
  }
  function tex(url, mirror) {                       // una sola immagine per la versione normale e quella specchiata
    var e = cache[url];
    if (!e) {
      e = cache[url] = { a: mkTex(false), m: mkTex(true) };
      imgLoader.load(url, function (img) {
        [e.a, e.m].forEach(function (t) { t.image = img; t.needsUpdate = true; t._ready = true; });
        dirty = true; onTexReady.forEach(function (f) { f(); });
      });
    }
    return mirror ? e.m : e.a;
  }
  function ready(t) { return !t || t._ready; }
  // pagine in alta definizione quando si ingrandisce: si caricano solo quelle in vista, le più vecchie si liberano
  var hdOn = false, hdList = [];
  function pageTex(url, mirror) {
    if (hdOn && /\/\d{3}\.webp$/.test(url)) {
      var hu = url.replace(/(\d{3}\.webp)$/, 'hd/$1'), had = !!cache[hu], t = tex(hu, mirror);
      if (!had) { hdList.push(hu); while (hdList.length > 12) { var o = hdList.shift(), e = cache[o]; if (e) { e.a.dispose(); e.m.dispose(); delete cache[o]; } } }
      if (t._ready) return t;
    }
    return tex(url, mirror);
  }
  function edgeTexture(r, g0, b) {
    var c = document.createElement('canvas'); c.width = 4; c.height = 512;
    var g = c.getContext('2d');
    for (var y = 0; y < 512; y++) { var v = ((y * 7919) % 11) - (y % 2 ? 9 : 0); g.fillStyle = 'rgb(' + (r + v) + ',' + (g0 + v) + ',' + (b + v) + ')'; g.fillRect(0, y, 4, 1); }
    var t = new T3.CanvasTexture(c); t.wrapS = t.wrapT = T3.RepeatWrapping; t.encoding = T3.sRGBEncoding; return t;
  }

  /* ---------- un volume ---------- */
  function Book(cfg) {
    var me = this, W = cfg.w || 2.30, H = cfg.h || 3.10;
    var NP = cfg.pages, NL = NP / 2 + 1, LEAF = cfg.leaf, COV = cfg.cov, BLOCK = (NL - 1) * LEAF, SIGS = cfg.sigs;
    var PAPER = lin(cfg.paper), EDGE = lin(cfg.edge), THREAD = lin(cfg.thread);
    this.cfg = cfg; this.T = BLOCK + 2 * COV; this.NL = NL; this.W = W; this.H = H;
    this.root = new T3.Group(); this.pivot = new T3.Group(); this.geo = new T3.Group();
    this.root.add(this.pivot); this.pivot.add(this.geo);
    var book = this.geo;
    function pageName(p) { return cfg.base + ('00' + p).slice(-3) + '.webp'; }
    function rectoOf(l) { return l === 0 ? cfg.base + cfg.cover : (l <= NP / 2 ? pageName(2 * l - 1) : null); }
    function versoOf(l) { return l === 0 ? null : (l <= NP / 2 ? pageName(2 * l) : null); }
    function matte(o) { o.specular = 0x000000; o.shininess = 0; return new T3.MeshPhongMaterial(o); }   // carta opaca, luce calcolata per pixel: niente bande sul foglio curvo
    function matPaper(side) { return new T3.MeshLambertMaterial({ color: PAPER, side: side || T3.FrontSide }); }
    var WHITE = new T3.Color(0xffffff);
    function setMap(m, t) { if (t && !ready(t)) return; var w = t || null; if (m.map !== w) { m.map = w; m.needsUpdate = true; } m.color.copy(w ? WHITE : PAPER); }

    /* pile curve vicino al dorso */
    var Y0 = 0.0035, CURL = 0.2, CURVE = 0, NXS = 40, curH = { l: 0, r: 0 };
    function g(s) { return s >= CURL ? 1 : 1 - Math.pow(1 - s / CURL, 2.2); }
    function gp(s) { return s >= CURL ? 0 : 2.2 * Math.pow(1 - s / CURL, 1.2) / CURL; }
    function topY(s, h) { var lo = Math.min(Y0, h); return h - CURVE * (h - lo) * (1 - g(s)); }
    function slope(s, h) { var lo = Math.min(Y0, h); return Math.atan(CURVE * (h - lo) * gp(s) / W); }
    function ao(s) { return 1 - CURVE * 0.22 * Math.pow(Math.max(0, 1 - s / 0.14), 2); }
    function sAt(i) { return Math.pow(i / NXS, 1.7); }
    var WR = 0.74, WG = 0.9, WB = 1.24;                 // l'ombra nella piega è calda, come nelle foto
    var ec = new T3.Color(cfg.edge); var er = Math.round(ec.r * 255), eg = Math.round(ec.g * 255), eb = Math.round(ec.b * 255);
    function Stack(side) {
      this.side = side;
      this.edgeTex = edgeTexture(er, eg, eb);
      this.mTop = matte({ color: PAPER, vertexColors: true });
      this.mEdge = new T3.MeshLambertMaterial({ color: 0xffffff, map: this.edgeTex });
      this.mTop.shadowSide = this.mEdge.shadowSide = T3.DoubleSide;
      this.mesh = new T3.Mesh(new T3.BufferGeometry(), [this.mTop, this.mEdge]);
      this.mesh.castShadow = true; this.mesh.receiveShadow = true;
      this.bottom = new T3.Mesh(new T3.PlaneGeometry(W, H), matPaper(T3.BackSide));
      this.bottom.material.shadowSide = T3.DoubleSide;
      this.bottom.rotation.x = -Math.PI / 2; this.bottom.receiveShadow = true; this.bottom.castShadow = true;
      this.h = -1; this.c = -1;
      book.add(this.mesh, this.bottom);
    }
    Stack.prototype.build = function (h) {
      var sd = this.side, pos = [], uv = [], col = [], idx = [], n = 0, top;
      function v(x, y, z, a, b, c) { pos.push(x, y, z); uv.push(a, b); var d = 1 - c; col.push(1 - d * WR, 1 - d * WG, 1 - d * WB); return n++; }
      var rows = [];
      for (var i = 0; i <= NXS; i++) {
        var s = sAt(i), x = sd * s * W, y = topY(s, h), u = sd > 0 ? s : 1 - s;
        rows.push([v(x, y, -H / 2, u, 1, ao(s)), v(x, y, H / 2, u, 0, ao(s))]);
      }
      for (i = 0; i < NXS; i++) { var a = rows[i], b = rows[i + 1]; if (sd > 0) idx.push(a[0], a[1], b[0], b[0], a[1], b[1]); else idx.push(a[0], b[0], a[1], b[0], b[1], a[1]); }
      top = idx.length;
      [-1, 1].forEach(function (zs) {
        var z = zs * H / 2, prev = null;
        for (var i = 0; i <= NXS; i++) {
          var s = sAt(i), x = sd * s * W, y = topY(s, h);
          var p = [v(x, 0, z, s * 2, 0, 1), v(x, y, z, s * 2, y * 50, 1)];
          if (prev) { if ((zs > 0) === (sd > 0)) idx.push(prev[0], p[0], prev[1], p[0], p[1], prev[1]); else idx.push(prev[0], prev[1], p[0], p[0], prev[1], p[1]); }
          prev = p;
        }
      });
      var xe = sd * W, ye = topY(1, h), q = [v(xe, 0, -H / 2, 0, 0, 1), v(xe, ye, -H / 2, 0, ye * 50, 1), v(xe, 0, H / 2, 6, 0, 1), v(xe, ye, H / 2, 6, ye * 50, 1)];
      if (sd > 0) idx.push(q[0], q[1], q[2], q[2], q[1], q[3]); else idx.push(q[0], q[2], q[1], q[2], q[3], q[1]);
      var geo = new T3.BufferGeometry();
      geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2));
      geo.setAttribute('color', new T3.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
      geo.addGroup(0, top, 0); geo.addGroup(top, idx.length - top, 1); geo.computeVertexNormals();
      this.mesh.geometry.dispose(); this.mesh.geometry = geo;
    };
    Stack.prototype.set = function (h, topTex, botTex) {
      if (Math.abs(h - this.h) > 1e-7 || this.c !== CURVE) { this.build(Math.max(h, 0.0001)); this.h = h; this.c = CURVE; }
      this.bottom.position.set(this.side * W / 2, -0.0004, 0);
      setMap(this.mTop, topTex);
      setMap(this.bottom.material, botTex);
      var vis = h > 0.00005; this.mesh.visible = this.bottom.visible = vis;
    };
    var R = new Stack(1), Lft = new Stack(-1);

    /* dorso a vista: segnature e filo */
    var spine = new T3.Group(); book.add(spine);
    function halfTube(r, y0) {
      var segA = 14, pos = [], nor = [], uv = [], idx = [];
      for (var j = 0; j <= 1; j++) for (var i = 0; i <= segA; i++) {
        var a = Math.PI / 2 + Math.PI * i / segA, z = -H / 2 + H * j;
        pos.push(r * Math.cos(a) * 1.15, y0 + r * Math.sin(a), z); nor.push(Math.cos(a), Math.sin(a), 0); uv.push(i / segA, j);
      }
      for (i = 0; i < segA; i++) { var a0 = i, b0 = a0 + segA + 1; idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1); }
      var gg = new T3.BufferGeometry();
      gg.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); gg.setAttribute('normal', new T3.Float32BufferAttribute(nor, 3));
      gg.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); gg.setIndex(idx); return gg;
    }
    var knotGeo = new T3.SphereGeometry(1, 8, 6);
    (function () {
      var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      if (cfg.wrap) {
        // catalogo: il dorso è coperto, bianco e pulito come nelle foto
        var Rw = (BLOCK + 2 * COV) / 2, wm = matte({ color: lin(cfg.wrap), side: T3.DoubleSide });
        var w = new T3.Mesh(halfTube(Rw, Rw), wm); w.scale.set(0.42 / 1.15, 1, 1); w.castShadow = true; spine.add(w);
        return;
      }
      // libro: segnature cucite a vista, ognuna una piega tonda con il solco d'ombra tra l'una e l'altra
      var sh = BLOCK / SIGS, bands = [{ y: COV / 2 + 0.0004, r: COV / 2 + 0.0006, c: true }];
      for (var s = 0; s < SIGS; s++) bands.push({ y: COV + sh * (s + 0.5), r: sh / 2 * 0.97, dx: (rnd() - 0.5) * sh * 0.25 });
      bands.push({ y: COV + BLOCK + COV / 2 - 0.0004, r: COV / 2 + 0.0006, c: true });
      // fondo pieno dietro le segnature: il dorso non lascia mai vedere le pagine
      var bk = new T3.Mesh(new T3.PlaneGeometry(H * 0.999, BLOCK + 2 * COV - 0.0004), matte({ color: new T3.Color(EDGE).multiplyScalar(0.7), side: T3.DoubleSide }));
      bk.rotation.y = -Math.PI / 2; bk.position.set(-0.0012, (BLOCK + 2 * COV) / 2, 0); spine.add(bk);
      bands.forEach(function (b) {
        var g = halfTube(b.r, b.y), nr = g.attributes.normal, cc = new Float32Array(nr.count * 3);
        for (var q = 0; q < nr.count; q++) { var nx = -nr.getX(q), k = 0.62 + 0.38 * Math.pow(Math.max(0, nx), 0.8), d = 1 - k; cc[q*3] = 1 - d * 0.8; cc[q*3+1] = 1 - d * 0.92; cc[q*3+2] = 1 - d * 1.15; }
        g.setAttribute('color', new T3.BufferAttribute(cc, 3));
        var mm = new T3.Mesh(g, matte({ color: b.c ? PAPER : EDGE, vertexColors: true, side: T3.DoubleSide })); mm.position.x = b.dx || 0; mm.castShadow = true; spine.add(mm);
      });
      // il filo: a ogni stazione una catenella che lega ogni segnatura alla successiva
      var tm = matte({ color: THREAD }), K = cfg.stations, tr = cfg.threadR || 0.0016;
      for (var k = 0; k < K; k++) {
        var z0 = -H / 2 + 0.16 + (H - 0.32) * k / (K - 1);
        for (var i = 0; i < bands.length - 1; i++) {
          var A = bands[i], B = bands[i + 1], xa = -A.r * 1.15 + (A.dx || 0), xb = -B.r * 1.15 + (B.dx || 0), dz = 0.012 * (i % 2 ? 1 : -1);
          var pts = [new T3.Vector3(xa * 0.7, A.y, z0 - dz), new T3.Vector3(Math.min(xa, xb) - tr * 1.6, (A.y + B.y) / 2, z0), new T3.Vector3(xb * 0.7, B.y, z0 + dz)];
          spine.add(new T3.Mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3(pts), 10, tr, 5, false), tm));
        }
      }
    })();
    /* copertina aperta: nella piega si vede il dorso cucito — le segnature come bastoncini tondi,
       separate da solchi scuri, il filo bianco che le attraversa a ogni stazione con i nodi sfilacciati */
    var RR = cfg.rod, MG = RR * 0.3, G = SIGS * 2 * RR + 2 * MG, rods = new T3.Group(); book.add(rods); rods.visible = false;
    (function () {
      var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      var FL = 0.62, RV = RR * 0.87, TOP = 2 * RV * FL;
      var under = new T3.Mesh(new T3.PlaneGeometry(G + RR * 0.6, H * 0.992), new T3.MeshBasicMaterial({ color: lin(cfg.groove || '#5c5549') }));
      under.rotation.x = -Math.PI / 2; under.position.set(-G / 2, 0.0002, 0); rods.add(under);
      var cyl = new T3.CylinderGeometry(RV, RV, H * 0.985, 22, 1, true); cyl.rotateX(Math.PI / 2); cyl.scale(1, FL, 1);
      var nr = cyl.attributes.normal, cc = new Float32Array(nr.count * 3);
      for (var q = 0; q < nr.count; q++) {
        var ny = nr.getY(q), nx = nr.getX(q), sh = ny > 0 ? 0.5 + 0.5 * Math.pow(ny, 0.7) : 0.5 + 0.42 * ny, d = 1 - sh * (1 - 0.1 * nx);
        cc[q * 3] = 1 - d * 0.8; cc[q * 3 + 1] = 1 - d * 0.94; cc[q * 3 + 2] = 1 - d * 1.18;
      }
      cyl.setAttribute('color', new T3.BufferAttribute(cc, 3));
      var m = matte({ color: lin(cfg.rodColor || cfg.edge), vertexColors: true });
      for (var i = 0; i < SIGS; i++) { var c = new T3.Mesh(cyl, m); c.position.set(-MG - (i + 0.5) * 2 * RR, RV * FL, 0); c.castShadow = true; rods.add(c); }
      var tm = new T3.MeshLambertMaterial({ color: THREAD }), K = cfg.stations, tr = cfg.threadR || 0.0024, kr = cfg.knot || tr * 1.5;
      var tuft = new T3.CylinderGeometry(1, 0.4, 1, 5, 1); tuft.translate(0, 0.5, 0);
      function addTuft(p) {
        var t = new T3.Mesh(tuft, tm); t.position.copy(p);
        t.scale.set(tr * 0.45, kr * (1.6 + rnd() * 1.8), tr * 0.45);
        t.rotation.set((rnd() - 0.5) * 2.2, rnd() * 6.28, (rnd() - 0.5) * 2.2); rods.add(t);
      }
      for (var k = 0; k < K; k++) {
        var z = -H / 2 + 0.16 + (H - 0.32) * k / (K - 1), pts = [new T3.Vector3(RR * 0.6, Math.min(Y0, 0.003), z)];
        for (var j = 0; j < SIGS; j++) {
          var cx = -MG - (j + 0.5) * 2 * RR, w = (rnd() - 0.5) * tr * 1.2;
          pts.push(new T3.Vector3(cx + RV * 0.62, TOP * 0.8 + tr * 0.7, z + w), new T3.Vector3(cx, TOP + tr * 0.75, z + w), new T3.Vector3(cx - RV * 0.62, TOP * 0.8 + tr * 0.7, z + w));
          if (j < SIGS - 1) pts.push(new T3.Vector3(cx - RR, TOP * 0.42, z));
        }
        pts.push(new T3.Vector3(-G - RR * 0.5, COV * 0.7, z));
        rods.add(new T3.Mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3(pts), pts.length * 5, tr, 6, false), tm));
        for (j = 0; j < SIGS; j++) {
          if ((j + k) % 2) continue;
          var kn = new T3.Mesh(knotGeo, tm), kx = -MG - (j + 0.5) * 2 * RR + (rnd() - 0.5) * RR * 0.5;
          kn.scale.set(kr * (1.0 + rnd() * 0.4), kr * 0.8, kr * (1.2 + rnd() * 0.5));
          kn.position.set(kx, TOP + tr * 0.6, z + (rnd() - 0.5) * tr * 2); rods.add(kn);
          if (rnd() < 0.7) addTuft(kn.position);
        }
      }
    })();

    /* il foglio che gira */
    var SX = 46, SZ = 6, leafGeo = new T3.BufferGeometry();
    (function () {
      var pos = new Float32Array((SX + 1) * (SZ + 1) * 3), col = new Float32Array((SX + 1) * (SZ + 1) * 3), uv = [], idx = [];
      col.fill(1);
      for (var j = 0; j <= SZ; j++) for (var i = 0; i <= SX; i++) uv.push(i / SX, 1 - j / SZ);
      for (j = 0; j < SZ; j++) for (i = 0; i < SX; i++) { var a = j * (SX + 1) + i, b = a + SX + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      leafGeo.setAttribute('position', new T3.BufferAttribute(pos, 3)); leafGeo.setAttribute('color', new T3.BufferAttribute(col, 3));
      leafGeo.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); leafGeo.setIndex(idx);
    })();
    var lf = matte({ color: PAPER, vertexColors: true }), lb = matte({ color: PAPER, vertexColors: true, side: T3.BackSide });
    lf.shadowSide = lb.shadowSide = T3.DoubleSide;
    var leafFront = new T3.Mesh(leafGeo, lf), leafBack = new T3.Mesh(leafGeo, lb);
    // il foglio proietta l'ombra sulle pagine ma non la riceve: un foglio sottile che si fa ombra da solo,
    // quando passa a sinistra e resta di taglio rispetto alla luce, crea strisce che tremolano (shadow acne)
    leafFront.receiveShadow = leafBack.receiveShadow = false; leafFront.castShadow = leafBack.castShadow = true;
    var leafGroup = new T3.Group(); leafGroup.add(leafFront, leafBack); leafGroup.visible = false; book.add(leafGroup);
    function bendLeaf(theta, grabZ, stiff, hy) {
      var p = leafGeo.attributes.position.array, c = leafGeo.attributes.color.array;
      var b = Math.sin(theta) * (stiff ? 0.35 : 0.95), du = W / SX, t = theta / Math.PI, ct = Math.cos(theta), land = Math.pow(Math.abs(ct), 6), snap = Math.pow(Math.abs(ct), 14);
      for (var j = 0; j <= SZ; j++) {
        var v = j / SZ * 2 - 1, corner = grabZ * v * 0.45, x = 0, y = 0;
        for (var i = 0; i <= SX; i++) {
          var u = i / SX, k = (j * (SX + 1) + i) * 3;
          var floor = (x >= 0 ? topY(Math.min(1, x / W), curH.r) : topY(Math.min(1, -x / W), curH.l)) - hy + 0.0009;
          if (y < floor) y = floor;
          var px = x, py = y;
          if (snap > 0) {                                   // negli ultimi istanti coincide con la superficie della pila
            var sx = ct > 0 ? u * W : -u * W, sy = topY(u, ct > 0 ? curH.r : curH.l) - hy + 0.0009;
            px = x + (sx - x) * snap; py = y + (sy - y) * snap;
          }
          p[k] = px; p[k + 1] = py; p[k + 2] = -H / 2 + H * j / SZ;
          var dk = (1 - ao(u)) * land; c[k] = 1 - dk * WR; c[k + 1] = 1 - dk * WG; c[k + 2] = 1 - dk * WB;
          var base = theta + (1 - t) * slope(u, curH.r) - t * slope(u, curH.l);
          var phi = Math.min(Math.PI, Math.max(0, base + b * (u * u) * (1 + corner)));
          x += Math.cos(phi) * du; y += Math.sin(phi) * du;
        }
      }
      leafGeo.attributes.position.needsUpdate = true; leafGeo.attributes.color.needsUpdate = true;
      leafGeo.computeVertexNormals(); leafGeo.computeBoundingSphere();
    }

    /* stato */
    var L = 0; this.opened = false; this.flip = null;
    function heights(l) { return { left: l > 0 ? COV + (l - 1) * LEAF : 0, right: (NL - l) * LEAF + (l === 0 ? COV - LEAF : 0) + COV }; }
    this.heights = heights;
    function layout() {
      var f = me.flip, showL = f ? Math.min(L, f.leaf) : L, showR = f ? Math.max(L, f.leaf + 1) : L;
      var hl = heights(showL).left, hr = heights(showR).right;
      CURVE = me.opened ? 1 : 0; curH.l = hl; curH.r = hr;
      var rTop = showR < NL ? rectoOf(showR) : null, lTop = showL > 0 ? versoOf(showL - 1) : null;
      R.set(hr, rTop ? pageTex(rTop) : null, cfg.back ? tex(cfg.base + cfg.back, true) : null);
      Lft.set(hl, lTop ? pageTex(lTop) : null, null);
      me.want = { l: lTop ? pageTex(lTop) : null, r: rTop ? pageTex(rTop) : null }; me.have = function () { return { l: Lft.mTop.map, r: R.mTop.map }; };
      var gk = 0; if (false)                             // quanto è aperta la piega cucita (0 chiusa, 1 copertina aperta sulla prima pagina)
      if (me.opened) {
        if (!f) gk = L === 1 ? 1 : 0;
        else if (f.leaf === 0) gk = f.theta / Math.PI;
        else if (f.leaf === 1) gk = 1 - f.theta / Math.PI;
      }
      Lft.mesh.position.x = -G * gk; Lft.bottom.position.x = -W / 2 - G * gk;
      rods.visible = false;
      spine.visible = !me.opened && L === 0 && !f;
      if (f) {
        leafGroup.visible = true;
        var rt = rectoOf(f.leaf), vt = versoOf(f.leaf);
        setMap(lf, rt ? pageTex(rt) : null); setMap(lb, vt ? pageTex(vt, true) : null);
        var hy = (CURVE ? Math.min(Y0, hr) * (1 - f.theta / Math.PI) + Math.min(Y0, Math.max(hl, 0.0001)) * (f.theta / Math.PI) : (hr + hl) / 2) + 0.0012;
        leafGroup.position.set(f.leaf === 0 ? -G * gk : 0, hy, 0);
        bendLeaf(f.theta, f.grabZ, f.leaf === 0, hy);
      } else leafGroup.visible = false;
      for (var l = L - 4; l <= L + 5; l++) { if (l < 0 || l >= NL) continue; var a = rectoOf(l), b2 = versoOf(l); if (a) tex(a); if (b2) tex(b2); }
      dirty = true;
    }
    this.layout = layout;
    onTexReady.push(function () { layout(); });
    this.L = function () { return L; };
    this.reset = function () { L = 0; me.flip = null; me.opened = false; layout(); };
    this.animateFlip = function (target, ms, done) {
      var f = me.flip, from = f.theta, t0 = performance.now();
      f.anim = function (now) {
        var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        f.theta = from + (target - from) * e; layout();
        if (k >= 1) { me.flip = null; L = target >= Math.PI - 1e-3 ? f.leaf + 1 : f.leaf; layout(); done && done(); ui(); }
      };
    };
    this.turn = function (dir, ms, done) {
      if (!me.opened || me.flip) return false;
      if (dir > 0 && L >= NL) return false; if (dir < 0 && L <= 1) return false;
      var leaf = dir > 0 ? L : L - 1;
      me.flip = { leaf: leaf, theta: dir > 0 ? 0 : Math.PI, grabZ: 0.35 }; layout();
      me.animateFlip(dir > 0 ? Math.PI : 0, ms || 900, done); return true;
    };
    this.openCover = function (done) {
      me.opened = true; layout();
      me.flip = { leaf: 0, theta: 0, grabZ: 0.2 }; layout();
      me.animateFlip(Math.PI, 1000, done);
    };
    this.label = function () {
      if (!me.opened) return cfg.name;
      var lp = L >= 2 ? 2 * (L - 1) : null, rp = L <= NP / 2 ? 2 * L - 1 : null;
      if (lp && rp) return D.pn + ' ' + lp + '–' + rp;
      return D.p1 + ' ' + (lp || rp);
    };
    this.atEnd = function () { return L >= NL; };
    this.goTo = function (l) { l = Math.max(1, Math.min(NL, l | 0)); if (l === L && !me.flip) return; me.flip = null; L = l; layout(); };
    this.setCenter = function (k) { book.position.set(-W / 2 * (1 - k), -(1 - k) * me.T / 2, 0); };
    layout();
  }

  /* ---------- i due volumi ---------- */
  var libro = new Book({ name: D.nameLibro, base: D.base, pages: 208, paper: '#f1ede3', edge: '#ebe6da', thread: '#ece9e1', sigs: 13, stations: 6, rod: 0.0028, leaf: 0.0011, cov: 0.0035, cover: 'cover.webp?v=2', back: 'cover-back.webp?v=2' });
  var catalogo = new Book({ name: D.nameCat, base: D.cat, pages: 80, w: 2.425, h: 3.20, paper: '#f6f5f1', edge: '#efeee9', thread: '#f8f6f1', wrap: '#fbfbf9', rodColor: '#d9d2c3', threadR: 0.0032, rod: 0.011, sigs: 5, stations: 11, leaf: 0.0013, cov: 0.0045, cover: 'cover.webp?v=2', back: 'cover-back.webp?v=2' });
  var books = [libro, catalogo];
  stackGroup.add(libro.root, catalogo.root);

  /* ---------- pose: impilati / separati / lettura ---------- */
  var mode = 'stack', active = null, busy = false;
  var S = { yaw: 0.95, pitch: 0.36, el: 0.38, dist: 10, look: 0, sep: 0, read: 0, zoom: 1, px: 0, pz: 0 };
  libro.pose = { yaw: 0.85, pitch: 0.36 }; catalogo.pose = { yaw: 0.6, pitch: 0.42 };
  function fitDist(wide, high) {
    var a = camera.aspect, t = Math.tan(T3.MathUtils.degToRad(camera.fov / 2));
    return Math.max(high / 2 / t, wide / 2 / (t * a));
  }
  function distFor(m) {
    if (m === 'stack') return camera.aspect < 1 ? fitDist(W * 2.1, H * 1.25) : fitDist(W * 1.5, H * 1.2);
    if (m === 'apart') return camera.aspect < 1 ? fitDist(W * 2.0, H * 3.0) : fitDist(W * 4.1, H * 1.3);
    var aw = active ? active.W : W, ah = active ? active.H : H;
    return fitDist(2 * aw * 1.06, ah * 1.3);
  }
  function elFor(m) { return m === 'read' ? 1.22 : (m === 'apart' ? 0.5 : 0.38); }
  function place() {
    var tb = libro.T, k = S.sep, r = S.read, side = camera.aspect < 1 ? 0 : 1;
    var dx = W * 0.85 * side, dz = H * 0.78 * (1 - side);
    libro.root.position.set(-dx * k, 0, -dz * k);
    catalogo.root.position.set(0.12 * (1 - k) + dx * k, (tb + 0.0006) * (1 - k), -0.08 * (1 - k) + dz * k);
    catalogo.root.rotation.y = -0.07 * (1 - k);
    stackGroup.rotation.set(S.pitch * (1 - k), S.yaw * (1 - k), 0, 'YXZ');
    stackGroup.position.y = -(tb + catalogo.T) / 2 * (1 - k);
    books.forEach(function (b) {
      var p = b.pose, isA = b === active, rr = isA ? r : 0;
      b.pivot.rotation.set(p.pitch * k * (1 - rr), p.yaw * k * (1 - rr), 0, 'YXZ');
      b.setCenter(rr);
      if (isA) b.root.position.multiplyScalar(1 - r);
      if (active && !isA) b.root.position.x += (b.root.position.x >= 0 ? 1 : -1) * r * 7;
      b.root.visible = !(active && !isA && r > 0.4);
    });
    ground.position.y = (-1.6 * (1 - r)) - 0.0005;
    ground.material.opacity = 0.07 + 0.06 * r;
    var d = S.dist / S.zoom, el = S.el;
    camera.position.set(S.px, Math.sin(el) * d, Math.cos(el) * d + S.pz);
    camera.lookAt(S.px, S.look, S.look * 0.34 + S.pz);
  }
  var tweens = [];
  function tween(to, ms, done) {
    var from = {}, t0 = performance.now(); for (var key in to) from[key] = S[key];
    tweens.push(function (now) {
      var k = Math.min(1, (now - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      for (var key in to) S[key] = from[key] + (to[key] - from[key]) * e;
      if (k >= 1) { done && done(); return true; } return false;
    });
  }
  function shortAngle(a) { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; }
  function toApart() {
    if (busy || mode !== 'stack') return; busy = true; S.yaw = shortAngle(S.yaw);
    mode = 'apart'; ui();
    tween({ sep: 1, el: elFor('apart'), dist: distFor('apart') }, 1100, function () { busy = false; ui(); });
  }
  function toStack() {
    if (busy || mode !== 'apart') return; busy = true;
    books.forEach(function (b) { b.pose.yaw = shortAngle(b.pose.yaw); });
    mode = 'stack'; ui();
    tween({ sep: 0, el: elFor('stack'), dist: distFor('stack') }, 1100, function () { busy = false; ui(); });
  }
  function toRead(b) {
    if (busy || mode !== 'apart') return; busy = true; active = b; S.zoom = 1; S.px = S.pz = 0;
    b.pose.yaw = shortAngle(b.pose.yaw);
    mode = 'read'; ui();
    tween({ read: 1, el: elFor('read'), dist: distFor('read'), look: 0.35 }, 1150, function () {
      b.openCover(function () { busy = false; ui(); });
    });
  }
  function closeRead() {
    if (busy || mode !== 'read' || !active || active.flip) return; busy = true;
    host.classList.add('fade');
    setTimeout(function () {
      setHD(false); active.reset(); S.read = 0; S.look = 0; S.zoom = 1; S.px = S.pz = 0; S.el = elFor('apart'); S.dist = distFor('apart'); active = null; mode = 'apart';
      host.classList.remove('fade'); busy = false; ui(); dirty = true;
    }, 320);
  }

  /* ---------- ingrandimento delle pagine ---------- */
  var ZMAX = 5;
  function setHD(on) { if (on === hdOn) return; hdOn = on; books.forEach(function (b) { b.layout(); }); dirty = true; }
  function clampPan() {
    if (!active) return; var k = 1 - 1 / S.zoom, mx = active.W * 1.05 * k, mz = active.H / 2 * 1.05 * k;
    S.px = Math.max(-mx, Math.min(mx, S.px)); S.pz = Math.max(-mz, Math.min(mz, S.pz));
  }
  function zoomAt(cx, cy, nz) {
    nz = Math.max(1, Math.min(ZMAX, nz));
    var p = planeHit({ clientX: cx, clientY: cy });
    if (p) { var k = 1 - S.zoom / nz; S.px += (p.x - S.px) * k; S.pz += (p.z - S.pz) * k; }
    S.zoom = nz; if (nz <= 1.001) { S.zoom = 1; S.px = S.pz = 0; }
    clampPan(); setHD(S.zoom > 1.25); host.classList.toggle('is-zoom', S.zoom > 1.02); dirty = true;
  }
  function zoomed() { return mode === 'read' && S.zoom > 1.02; }

  /* ---------- puntatore ---------- */
  var ray = new T3.Raycaster(), ndc = new T3.Vector2(), plane = new T3.Plane(new T3.Vector3(0, 1, 0), 0), hit = new T3.Vector3();
  function setRay(e) { var r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); }
  function planeHit(e) {
    setRay(e); plane.constant = -(active.heights(active.L()).right * 0.6);
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
  }
  function pickBook(e) {
    setRay(e);
    var hits = ray.intersectObjects([libro.root, catalogo.root], true);
    if (!hits.length) return null;
    var o = hits[0].object; while (o && o !== libro.root && o !== catalogo.root) o = o.parent;
    return o === libro.root ? libro : (o === catalogo.root ? catalogo : null);
  }
  var drag = null, cv = renderer.domElement, idle = 0, vel = { yaw: 0, pitch: 0, b: null };
  cv.style.touchAction = 'pan-y';
  var ptrs = {}, pinch = null, clickT = 0;
  function pinchState() { var k = Object.keys(ptrs); if (k.length < 2) return null; var a = ptrs[k[0]], b = ptrs[k[1]]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  cv.addEventListener('pointerdown', function (e) {
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (mode === 'read' && !busy && Object.keys(ptrs).length === 2) {
      pinch = pinchState(); pinch.z = S.zoom;
      if (active && active.flip && !active.flip.anim) { active.flip = null; active.layout(); }
      drag = null; return;
    }
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
    if (zoomed()) { drag.pan = true; cv.setPointerCapture(e.pointerId); return; }
    if (mode === 'apart' && !busy) drag.book = pickBook(e);
    if (mode === 'read' && !busy && active && !active.flip) {
      var p = planeHit(e), L = active.L();
      var aW = active.W, aH = active.H;
      if (p && Math.abs(p.z) < aH / 2) {
        if (p.x > aW * 0.08 && L < active.NL) drag.leaf = { leaf: L, dir: 1, gz: p.z / (aH / 2) };
        else if (p.x < -aW * 0.08 && L > 1) drag.leaf = { leaf: L - 1, dir: -1, gz: p.z / (aH / 2) };
      }
    }
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', function (e) {
    if (ptrs[e.pointerId]) { ptrs[e.pointerId].x = e.clientX; ptrs[e.pointerId].y = e.clientY; }
    if (pinch) { var ps = pinchState(); if (ps && pinch.d > 0) zoomAt(ps.x, ps.y, pinch.z * ps.d / pinch.d); return; }
    if (!drag) return;
    if (drag.pan) {
      var r = cv.getBoundingClientRect(), wpp = 2 * Math.tan(T3.MathUtils.degToRad(camera.fov / 2)) * (S.dist / S.zoom) / r.height;
      drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
      S.px -= (e.clientX - drag.x) * wpp; S.pz -= (e.clientY - drag.y) * wpp / Math.sin(S.el);
      clampPan(); drag.x = e.clientX; drag.y = e.clientY; dirty = true; return;
    }
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (mode === 'stack' && !busy) {
      S.yaw += dx * 0.009; S.pitch = Math.max(-1.25, Math.min(1.35, S.pitch + dy * 0.007)); vel.yaw = dx * 0.009; vel.pitch = dy * 0.007; vel.b = null;
    } else if (mode === 'apart' && !busy && drag.book) {
      var pz = drag.book.pose; pz.yaw += dx * 0.009; pz.pitch = Math.max(-1.25, Math.min(1.35, pz.pitch + dy * 0.007)); vel.yaw = dx * 0.009; vel.pitch = dy * 0.007; vel.b = drag.book;
    } else if (mode === 'read' && drag.leaf && drag.moved > 6 && active) {
      if (!active.flip) active.flip = { leaf: drag.leaf.leaf, theta: drag.leaf.dir > 0 ? 0 : Math.PI, grabZ: drag.leaf.gz };
      var p = planeHit(e);
      if (p && active.flip && !active.flip.anim) { active.flip.theta = Math.acos(Math.max(-1, Math.min(1, p.x / active.W))); active.flip.grabZ = drag.leaf.gz; active.layout(); }
    }
    idle = performance.now(); dirty = true; drag.x = e.clientX; drag.y = e.clientY;
  });
  function up(e) {
    delete ptrs[e.pointerId]; if (pinch) { if (Object.keys(ptrs).length < 2) pinch = null; return; }
    if (!drag) return; var d = drag; drag = null;
    if (d.pan) return;
    if (d.moved < 6) {
      if (mode === 'stack') { toApart(); return; }
      if (mode === 'apart') { var b = pickBook(e); if (b) toRead(b); return; }
      if (mode === 'read' && active) {
        if (active.flip && !active.flip.anim) { active.flip = null; active.layout(); }
        var p = planeHit(e); if (p) { clearTimeout(clickT); clickT = setTimeout(function () { step(p.x >= 0 ? 1 : -1); }, 240); }
      }
      return;
    }
    if (mode === 'read' && active && active.flip && !active.flip.anim) active.animateFlip(active.flip.theta > Math.PI / 2 ? Math.PI : 0, 520);
  }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('dblclick', function (e) {
    clearTimeout(clickT);
    if (mode !== 'read' || busy) return; e.preventDefault();
    var from = { zoom: S.zoom, px: S.px, pz: S.pz };
    zoomAt(e.clientX, e.clientY, S.zoom > 1.5 ? 1 : 3);
    var to = { zoom: S.zoom, px: S.px, pz: S.pz }; S.zoom = from.zoom; S.px = from.px; S.pz = from.pz;
    tween(to, 450);
  });
  cv.addEventListener('wheel', function (e) {
    if (mode === 'read') {
      if (busy || (S.zoom <= 1.001 && e.deltaY > 0 && !e.ctrlKey)) return;
      e.preventDefault(); zoomAt(e.clientX, e.clientY, S.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025))); return;
    }
    if (busy) return; e.preventDefault();
    var base = distFor(mode); S.dist = Math.max(base * 0.28, Math.min(base * 1.4, S.dist * (1 + e.deltaY * 0.0012))); idle = performance.now(); dirty = true;
  }, { passive: false });
  function step(dir) {
    if (mode !== 'read' || !active || busy) return;
    if (dir < 0 && active.L() <= 1) { closeRead(); return; }
    active.turn(dir);
  }

  /* ---------- controlli ---------- */
  var ctl = host.parentNode.querySelector('.libro-ctl');
  var bp = ctl.querySelector('.libro-prev'), bn = ctl.querySelector('.libro-next'), lab = ctl.querySelector('.libro-n'), bo = ctl.querySelector('.libro-open');
  var hint = host.querySelector('.libro-hint');
  var lg = (document.documentElement.lang || 'it').slice(0, 2);
  var sl = document.createElement('input'); sl.type = 'range'; sl.className = 'libro-scrub'; sl.min = 1; sl.step = 1; sl.hidden = true;
  sl.setAttribute('aria-label', lg === 'en' ? 'Leaf through the book' : (lg === 'fr' ? 'Feuilleter le livre' : 'Sfoglia il libro'));
  ctl.parentNode.insertBefore(sl, ctl.nextSibling);
  // la lineetta sfoglia davvero: le pagine girano una dopo l'altra, veloci; se il salto è lungo si avvicina di colpo e sfoglia le ultime
  var scrubTo = null, scrubbing = false;
  function pump() {
    if (mode !== 'read' || !active || busy || scrubTo === null) { scrubbing = false; return; }
    if (active.flip) return;
    var L = active.L(), d = scrubTo - L;
    if (!d) { scrubbing = false; scrubTo = null; ui(); return; }
    var dir = d > 0 ? 1 : -1, n = Math.abs(d);
    if (n > 7) { active.goTo(scrubTo - dir * 7); ui(); L = active.L(); n = 7; }
    scrubbing = true;
    if (!active.turn(dir, n > 3 ? 170 : (n > 1 ? 260 : 420), function () { requestAnimationFrame(pump); })) { scrubbing = false; scrubTo = null; }
  }
  sl.addEventListener('input', function () {
    if (mode !== 'read' || !active || busy) return;
    scrubTo = Math.max(1, Math.min(active.NL, +sl.value)); lab.textContent = active.label();
    if (!scrubbing) pump();
  });
  function hintFor(m) { var h = D['hint' + m[0].toUpperCase() + m.slice(1)] || ''; if (coarse) h = h.split(' · ').filter(function (s) { return !/rotella|scroll|molette/i.test(s); }).join(' · '); return h; }
  function ui() {
    var reading = mode === 'read';
    lab.textContent = reading && active ? active.label() : (mode === 'stack' ? D.both : '');
    bp.hidden = bn.hidden = !reading;
    bp.disabled = !reading || busy; bn.disabled = !reading || (active && active.atEnd());
    bo.textContent = mode === 'stack' ? D.split : (mode === 'apart' ? D.join : D.close);
    host.classList.toggle('is-open', reading); cv.style.touchAction = reading ? 'none' : 'pan-y';
    if (hint) hint.textContent = hintFor(mode);
    sl.hidden = !reading; if (reading && active) { sl.max = active.NL; if (document.activeElement !== sl) sl.value = active.L(); }
  }
  bp.addEventListener('click', function () { step(-1); });
  bn.addEventListener('click', function () { step(1); });
  bo.addEventListener('click', function () { if (mode === 'stack') toApart(); else if (mode === 'apart') toStack(); else closeRead(); });
  var vis = false;
  new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis) { dirty = true; loop(); } }, { threshold: 0.05 }).observe(host);
  addEventListener('keydown', function (e) {
    if (!vis || mode !== 'read') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'Escape') closeRead();
  });
  function resize() {
    var w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!tweens.length) S.dist = distFor(mode);
    dirty = true;
  }
  new ResizeObserver(resize).observe(host);

  /* ---------- ciclo ---------- */
  var running = false;
  function loop() {
    if (running) return; running = true;
    requestAnimationFrame(function frame(now) {
      if (!vis) { running = false; return; }
      if (tweens.length) { tweens = tweens.filter(function (f) { return !f(now); }); dirty = true; }
      books.forEach(function (b) { if (b.flip && b.flip.anim) { b.flip.anim(now); dirty = true; } });
      if (!drag && !tweens.length && mode !== 'read') {
        vel.yaw *= 0.92; vel.pitch *= 0.92;
        var tgt = mode === 'stack' ? S : (vel.b && vel.b.pose);
        if (tgt) { tgt.yaw += vel.yaw; tgt.pitch = Math.max(-1.25, Math.min(1.35, tgt.pitch + vel.pitch)); }
        if (!still && performance.now() - idle > 2500) { if (mode === 'stack') S.yaw += 0.0016; else books.forEach(function (b) { b.pose.yaw += 0.0012; }); }
        dirty = true;
      }
      if (dirty) { place(); renderer.render(scene, camera); dirty = false; }
      requestAnimationFrame(frame);
    });
  }
  resize(); S.dist = distFor('stack'); place(); ui();
  window.__libro = {
    S: S, books: books, mode: function () { return mode; }, apart: toApart, stack: toStack, read: function (i) { toRead(books[i]); }, close: closeRead, turn: step,
    flipAt: function (th) { var b = active; if (!b.flip) b.flip = { leaf: b.L(), theta: th, grabZ: 0.3 }; b.flip.theta = th; b.layout(); },
    setDirty: function () { dirty = true; }, state: function () { return { mode: mode, L: active ? active.L() : null, busy: busy }; }
  };
})();
