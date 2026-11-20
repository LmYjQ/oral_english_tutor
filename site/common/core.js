/* 自研素材口语课 · 公共内核
 * 音频播放 / 录音 / 提示条 / 进度导航 —— L1–L4 共用。
 * 每节课只需提供：lesson.js（数据） + app.js（本课的 BUILDERS）。
 */
window.OE = (function () {
  'use strict';

  var L = null;          // 当前课时的数据（lesson.js 里的 LESSON）
  var BUILDERS = null;   // 当前课时的页面构建器

  var $ = function (s) { return document.querySelector(s); };
  var stageEl, dotsEl, toastEl;

  var idx = 0;                       // 当前阶段
  var muted = false;
  var clips = [];                    // 录音片段 {name, blob, url}
  var stars = 0;                     // 已点亮星星

  /* ---------------------------------------------------------- 音频 */
  var audioCtx = null;
  var player = new Audio();
  player.preload = 'auto';

  function unlockAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  document.addEventListener('pointerdown', unlockAudio);

  function play(name, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (muted) { resolve(); return; }
      player.pause();
      player.src = L.audio(name);
      player.playbackRate = opts.rate || 1;
      player.onended = function () { if (opts.onend) opts.onend(); resolve(); };
      player.onerror = function () { resolve(); };
      var p = player.play();
      if (p && p.catch) p.catch(function () { toast('点一下屏幕再试'); resolve(); });
    });
  }

  function blip() {                   // 节拍声（陪唱用，很轻）
    if (!audioCtx || muted) return;
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 720;
    g.gain.value = 0.045;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.11);
    o.stop(audioCtx.currentTime + 0.12);
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------------------------------------------------------- 提示 */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 1600);
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ---------------------------------------------------------- 录音 */
  var rec = {
    stream: null, mr: null, chunks: [], mime: '',
    supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder),
    start: function () {
      var self = this;
      return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        self.stream = stream;
        var types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
        self.mime = types.filter(function (t) { return MediaRecorder.isTypeSupported(t); })[0] || '';
        self.chunks = [];
        self.mr = new MediaRecorder(stream, self.mime ? { mimeType: self.mime } : undefined);
        self.mr.ondataavailable = function (e) { if (e.data && e.data.size) self.chunks.push(e.data); };
        self.mr.start();
      });
    },
    stop: function () {
      var self = this;
      return new Promise(function (resolve) {
        if (!self.mr) { resolve(null); return; }
        self.mr.onstop = function () {
          var type = self.mr.mimeType || 'audio/webm';
          var blob = new Blob(self.chunks, { type: type });
          if (self.stream) self.stream.getTracks().forEach(function (t) { t.stop(); });
          resolve(blob.size > 0 ? blob : null);
        };
        try { self.mr.stop(); } catch (e) { resolve(null); }
      });
    },
    ext: function () {
      var m = (this.mr && this.mr.mimeType) || 'audio/webm';
      return m.indexOf('mp4') >= 0 ? 'm4a' : (m.indexOf('aac') >= 0 ? 'aac' : 'webm');
    }
  };

  function saveClip(name, blob) {
    var url = URL.createObjectURL(blob);
    clips.push({ name: name, blob: blob, url: url });
    return clips[clips.length - 1];
  }

  /* 按住说话按钮 */
  function holdButton(opts) {
    var b = el('button', 'rec-btn', opts.label);
    b.setAttribute('type', 'button');
    var holding = false;
    var starting = null;      // 权限请求还没回来时，先记着

    function down(e) {
      e.preventDefault();
      if (holding) return;
      holding = true;
      b.classList.add('recording');
      b.innerHTML = opts.holding || 'Recording...';
      if (!rec.supported) { toast('这台设备不能录音'); reset(); return; }
      starting = rec.start().catch(function () {
        toast('需要麦克风权限');
        reset();
      });
    }

    function reset() {
      holding = false;
      starting = null;
      b.classList.remove('recording');
      b.innerHTML = opts.label;
    }

    function up() {
      if (!holding) return;
      holding = false;
      b.classList.remove('recording');
      b.innerHTML = opts.label;
      var done = function (blob) {
        if (!blob) { toast('没录到声音，再试一次'); return; }
        var clip = saveClip(opts.name, blob);
        if (opts.onDone) opts.onDone(clip);
      };
      // 等麦克风权限回来再停，否则短按会录不到
      if (starting) { starting.then(function () { rec.stop().then(done); }); starting = null; }
      else rec.stop().then(done);
    }

    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    // 手指滑出按钮外也算松手（iOS 上 pointerleave 会在滑动时误触发）
    document.addEventListener('pointerup', function () { if (holding) up(); });
    document.addEventListener('pointercancel', function () { if (holding) up(); });
    return b;
  }

  /* ---------------------------------------------------------- 通用片段 */
  function downloadClip(clip, name) {
    var a = document.createElement('a');
    a.href = clip.url;
    a.download = name + '.' + (rec.ext() || 'webm');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function confetti() {
    var box = el('div', 'confetti');
    var colors = ['#ff8a65', '#38b2ac', '#ffc93c', '#845ef7', '#4dabf7'];
    for (var i = 0; i < 60; i++) {
      var p = el('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (2 + Math.random() * 2) + 's';
      p.style.animationDelay = (Math.random() * .8) + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 5000);
  }

  /* 录音条（回放 + 下载），各课共用 */
  function clipBar(clip, label) {
    var bar = el('div', 'clip');
    bar.appendChild(el('span', 'nm', label || clip.name));
    var pb = el('button', '', '▶');
    pb.addEventListener('click', function () { new Audio(clip.url).play(); });
    bar.appendChild(pb);
    var dl = el('button', 'dl', '⬇');
    dl.addEventListener('click', function () { downloadClip(clip, clip.name); });
    bar.appendChild(dl);
    return bar;
  }

  /* ---------------------------------------------------------- 导航 */
  function buildDots() {
    dotsEl.innerHTML = '';
    L.stages.forEach(function (s, i) {
      var d = el('button', 'dot', s.en + '<span class="zh">' + s.zh + '</span>');
      d.addEventListener('click', function () { go(i); });
      dotsEl.appendChild(d);
    });
  }

  function refreshDots() {
    var kids = dotsEl.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].classList.toggle('active', i === idx);
      kids[i].classList.toggle('done', i < idx);
    }
    $('#progress-fill').style.width = ((idx + 1) / L.stages.length * 100) + '%';
  }

  function go(n) {
    idx = Math.max(0, Math.min(L.stages.length - 1, n));
    stageEl.innerHTML = '';
    stageEl.scrollTop = 0;
    var screen = el('div', 'screen');
    var st = L.stages[idx];
    screen.appendChild(el('div', 'pill', st.en));
    screen.appendChild(el('h1', '', st.zh));
    BUILDERS[st.id](screen);
    stageEl.appendChild(screen);
    refreshDots();
    $('#btn-back').disabled = (idx === 0);
    $('#btn-next').innerHTML = (idx === L.stages.length - 1 ? 'Home<small>回到首页</small>' : 'Next ▶<small>下一步</small>');
  }

  function start(lesson, builders) {
    L = lesson;
    BUILDERS = builders;
    stageEl = $('#stage');
    dotsEl = $('#dots');
    toastEl = $('#toast');

    $('#btn-next').addEventListener('click', function () {
      if (idx === L.stages.length - 1) { location.href = '../index.html'; return; }
      if (idx + 1 > stars) stars = idx + 1;
      go(idx + 1);
    });
    $('#btn-back').addEventListener('click', function () { go(idx - 1); });

    $('#btn-sound').addEventListener('click', function () {
      muted = !muted;
      this.textContent = muted ? '🔇' : '🔊';
      if (muted) player.pause();
    });

    $('#btn-reset').addEventListener('click', function () {
      clips.forEach(function (c) { URL.revokeObjectURL(c.url); });
      clips = [];
      stars = 0;
      go(0);
    });

    buildDots();
    go(0);
  }

  return {
    start: start,
    play: play,
    blip: blip,
    wait: wait,
    toast: toast,
    el: el,
    rec: rec,
    holdButton: holdButton,
    saveClip: saveClip,
    clipBar: clipBar,
    downloadClip: downloadClip,
    confetti: confetti,
    get clips() { return clips; }
  };
})();
