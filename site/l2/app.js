/* L2 孩子端 · 页面构建器（公共内核在 ../common/core.js） */
(function () {
  'use strict';

  var play = OE.play, wait = OE.wait, toast = OE.toast, el = OE.el;
  var rec = OE.rec, holdButton = OE.holdButton, saveClip = OE.saveClip;
  var confetti = OE.confetti;

  /* "hot dog" → a_hotdog */
  function slug(w) { return String(w).toLowerCase().replace(/[^a-z]/g, ''); }

  var BUILDERS = {};

  /* ① 打招呼 + 复习 L1 单词 */
  BUILDERS.hello = function (root) {
    var wrap = el('div', 'beat-wrap');
    var beat = el('div', 'beat');
    var img = el('img');
    img.src = LESSON.chars.mia.img;
    img.alt = 'Mia';
    beat.appendChild(img);

    var line = el('div', 'chant-line', 'Tap the button and sing!<small>点一下开始唱歌</small>');
    var btn = el('button', 'big coral', '▶ Sing the song<small>唱问候歌</small>');
    var row = el('div', 'row');
    row.appendChild(btn);
    wrap.appendChild(beat);
    wrap.appendChild(line);
    wrap.appendChild(row);
    root.appendChild(wrap);

    var singing = false;
    btn.addEventListener('click', function () {
      if (singing) return;
      singing = true;
      btn.setAttribute('disabled', 'disabled');
      beat.classList.add('beating');
      var i = 0;
      (function next() {
        if (i >= LESSON.chant.length) {
          beat.classList.remove('beating');
          line.innerHTML = 'Well done!<small>复习时间到！</small>';
          btn.removeAttribute('disabled');
          singing = false;
          return;
        }
        var c = LESSON.chant[i++];
        line.innerHTML = c.text + '<small>' + c.zh + '</small>';
        OE.blip();
        play(c.audio).then(function () { OE.blip(); wait(250).then(next); });
      })();
    });

    root.appendChild(el('p', 'sub', '还记得这些吗？点一下听听看<br>Quick review from L1'));
    var rr = el('div', 'reviewrow');
    LESSON.review.forEach(function (r) {
      var b = el('button', 'reviewcard', r.word + '<small>🔊 ' + r.zh + '</small>');
      b.addEventListener('click', function () { play(r.audio); });
      rr.appendChild(b);
    });
    root.appendChild(rr);
  };

  /* ② 魔法袋 */
  BUILDERS.bag = function (root) {
    var stage = el('div', 'bagstage');
    var bagImg = el('img', 'bag');
    bagImg.src = LESSON.img(LESSON.bag.img);
    bagImg.alt = 'magic bag';
    stage.appendChild(bagImg);

    var slot = el('div');
    stage.appendChild(slot);

    var tip = el('p', 'sub', '点一下魔法袋，把东西摸出来<br>Tap the bag and pull an item out');
    stage.appendChild(tip);

    var row = el('div', 'row');
    var pullBtn = el('button', 'big coral', '🎁 Pull it out!<small>摸一样出来</small>');
    row.appendChild(pullBtn);
    stage.appendChild(row);
    root.appendChild(stage);

    var clipBox = el('div', 'clips');
    root.appendChild(clipBox);

    var idx = 0;

    function showItem() {
      var it = LESSON.bag.items[idx];
      var card = el('div', 'popcard');
      var im = el('img');
      im.src = LESSON.img(it.card);
      im.alt = it.word;
      card.appendChild(im);
      var tx = el('div');
      tx.appendChild(el('div', 'w', it.word));
      tx.appendChild(el('div', 'z', it.zh));
      card.appendChild(tx);
      slot.innerHTML = '';
      slot.appendChild(card);

      /* 老师读 3 遍 */
      play(it.audio).then(function () { wait(500); return play(it.audio); }).then(function () {
        wait(500); return play(it.audio);
      });

      /* 孩子跟读 */
      var recWrap = el('div');
      recWrap.style.marginTop = '10px';
      recWrap.appendChild(holdButton({
        name: 'L2-word-' + slug(it.word),
        label: '🎤 Hold to say it!<small>按住说：' + it.word + '</small>',
        holding: '🎤 Recording...',
        onDone: function (clip) {
          toast('Good!');
          clipBox.appendChild(OE.clipBar(clip, it.word));
          var next = el('button', 'big teal', 'Next ➜<small>下一个</small>');
          next.style.marginTop = '10px';
          next.addEventListener('click', function () {
            idx++;
            if (idx >= LESSON.bag.items.length) {
              slot.innerHTML = '';
              recWrap.innerHTML = '';
              next.remove();
              tip.innerHTML = '袋子里都摸完啦！<br>You found everything!';
              pullBtn.innerHTML = '🎉 All done!<small>摸完啦</small>';
              pullBtn.setAttribute('disabled', 'disabled');
              play('prompt_great');
              return;
            }
            showItem();
          });
          recWrap.appendChild(next);
        }
      }));
      slot.appendChild(recWrap);
    }

    pullBtn.addEventListener('click', function () {
      if (idx >= LESSON.bag.items.length) return;
      bagImg.classList.remove('shake');
      void bagImg.offsetWidth;
      bagImg.classList.add('shake');
      play('prompt_magic');
      wait(400).then(showItem);
    });
  };

  /* ③ 听音选图：在房间里找到听到的东西 */
  BUILDERS.pick = function (root) {
    root.appendChild(el('p', 'sub', '听到什么就点房间里那一样<br>Hear the word, then tap it in the room'));

    var sc = el('div', 'scene');
    var img = el('img');
    img.src = LESSON.img(LESSON.scene.file);
    img.alt = LESSON.scene.alt;
    sc.appendChild(img);

    var hots = {};
    LESSON.scene.hotspots.forEach(function (h) {
      var b = el('button', 'hot');
      b.style.left = h.x + '%';
      b.style.top = h.y + '%';
      b.setAttribute('aria-label', h.word);
      b.addEventListener('click', function () { tap(h); });
      hots[h.id] = b;
      sc.appendChild(b);
    });
    root.appendChild(sc);

    var row = el('div', 'row');
    var playBtn = el('button', 'big coral', '🔊 Play all<small>开始听</small>');
    var againBtn = el('button', 'big', '🔁 Again<small>再听一遍</small>');
    row.appendChild(playBtn);
    row.appendChild(againBtn);
    root.appendChild(row);

    var order = LESSON.scene.hotspots.map(function (h) { return h.id; });
    var pos = -1;
    var running = false;

    function say(id) {
      var h = LESSON.scene.hotspots.filter(function (x) { return x.id === id; })[0];
      return play(h.audio);
    }

    function tap(h) {
      if (!running) { say(h.id); return; }
      if (h.id === order[pos]) {
        hots[h.id].classList.add('found');
        play('prompt_great');
        wait(900).then(function () {
          pos++;
          if (pos >= order.length) {
            running = false;
            toast('All done! 全都找到了');
            play('prompt_welldone');
          } else {
            say(order[pos]);
          }
        });
      } else {
        var b = hots[h.id];
        b.classList.remove('wrong');
        void b.offsetWidth;
        b.classList.add('wrong');
      }
    }

    function start() {
      if (running) return;
      order.forEach(function (id) { hots[id].classList.remove('found'); });
      pos = 0;
      running = true;
      say(order[pos]);
    }

    playBtn.addEventListener('click', start);
    againBtn.addEventListener('click', function () {
      if (running && pos >= 0) say(order[pos]);
      else start();
    });

    /* 词卡：点一下听发音 */
    var wr = el('div', 'wordrow');
    LESSON.scene.hotspots.forEach(function (h) {
      var b = el('button', 'wordcard');
      var ci = el('img');
      ci.src = LESSON.img(h.card);
      ci.alt = h.word;
      b.appendChild(ci);
      b.appendChild(el('b', '', h.word));
      b.addEventListener('click', function () { play(h.audio); });
      wr.appendChild(b);
    });
    root.appendChild(wr);
  };

  /* ④ 句型操练：问 → 选 → 跟说 */
  BUILDERS.drill = function (root) {
    var state = { i: 0, token: 0, recording: false };

    function renderDrill() {
      root.innerHTML = '';
      var d = LESSON.drills[state.i];
      var c = LESSON.chars[d.asker];

      var q = el('div', 'qbox');
      var im = el('img');
      im.src = c.img;
      im.alt = c.name;
      q.appendChild(im);
      var tx = el('div');
      tx.appendChild(el('div', 'en', d.question));
      tx.appendChild(el('div', 'zh', d.qZh));
      q.appendChild(tx);
      root.appendChild(q);

      var opts = el('div', 'opts');
      var cards = {};
      d.options.forEach(function (w) {
        var b = el('button', 'opt');
        var oi = el('img');
        oi.src = LESSON.img('card_' + slug(w));
        oi.alt = w;
        b.appendChild(oi);
        b.appendChild(el('b', '', w));
        b.addEventListener('click', function () { choose(w); });
        cards[w] = b;
        opts.appendChild(b);
      });
      root.appendChild(opts);

      var turn = el('div', 'yourturn');
      turn.innerHTML = 'Say it!<div class="say" id="drill-say">I like …</div><div class="zh">选出你喜欢的，然后说出来</div>';
      root.appendChild(turn);

      var row = el('div', 'row');
      var againBtn = el('button', 'big', '🔁 Hear again<small>再听一遍问题</small>');
      row.appendChild(againBtn);
      root.appendChild(row);

      var clipBox = el('div', 'clips');
      root.appendChild(clipBox);

      againBtn.addEventListener('click', function () { play(d.qAudio); });

      function choose(w) {
        if (state.recording) return;
        Object.keys(cards).forEach(function (k) { cards[k].classList.remove('sel'); });
        cards[w].classList.add('sel');
        var sayEl = turn.querySelector('#drill-say');
        sayEl.textContent = 'I like ' + w + '.';
        turn.querySelector('.zh').textContent = '跟着说：I like ' + w + '.';

        /* 先听老师示范 */
        play('a_' + slug(w)).then(function () {
          wait(400).then(beginRec);
        });
      }

      var token = ++state.token;

      function beginRec() {
        if (token !== state.token) return;
        if (!rec.supported) { toast('这台设备不能录音'); return; }
        rec.start().then(function () {
          if (token !== state.token) { rec.stop(); return; }
          state.recording = true;
          turn.classList.add('live');
          var stop = el('button', 'big stop', '⏹ Stop!<small>说完了</small>');
          stop.addEventListener('click', function () {
            if (!state.recording) return;
            state.recording = false;
            stop.setAttribute('disabled', 'disabled');
            rec.stop().then(function (blob) {
              if (blob) {
                var clip = saveClip('L2-like-' + slug(state.i), blob);
                clipBox.appendChild(OE.clipBar(clip, 'I like ' + Object.keys(cards).filter(function (k) { return cards[k].classList.contains('sel'); })[0]));
                play('prompt_great');
              }
              wait(1500).then(function () {
                state.i++;
                if (state.i >= LESSON.drills.length) { roleReverse(); return; }
                renderDrill();
              });
            });
          });
          row.appendChild(stop);
        }).catch(function () { toast('需要麦克风权限'); });
      }

      /* 老师问 */
      play(d.qAudio);
    }

    /* 角色反转：孩子当小老师来问 */
    function roleReverse() {
      root.innerHTML = '';
      root.appendChild(el('p', 'sub', '现在轮到你当老师！问一句<br>Your turn to ask the question'));

      var q = el('div', 'qbox');
      var im = el('img');
      im.src = LESSON.chars.mia.img;
      im.alt = 'Mia';
      q.appendChild(im);
      var tx = el('div');
      tx.appendChild(el('div', 'en', "What's your favorite fruit?"));
      tx.appendChild(el('div', 'zh', '你最喜欢什么水果？'));
      q.appendChild(tx);
      root.appendChild(q);

      var clipBox = el('div', 'clips');
      root.appendChild(clipBox);

      var wrap = el('div', 'rec-wrap');
      var recBtn = holdButton({
        name: 'L2-ask',
        label: '🎤 Hold to ask!<small>按住问出来</small>',
        holding: '🎤 Recording...',
        onDone: function (clip) {
          toast('Great question!');
          clipBox.appendChild(OE.clipBar(clip, 'My question'));
          play('a_grapes');
          wait(1500).then(function () {
            root.appendChild(el('p', 'sub', '听听 Mia 怎么回答 / How Mia answers'));
          });
        }
      });
      wrap.appendChild(recBtn);
      root.appendChild(wrap);
    }

    renderDrill();
  };

  /* ⑤ 我的三样最爱 */
  BUILDERS.show = function (root) {
    root.appendChild(el('p', 'sub', '挑出你最喜欢的三样<br>Pick your three favorite things'));

    var picked = [];
    var row = el('div', 'favrow');
    var cards = {};
    LESSON.favorites.forEach(function (w) {
      var b = el('button', 'favcard');
      var im = el('img');
      im.src = LESSON.img('card_' + slug(w));
      im.alt = w;
      b.appendChild(im);
      b.appendChild(el('b', '', w));
      b.addEventListener('click', function () { toggle(w); });
      cards[w] = b;
      row.appendChild(b);
    });
    root.appendChild(row);

    var sentence = el('div', 'sentence', '<em>I like</em> … <em>I like</em> … <em>I like</em> …');
    root.appendChild(sentence);

    var recWrap = el('div', 'rec-wrap');
    root.appendChild(recWrap);

    var clipBox = el('div', 'clips');
    root.appendChild(clipBox);

    function toggle(w) {
      var i = picked.indexOf(w);
      if (i >= 0) {
        picked.splice(i, 1);
        cards[w].classList.remove('sel');
      } else {
        if (picked.length >= 3) { toast('只能选三样，先点掉一个'); return; }
        picked.push(w);
        cards[w].classList.add('sel');
        play('word_' + slug(w));
      }
      update();
    }

    function update() {
      sentence.innerHTML = picked.map(function (w) { return '<em>I like</em> ' + w + '.'; }).join(' ');
      if (picked.length === 3) {
        recWrap.innerHTML = '';
        recWrap.appendChild(holdButton({
          name: 'L2-favorites',
          label: '🎤 Hold to say your 3!<small>按住说出你的三样最爱</small>',
          holding: '🎤 Recording...',
          onDone: function (clip) {
            toast('太棒了！');
            play('prompt_welldone');
            confetti();
            clipBox.appendChild(OE.clipBar(clip, 'My 3 favorites'));
          }
        }));
      } else {
        recWrap.innerHTML = '';
        recWrap.appendChild(el('p', 'hint', '还差 ' + (3 - picked.length) + ' 样 / pick ' + (3 - picked.length) + ' more'));
      }
    }

    update();
  };

  OE.start(LESSON, BUILDERS);
})();
