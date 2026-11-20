/* L1 孩子端 · 页面构建器（公共内核在 ../common/core.js）
 * 每一页对应 LESSON.stages 里的一个 stage id。
 */
(function () {
  'use strict';

  var play = OE.play, wait = OE.wait, toast = OE.toast, el = OE.el;
  var rec = OE.rec, holdButton = OE.holdButton, saveClip = OE.saveClip;
  var confetti = OE.confetti, downloadClip = OE.downloadClip;

  var BUILDERS = {};

  /* ① Hello 仪式 */
  BUILDERS.hello = function (root) {
    var wrap = el('div', 'beat-wrap');
    var beat = el('div', 'beat');
    var img = el('img');
    img.src = LESSON.img('mia');
    img.alt = 'Mia';
    beat.appendChild(img);

    var line = el('div', 'chant-line', 'Tap the button and sing!<small>点一下开始唱歌</small>');
    var btn = el('button', 'big coral', '▶ Sing the song<small>唱问候歌</small>');
    var row = el('div', 'row');
    row.appendChild(btn);

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
          line.innerHTML = 'Well done!<small>唱完啦，该你啦</small>';
          btn.removeAttribute('disabled');
          singing = false;
          play('prompt_yourturn');
          return;
        }
        var c = LESSON.chant[i++];
        line.innerHTML = c.text + '<small>' + c.zh + '</small>';
        OE.blip();
        play(c.audio).then(function () {
          OE.blip();
          wait(250).then(next);
        });
      })();
    });

    wrap.appendChild(beat);
    wrap.appendChild(line);
    wrap.appendChild(row);
    root.appendChild(wrap);

    /* 唱完后：轮到孩子说 */
    var turn = el('div');
    turn.style.marginTop = '16px';
    turn.appendChild(holdButton({
      name: 'L1-hello',
      label: '🎤 Hold to say hello!<small>按住说：Hello, I\'m ___</small>',
      holding: '🎤 Recording...',
      onDone: function (clip) {
        toast('录好啦！');
        turn.appendChild(OE.clipBar(clip, 'My hello'));
      }
    }));
    root.appendChild(turn);
  };

  /* ② 看图说话 */
  BUILDERS.see = function (root) {
    var sc = el('div', 'scene');
    var img = el('img');
    img.src = LESSON.img(LESSON.scene.file);
    img.alt = LESSON.scene.alt;
    sc.appendChild(img);

    var found = {};
    LESSON.scene.hotspots.forEach(function (h) {
      var b = el('button', 'hot');
      b.style.left = h.x + '%';
      b.style.top = h.y + '%';
      b.setAttribute('aria-label', h.word);
      b.addEventListener('click', function () {
        if (found[h.id]) { play('word_' + h.word); return; }
        found[h.id] = true;
        b.classList.add('found');
        play('word_' + h.word);
        var card = cardOf(h.word);
        if (card) card.classList.add('found');
        var n = Object.keys(found).length;
        if (n === LESSON.scene.hotspots.length) {
          play('prompt_great');
          toast('Great job! 你都找到了');
        }
      });
      sc.appendChild(b);
    });
    root.appendChild(sc);

    /* 词卡 */
    var row = el('div', 'wordrow');
    var cards = {};
    LESSON.wordCards.forEach(function (w) {
      var b = el('button', 'wordcard');
      var ci = el('img');
      ci.src = LESSON.img('card_' + w);
      ci.alt = w;
      b.appendChild(ci);
      b.appendChild(el('b', '', w));
      b.addEventListener('click', function () { play('word_' + w); });
      cards[w] = b;
      row.appendChild(b);
    });
    root.appendChild(row);

    function cardOf(w) { return cards[w]; }
  };

  /* ③ 听音贴一贴 */
  BUILDERS.listen = function (root) {
    var prompt = el('p', 'sub', '听一听，听到哪个就点哪个图<br>Hear it, then tap the picture');
    root.appendChild(prompt);

    var grid = el('div', 'slots');
    var slots = {};
    LESSON.listenItems.forEach(function (item) {
      var b = el('button', 'slot');
      var im = el('img');
      im.src = LESSON.img('card_' + item.word);
      im.alt = item.word;
      b.appendChild(im);
      slots[item.word] = b;
      b.addEventListener('click', function () { tap(item.word); });
      grid.appendChild(b);
    });
    root.appendChild(grid);

    var row = el('div', 'row');
    var playBtn = el('button', 'big coral', '🔊 Play all<small>开始听</small>');
    var repeatBtn = el('button', 'big', '🔁 Again<small>再听一遍</small>');
    row.appendChild(playBtn);
    row.appendChild(repeatBtn);
    root.appendChild(row);

    var order = LESSON.listenItems.map(function (i) { return i.word; });
    var pos = -1;
    var running = false;

    function sayItem(word) {
      var item = LESSON.listenItems.filter(function (i) { return i.word === word; })[0];
      return play(item.audio);
    }

    function tap(word) {
      if (!running) { sayItem(word); return; }
      if (word === order[pos]) {
        var s = slots[word];
        s.classList.add('done');
        play('prompt_great');
        wait(700).then(function () {
          pos++;
          if (pos >= order.length) {
            running = false;
            toast('All done! 贴纸贴好啦');
            play('prompt_welldone');
          } else {
            sayItem(order[pos]);
          }
        });
      } else {
        var s2 = slots[word];
        s2.classList.remove('wrong');
        void s2.offsetWidth;
        s2.classList.add('wrong');
      }
    }

    function start() {
      if (running) return;
      order.forEach(function (w) { slots[w].classList.remove('done'); });
      pos = 0;
      running = true;
      sayItem(order[pos]);
    }

    playBtn.addEventListener('click', start);
    repeatBtn.addEventListener('click', function () {
      if (running && pos >= 0) sayItem(order[pos]);
      else start();
    });
  };

  /* ④ 演一演 —— 角色扮演：选角色 → 对手说 → 自动开录 → 孩子说 → 停止 → 下一句 */
  BUILDERS.act = function (root) {
    var state = { who: null, round: 0, recording: false, busy: false, token: 0 };

    /* ---- 选角色 ---- */
    function showPick() {
      root.innerHTML = '';
      root.appendChild(el('p', 'sub', 'Who do you want to be?<br>你想演 Mia 还是 Ben？'));
      var row = el('div', 'pickrow');
      ['mia', 'ben'].forEach(function (k) {
        var c = LESSON.chars[k];
        var b = el('button', 'pickcard');
        var im = el('img');
        im.src = LESSON.img(c.img);
        im.alt = c.name;
        b.appendChild(im);
        b.appendChild(el('b', '', 'You are ' + c.name));
        b.appendChild(el('small', '', '你演 ' + c.name));
        b.addEventListener('click', function () { start(k); });
        row.appendChild(b);
      });
      root.appendChild(row);
    }

    /* ---- 一轮角色扮演 ---- */
    function renderRound() {
      root.innerHTML = '';
      var rounds = LESSON.roleplay.rounds;
      var r = rounds[state.round];
      var partnerKey = state.who === 'mia' ? 'ben' : 'mia';
      var partner = r[partnerKey];
      var target = state.who === 'mia' ? r.replyMia : r.replyBen;

      /* 角色头像：对手亮着，孩子自己的一侧标 "YOU" */
      var actors = el('div', 'actors');
      var order = state.who === 'mia' ? ['ben', 'mia'] : ['mia', 'ben'];
      order.forEach(function (k) {
        var c = LESSON.chars[k];
        var b = el('div', 'actor static' + (k === partnerKey ? ' on' : '') + (k === state.who ? ' me' : ''));
        var im = el('img');
        im.src = LESSON.img(c.img);
        im.alt = c.name;
        b.appendChild(im);
        b.appendChild(el('span', 'nm', c.name));
        actors.appendChild(b);
      });
      root.appendChild(actors);

      var bubble = el('div', 'bubble');
      bubble.appendChild(el('div', 'who', LESSON.chars[partnerKey].name + ' says'));
      bubble.appendChild(el('div', 'en', partner.text));
      bubble.appendChild(el('div', 'zh', partner.zh));
      root.appendChild(bubble);

      var turn = el('div', 'yourturn');
      turn.innerHTML = 'Your turn! Say:<div class="say">' + target.text + '</div><div class="zh">' + target.zh + '</div>';
      root.appendChild(turn);

      var row = el('div', 'row');
      var again = el('button', 'big', '🔁 Hear again<small>再听一遍</small>');
      var stop = el('button', 'big stop', "⏹ I'm done!<small>我说完了</small>");
      stop.setAttribute('disabled', 'disabled');
      row.appendChild(again);
      row.appendChild(stop);
      root.appendChild(row);

      var clipBox = el('div', 'clips');
      root.appendChild(clipBox);

      again.addEventListener('click', function () {
        if (!state.recording) play(partner.audio);
      });

      stop.addEventListener('click', function () {
        if (!state.recording) return;
        state.recording = false;
        stop.setAttribute('disabled', 'disabled');
        stop.innerHTML = '⏹ Saving…';
        rec.stop().then(function (blob) {
          if (!blob) {
            toast('没录到声音，再试一次');
            stop.removeAttribute('disabled');
            stop.innerHTML = "⏹ I'm done!<small>我说完了</small>";
            return;
          }
          var clip = saveClip('L1-role-' + (state.round + 1), blob);
          clipBox.innerHTML = '';
          clipBox.appendChild(OE.clipBar(clip, 'Your answer ' + (state.round + 1)));
          play('prompt_great');
          wait(2000).then(function () {
            state.round++;
            if (state.round >= rounds.length) { finish(); return; }
            renderRound();
          });
        });
      });

      function addSkip() {
        var skip = el('button', 'big', 'Skip ⏭<small>跳过这一句</small>');
        skip.addEventListener('click', function () {
          state.round++;
          if (state.round >= rounds.length) { finish(); return; }
          renderRound();
        });
        row.appendChild(skip);
      }

      /* 对手先说，说完自动开录（token 防止上一轮的延迟回调串场） */
      var token = ++state.token;
      play(partner.audio).then(function () {
        if (token !== state.token) return;
        wait(500).then(function () {
          if (token !== state.token) return;
          beginRec();
        });
      });

      function beginRec() {
        if (!rec.supported) { toast('这台设备不能录音'); addSkip(); return; }
        rec.start().then(function () {
          state.recording = true;
          stop.removeAttribute('disabled');
          stop.innerHTML = '⏹ Stop!<small>停止录音</small>';
          stop.classList.add('recording');
          turn.classList.add('live');
        }).catch(function () {
          toast('需要麦克风权限');
          addSkip();
        });
      }
    }

    function finish() {
      root.innerHTML = '';
      root.appendChild(el('div', 'stars', '<span class="star lit">⭐</span>'));
      root.appendChild(el('p', 'sub', 'You were a great actor!<br>演完啦，去领星星！'));
      play('prompt_welldone');
      confetti();
    }

    function start(who) {
      state.who = who;
      state.round = 0;
      play('prompt_listen');
      renderRound();
    }

    showPick();
  };

  /* ⑤ 星星 + 成果 */
  BUILDERS.show = function (root) {
    var box = el('div', 'stars');
    var lit = Math.max(1, Math.min(5, idx + 1));
    for (var i = 0; i < 5; i++) {
      var st = el('span', 'star' + (i < lit ? ' lit' : ''), '⭐');
      box.appendChild(st);
    }
    root.appendChild(box);

    root.appendChild(el('p', 'sub', 'Say the whole show to your family!<small>把整段小剧场说给家人听</small>'));

    var wrap = el('div', 'rec-wrap');
    var recBtn = holdButton({
      name: 'L1-show',
      label: '🎤 Hold to say it all!<small>按住说完整段</small>',
      holding: '🎤 Recording...',
      onDone: function () {
        toast('太棒了！');
        play('prompt_welldone');
        confetti();
        renderClips();
      }
    });
    wrap.appendChild(recBtn);
    root.appendChild(wrap);

    var clipBox = el('div', 'clips');
    root.appendChild(clipBox);

    function renderClips() {
      clipBox.innerHTML = '';
      if (!OE.clips.length) {
        clipBox.appendChild(el('p', 'hint', '你的录音会出现在这里 / Your recordings show up here'));
        return;
      }
      OE.clips.forEach(function (c) {
        clipBox.appendChild(OE.clipBar(c, c.name));
      });
      var all = el('button', 'big teal', '⬇ Download all<small>下载全部录音</small>');
      all.style.marginTop = '8px';
      all.addEventListener('click', function () {
        OE.clips.forEach(function (c, i) { setTimeout(function () { downloadClip(c, c.name); }, i * 600); });
      });
      clipBox.appendChild(all);
    }
    renderClips();
  };

  OE.start(LESSON, BUILDERS);
})();
