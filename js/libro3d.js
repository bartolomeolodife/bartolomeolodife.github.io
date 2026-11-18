/* Trattato del ribelle — il libro in 3D: chiuso si ruota e mostra la cucitura a vista, aperto si sfoglia come carta. */
(function () {
  var host = document.getElementById('libro3d');
  if (!host || !window.THREE) return;
  var T3 = THREE;
  var base = host.dataset.base, NP = +host.dataset.pages;           // 208 pagine
  var NL = NP / 2 + 1;                                                // fogli girabili: copertina + 104
  var W = 2.30, H = 3.10;                                             // formato 230 × 310 mm (in dm)
  var LEAF = 0.0011, COV = 0.0035;                                    // spessore foglio e copertina
  var BLOCK = (NL - 1) * LEAF;                                        // blocco pagine
  var SIGS = 13;                                                      // segnature cucite
  var PAPER = new T3.Color('#f1ede3').convertSRGBToLinear();
  var EDGE = new T3.Color('#ebe6da').convertSRGBToLinear();
  var THREAD = new T3.Color('#bdb8ae').convertSRGBToLinear();
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- scena ---------- */
  var renderer = new T3.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = T3.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T3.PCFSoftShadowMap;
  host.insertBefore(renderer.domElement, host.firstChild);
  var scene = new T3.Scene();
  var camera = new T3.PerspectiveCamera(28, 1, 0.1, 60);
  scene.add(new T3.HemisphereLight(0xffffff, 0xe6e4e0, 0.6));
  var sun = new T3.DirectionalLight(0xffffff, 0.42);
  sun.position.set(-2.2, 6, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -4; sun.shadow.camera.right = 4; sun.shadow.camera.top = 4; sun.shadow.camera.bottom = -4;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 14;
  sun.shadow.bias = -0.0004; sun.shadow.radius = 6;
  scene.add(sun);
  var fill = new T3.DirectionalLight(0xffffff, 0.12); fill.position.set(3, 2, -2); scene.add(fill);

  var ground = new T3.Mesh(new T3.PlaneGeometry(30, 30), new T3.ShadowMaterial({ opacity: 0.13, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.0005; ground.receiveShadow = true;

  var book = new T3.Group();           // il libro: dorso sull'asse z a x = 0, pagine verso +x
  var world = new T3.Group();          // contiene libro e ombra a terra
  world.add(book); scene.add(world); scene.add(ground);

  /* ---------- texture ---------- */
  var loader = new T3.TextureLoader(), cache = {}, maxAniso = renderer.capabilities.getMaxAnisotropy();
  function tex(name, mirror) {
    var key = name + (mirror ? '|m' : '');
    if (cache[key]) return cache[key];
    var t = loader.load(base + name, function () { dirty = true; });
    t.encoding = T3.sRGBEncoding; t.anisotropy = maxAniso;
    if (mirror) { t.wrapS = T3.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
    cache[key] = t; return t;
  }
  function pageName(p) { return ('00' + p).slice(-3) + '.webp'; }
  function rectoOf(l) { return l === 0 ? 'cover.webp' : (l <= NP / 2 ? pageName(2 * l - 1) : null); }
  function versoOf(l) { return l === 0 ? null : (l <= NP / 2 ? pageName(2 * l) : null); }
  function edgeTexture() {
    var c = document.createElement('canvas'); c.width = 4; c.height = 512;
    var g = c.getContext('2d');
    for (var y = 0; y < 512; y++) { var v = 226 + ((y * 7919) % 11) - (y % 2 ? 9 : 0); g.fillStyle = 'rgb(' + (v + 8) + ',' + (v + 4) + ',' + (v - 6) + ')'; g.fillRect(0, y, 4, 1); }
    var t = new T3.CanvasTexture(c); t.wrapS = t.wrapT = T3.RepeatWrapping; t.encoding = T3.sRGBEncoding; return t;
  }
  function matPaper(map, side) { return new T3.MeshLambertMaterial({ color: map ? 0xffffff : PAPER, map: map || null, side: side || T3.FrontSide }); }
  function setMap(m, t) { m.map = t || null; m.color.copy(t ? new T3.Color(0xffffff) : PAPER); m.needsUpdate = true; }

  /* ---------- pile di fogli (sinistra e destra): da aperte scendono curve nella piega ---------- */
  var Y0 = 0.0035, CURL = 0.2, CURVE = 0;        // altezza al dorso, ampiezza della curva, 0 chiuso → 1 aperto
  function g(s) { return s >= CURL ? 1 : 1 - Math.pow(1 - s / CURL, 2.2); }
  function gp(s) { return s >= CURL ? 0 : 2.2 * Math.pow(1 - s / CURL, 1.2) / CURL; }
  function topY(s, h) { var lo = Math.min(Y0, h); return h - CURVE * (h - lo) * (1 - g(s)); }
  function slope(s, h) { var lo = Math.min(Y0, h); return Math.atan(CURVE * (h - lo) * gp(s) / W); }
  var NXS = 40;
  function sAt(i) { return Math.pow(i / NXS, 1.7); }
  function Stack(side) {
    this.side = side;
    var et = edgeTexture(); this.edgeTex = et;
    this.mTop = new T3.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    this.mEdge = new T3.MeshLambertMaterial({ color: 0xffffff, map: et });
    this.mesh = new T3.Mesh(new T3.BufferGeometry(), [this.mTop, this.mEdge]);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mTop.shadowSide = this.mEdge.shadowSide = T3.DoubleSide;
    this.bottom = new T3.Mesh(new T3.PlaneGeometry(W, H), matPaper(null, T3.BackSide));
    this.bottom.rotation.x = -Math.PI / 2; this.bottom.receiveShadow = true;
    this.h = -1; this.c = -1;
    book.add(this.mesh, this.bottom);
  }
  Stack.prototype.build = function (h) {
    var sd = this.side, pos = [], uv = [], col = [], idx = [], n = 0, top = 0;
    function v(x, y, z, a, b, c) { pos.push(x, y, z); uv.push(a, b); col.push(c, c, c); return n++; }
    // superficie superiore (curva vicino al dorso)
    var rows = [];
    for (var i = 0; i <= NXS; i++) {
      var s = sAt(i), x = sd * s * W, y = topY(s, h), shade = 1 - CURVE * 0.22 * Math.pow(Math.max(0, 1 - s / 0.14), 2);
      var u = sd > 0 ? s : 1 - s;
      rows.push([v(x, y, -H / 2, u, 1, shade), v(x, y, H / 2, u, 0, shade)]);
    }
    for (i = 0; i < NXS; i++) { var a = rows[i], b = rows[i + 1]; if (sd > 0) idx.push(a[0], a[1], b[0], b[0], a[1], b[1]); else idx.push(a[0], b[0], a[1], b[0], b[1], a[1]); }
    top = idx.length;
    // testa e piede: strisce tra la base e la curva
    [-1, 1].forEach(function (zs) {
      var z = zs * H / 2, prev = null;
      for (var i = 0; i <= NXS; i++) {
        var s = sAt(i), x = sd * s * W, y = topY(s, h);
        var p = [v(x, 0, z, s * 2, 0, 1), v(x, y, z, s * 2, y * 50, 1)];
        if (prev) { var flip = (zs > 0) === (sd > 0); if (flip) idx.push(prev[0], p[0], prev[1], p[0], p[1], prev[1]); else idx.push(prev[0], prev[1], p[0], p[0], prev[1], p[1]); }
        prev = p;
      }
    });
    // taglio davanti
    var xe = sd * W, ye = topY(1, h), q = [v(xe, 0, -H / 2, 0, 0, 1), v(xe, ye, -H / 2, 0, ye * 50, 1), v(xe, 0, H / 2, 6, 0, 1), v(xe, ye, H / 2, 6, ye * 50, 1)];
    if (sd > 0) idx.push(q[0], q[1], q[2], q[2], q[1], q[3]); else idx.push(q[0], q[2], q[1], q[2], q[3], q[1]);
    var geo = new T3.BufferGeometry();
    geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new T3.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
    geo.addGroup(0, top, 0); geo.addGroup(top, idx.length - top, 1);
    geo.computeVertexNormals();
    this.mesh.geometry.dispose(); this.mesh.geometry = geo;
  };
  Stack.prototype.set = function (h, topTex, botTex) {
    if (Math.abs(h - this.h) > 1e-7 || this.c !== CURVE) { this.build(Math.max(h, 0.0001)); this.h = h; this.c = CURVE; }
    this.bottom.position.set(this.side * W / 2, -0.0004, 0);
    this.mTop.map = topTex || null; this.mTop.color.copy(topTex ? new T3.Color(0xffffff) : PAPER); this.mTop.needsUpdate = true;
    setMap(this.bottom.material, botTex);
    var vis = h > 0.00005; this.mesh.visible = this.bottom.visible = vis;
  };
  var R = new Stack(1), Lft = new Stack(-1);

  /* ---------- dorso a vista: segnature e filo ---------- */
  var spine = new T3.Group(); book.add(spine);
  function halfTube(r, y0) {
    var segA = 14, segZ = 1, pos = [], nor = [], uv = [], idx = [];
    for (var j = 0; j <= segZ; j++) for (var i = 0; i <= segA; i++) {
      var a = Math.PI / 2 + Math.PI * i / segA, z = -H / 2 + H * j / segZ;
      pos.push(r * Math.cos(a) * 1.15, y0 + r * Math.sin(a), z); nor.push(Math.cos(a), Math.sin(a), 0); uv.push(i / segA, j / segZ);
    }
    for (j = 0; j < segZ; j++) for (i = 0; i < segA; i++) { var a0 = j * (segA + 1) + i, b0 = a0 + segA + 1; idx.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1); }
    var g = new T3.BufferGeometry();
    g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T3.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
  }
  (function buildSpine() {
    var m = new T3.MeshLambertMaterial({ color: EDGE }), centers = [];
    var bands = [{ y: COV / 2 + 0.0004, r: COV / 2 + 0.0006 }];
    var sh = BLOCK / SIGS;
    for (var s = 0; s < SIGS; s++) bands.push({ y: COV + sh * (s + 0.5), r: sh / 2 });
    bands.push({ y: COV + BLOCK + COV / 2 - 0.0004, r: COV / 2 + 0.0006 });
    bands.forEach(function (b) { var me = new T3.Mesh(halfTube(b.r, b.y), m); me.castShadow = true; spine.add(me); centers.push(b); });
    var tm = new T3.MeshLambertMaterial({ color: THREAD }), K = 11;
    for (var k = 0; k < K; k++) {
      var z = -H / 2 + 0.16 + (H - 0.32) * k / (K - 1), pts = [];
      centers.forEach(function (b, i) { pts.push(new T3.Vector3(-b.r * 1.15 - 0.0012, b.y, z + (i % 2 ? 0.013 : -0.013))); });
      var tube = new T3.Mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3(pts), centers.length * 6, 0.0024, 6, false), tm);
      spine.add(tube);
    }
  })();

  /* ---------- foglio che gira: carta che si piega ---------- */
  var SX = 46, SZ = 6;
  var leafGeo = new T3.BufferGeometry();
  (function () {
    var pos = new Float32Array((SX + 1) * (SZ + 1) * 3), uv = [], idx = [];
    for (var j = 0; j <= SZ; j++) for (var i = 0; i <= SX; i++) uv.push(i / SX, 1 - j / SZ);
    for (j = 0; j < SZ; j++) for (i = 0; i < SX; i++) { var a = j * (SX + 1) + i, b = a + SX + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    leafGeo.setAttribute('position', new T3.BufferAttribute(pos, 3));
    leafGeo.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); leafGeo.setIndex(idx);
  })();
  var leafFront = new T3.Mesh(leafGeo, matPaper(null, T3.FrontSide));
  var leafBack = new T3.Mesh(leafGeo, matPaper(null, T3.BackSide));
  leafFront.material.shadowSide = leafBack.material.shadowSide = T3.DoubleSide;
  leafFront.castShadow = leafBack.castShadow = true; leafFront.receiveShadow = leafBack.receiveShadow = true;
  var leafGroup = new T3.Group(); leafGroup.add(leafFront, leafBack); leafGroup.visible = false; book.add(leafGroup);

  var curH = { l: 0, r: 0 };
  function bendLeaf(theta, grabZ, stiff, hy) {
    var p = leafGeo.attributes.position.array, b = Math.sin(theta) * (stiff ? 0.35 : 0.95), du = W / SX, t = theta / Math.PI;
    for (var j = 0; j <= SZ; j++) {
      var v = j / SZ * 2 - 1, corner = grabZ * v * 0.45, x = 0, y = 0;
      for (var i = 0; i <= SX; i++) {
        var u = i / SX, k = (j * (SX + 1) + i) * 3;
        var floor = (x >= 0 ? topY(Math.min(1, x / W), curH.r) : topY(Math.min(1, -x / W), curH.l)) - hy + 0.0009;
        if (y < floor) y = floor;
        p[k] = x; p[k + 1] = y; p[k + 2] = -H / 2 + H * j / SZ;
        var base = theta + (1 - t) * slope(u, curH.r) - t * slope(u, curH.l);
        var phi = Math.min(Math.PI, Math.max(0, base + b * (u * u) * (1 + corner)));
        x += Math.cos(phi) * du; y += Math.sin(phi) * du;
      }
    }
    leafGeo.attributes.position.needsUpdate = true; leafGeo.computeVertexNormals(); leafGeo.computeBoundingSphere();
  }

  /* ---------- stato ---------- */
  var L = 0;                 // fogli già girati a sinistra
  var opened = false, busy = false, dirty = true;
  var flip = null;           // { leaf, theta, target, dir, grabZ, drag }
  function heights(l) { return { left: l > 0 ? COV + (l - 1) * LEAF : 0, right: (NL - l) * LEAF + (l === 0 ? COV - LEAF : 0) + COV }; }
  function layout() {
    var showL = flip ? Math.min(L, flip.leaf) : L, showR = flip ? Math.max(L, flip.leaf + 1) : L;
    var hl = heights(showL).left, hr = heights(showR).right;
    CURVE = opened ? 1 : 0; curH.l = hl; curH.r = hr;
    var rTop = showR < NL ? rectoOf(showR) : null, lTop = showL > 0 ? versoOf(showL - 1) : null;
    R.set(hr, rTop ? tex(rTop) : null, tex('cover-back.webp', true));
    Lft.set(hl, lTop ? tex(lTop) : null, null);
    spine.visible = !opened && L === 0 && !flip;
    if (flip) {
      leafGroup.visible = true;
      var rt = rectoOf(flip.leaf), vt = versoOf(flip.leaf);
      setMap(leafFront.material, rt ? tex(rt) : null); setMap(leafBack.material, vt ? tex(vt, true) : null);
      var hy = (CURVE ? Math.min(Y0, hr) * (1 - flip.theta / Math.PI) + Math.min(Y0, Math.max(hl, 0.0001)) * (flip.theta / Math.PI) : (hr + hl) / 2) + 0.0012;
      leafGroup.position.set(0, hy, 0);
      bendLeaf(flip.theta, flip.grabZ, flip.leaf === 0, hy);
    } else leafGroup.visible = false;
    for (var l = L - 2; l <= L + 3; l++) { if (l < 0 || l >= NL) continue; var a = rectoOf(l), b = versoOf(l); if (a) tex(a); if (b) tex(b, l !== 0); }
    dirty = true;
  }

  /* ---------- camera e vista ---------- */
  var view = { yaw: 1.08, pitch: 0.34, roll: 0, cx: -W / 2, dist: 1, tilt: 0 };
  var goal = null, vel = { yaw: 0, pitch: 0 }, idle = 0;
  function fitDist(wide, high) {
    var a = camera.aspect, t = Math.tan(T3.MathUtils.degToRad(camera.fov / 2));
    return Math.max(high / 2 / t, wide / 2 / (t * a));
  }
  function closedDist() { return camera.aspect < 1 ? fitDist(W * 2.1, H * 1.2) : fitDist(W * 1.45, H * 1.12); }
  function openDist() { return fitDist(2 * W * 1.06, H * 1.3); }
  function applyView() {
    book.position.set(view.cx, -(1 - view.tilt) * (BLOCK + 2 * COV) / 2, 0);
    ground.position.y = -1.5 * (1 - view.tilt) - 0.0005;
    ground.material.opacity = 0.07 + 0.06 * view.tilt;
    world.rotation.set(view.pitch, view.yaw, view.roll, 'YXZ');
    var d = view.dist, el = 0.38 + view.tilt * (1.22 - 0.38);   // elevazione della camera
    camera.position.set(0, Math.sin(el) * d, Math.cos(el) * d);
    camera.lookAt(0, view.tilt * 0.35, view.tilt * 0.12);
  }
  function resize() {
    var w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!goal) view.dist = opened ? openDist() : closedDist();
    dirty = true;
  }
  new ResizeObserver(resize).observe(host);

  function tween(to, ms, done) {
    var from = Object.assign({}, view), t0 = performance.now();
    goal = { step: function (now) {
      var k = Math.min(1, (now - t0) / ms), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      for (var key in to) view[key] = from[key] + (to[key] - from[key]) * e;
      if (k >= 1) { goal = null; done && done(); }
    } };
  }
  function shortAngle(a) { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; }

  function animateFlip(target, ms, done) {
    var from = flip.theta, t0 = performance.now();
    flip.anim = function (now) {
      var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      flip.theta = from + (target - from) * e; layout();
      if (k >= 1) { var f = flip; flip = null; if (target >= Math.PI - 1e-3) L = f.leaf + 1; else L = f.leaf; layout(); done && done(); ui(); }
    };
  }
  function turn(dir) {
    if (!opened || busy || flip) return;
    if (dir > 0 && L >= NL) return; if (dir < 0 && L <= (0)) return;
    if (dir < 0 && L === 1) { close(); return; }
    var leaf = dir > 0 ? L : L - 1;
    flip = { leaf: leaf, theta: dir > 0 ? 0 : Math.PI, grabZ: 0.35 }; layout();
    animateFlip(dir > 0 ? Math.PI : 0, 900);
  }
  function open() {
    if (opened || busy) return; busy = true; vel.yaw = vel.pitch = 0;
    var yaw = shortAngle(view.yaw);
    view.yaw = yaw;
    tween({ yaw: 0, pitch: 0, roll: 0, cx: 0, tilt: 1, dist: openDist() }, 1100, function () {
      opened = true; layout();
      flip = { leaf: 0, theta: 0, grabZ: 0.2 }; layout();
      animateFlip(Math.PI, 1000, function () { busy = false; ui(); });
    });
    ui();
  }
  function close() {
    if (!opened || busy) return; busy = true;
    host.classList.add('fade');
    setTimeout(function () {
      opened = false; L = 0; flip = null; layout();
      view.tilt = 0; view.cx = -W / 2; view.yaw = 1.08; view.pitch = 0.34; view.dist = closedDist();
      host.classList.remove('fade'); busy = false; ui();
    }, 320);
  }

  /* ---------- puntatore ---------- */
  var ray = new T3.Raycaster(), ndc = new T3.Vector2(), plane = new T3.Plane(new T3.Vector3(0, 1, 0), 0), hit = new T3.Vector3();
  function planeX(e) {
    var r = renderer.domElement.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    plane.constant = -(heights(L).right * 0.6);
    if (!ray.ray.intersectPlane(plane, hit)) return null;
    return { x: hit.x, z: hit.z };
  }
  var drag = null;
  var cv = renderer.domElement;
  cv.style.touchAction = 'pan-y';
  cv.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
    if (opened && !busy && !flip) {
      var p = planeX(e);
      if (p && Math.abs(p.z) < H / 2) {
        if (p.x > W * 0.08 && L < NL) drag.leaf = { leaf: L, dir: 1, gz: p.z / (H / 2) };
        else if (p.x < -W * 0.08 && L > 1) drag.leaf = { leaf: L - 1, dir: -1, gz: p.z / (H / 2) };
      }
    }
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) { if (!opened) cv.style.cursor = 'grab'; return; }
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (!opened && !busy) {
      view.yaw += dx * 0.009; view.pitch = Math.max(-1.25, Math.min(1.35, view.pitch + dy * 0.007));
      vel.yaw = dx * 0.009; vel.pitch = dy * 0.007; idle = performance.now(); dirty = true;
    } else if (drag.leaf && drag.moved > 6) {
      if (!flip) { flip = { leaf: drag.leaf.leaf, theta: drag.leaf.dir > 0 ? 0 : Math.PI, grabZ: drag.leaf.gz }; }
      var p = planeX(e);
      if (p && flip) { var c = Math.max(-1, Math.min(1, p.x / W)); flip.theta = Math.acos(c); flip.grabZ = drag.leaf.gz; layout(); }
    }
    drag.x = e.clientX; drag.y = e.clientY;
  });
  function up(e) {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.moved < 6) {
      if (!opened) { open(); return; }
      if (flip && !flip.anim) { flip = null; layout(); }
      var p = planeX(e); if (p) turn(p.x >= 0 ? 1 : -1);
      return;
    }
    if (flip && !flip.anim) {
      var target = flip.theta > Math.PI / 2 ? Math.PI : 0;
      animateFlip(target, 520);
    }
  }
  cv.addEventListener('wheel', function (e) {
    if (opened || busy) return; e.preventDefault();
    var base = closedDist(); view.dist = Math.max(base * 0.28, Math.min(base * 1.4, view.dist * (1 + e.deltaY * 0.0012))); idle = performance.now(); dirty = true;
  }, { passive: false });
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  /* ---------- controlli ---------- */
  var ctl = host.parentNode.querySelector('.libro-ctl');
  var bp = ctl.querySelector('.libro-prev'), bn = ctl.querySelector('.libro-next'), lab = ctl.querySelector('.libro-n'), bo = ctl.querySelector('.libro-open');
  var hint = host.querySelector('.libro-hint');
  if (matchMedia('(pointer: coarse)').matches) { var hp = host.dataset.hintClosed.split(' · '); if (hp.length === 3) host.dataset.hintClosed = hp[0] + ' · ' + hp[2]; }
  function label() {
    if (!opened) return host.dataset.cover;
    var lp = L >= 2 ? 2 * (L - 1) : null, rp = L <= NP / 2 ? 2 * L - 1 : null;
    if (lp && rp) return host.dataset.pn + ' ' + lp + '–' + rp;
    return host.dataset.p1 + ' ' + (lp || rp);
  }
  function ui() {
    lab.textContent = label();
    bp.disabled = !opened || L <= 0; bn.disabled = opened && L >= NL;
    bo.textContent = opened ? host.dataset.close : host.dataset.open;
    host.classList.toggle('is-open', opened);
    if (hint) hint.textContent = opened ? host.dataset.hintOpen : host.dataset.hintClosed;
  }
  bp.addEventListener('click', function () { turn(-1); });
  bn.addEventListener('click', function () { opened ? turn(1) : open(); });
  bo.addEventListener('click', function () { opened ? close() : open(); });
  var vis = false;
  new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis) { dirty = true; loop(); } }, { threshold: 0.05 }).observe(host);
  addEventListener('keydown', function (e) {
    if (!vis) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); opened ? turn(1) : open(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1); }
    else if (e.key === 'Escape') close();
  });

  /* ---------- ciclo ---------- */
  var running = false, t0 = performance.now();
  function loop() {
    if (running) return; running = true;
    requestAnimationFrame(function frame(now) {
      if (!vis) { running = false; return; }
      if (goal) { goal.step(now); dirty = true; }
      if (flip && flip.anim) { flip.anim(now); dirty = true; }
      if (!opened && !drag && !goal) {
        vel.yaw *= 0.92; vel.pitch *= 0.92; view.yaw += vel.yaw; view.pitch = Math.max(-1.25, Math.min(1.35, view.pitch + vel.pitch));
        if (!still && now - idle > 2500) view.yaw += 0.0016;
        dirty = true;
      }
      if (dirty) { applyView(); renderer.render(scene, camera); dirty = false; }
      requestAnimationFrame(frame);
    });
  }
  resize(); layout(); applyView(); ui();
  window.__libro = { flipAt: function (th) { if (!flip) { flip = { leaf: L, theta: th, grabZ: 0.3 }; } flip.theta = th; layout(); }, view: view, setDirty: function(){dirty=true;}, open: open, close: close, turn: turn, state: function () { return { L: L, opened: opened, flip: !!flip }; } };
})();
