// 单元首页：课时卡 + 素材清单
(function () {
  var LESSONS = [
    { no: 'L1', en: 'Hello!', zh: '认识新朋友', task: '在一场生日会上认识 Mia 和 Ben', ready: true, href: 'l1/' },
    { no: 'L2', en: 'My Favorite Things', zh: '我喜欢什么', task: '用「魔法袋」摸出并说出喜好', ready: true, href: 'l2/' },
    { no: 'L3', en: 'Talk with Ben', zh: '和 Ben 聊天', task: '完成一整轮 6 问 6 答', ready: false },
    { no: 'L4', en: 'All About Me!', zh: '我的小演讲', task: '照着自画像说 30 秒自我介绍', ready: false },
  ];

  var box = document.getElementById('lessons');
  LESSONS.forEach(function (l) {
    var tag = l.ready
      ? '<a class="lesson" href="' + l.href + '"><span class="no">' + l.no + '</span>' +
        '<h3>' + l.en + ' · ' + l.zh + '</h3><p>' + l.task + '</p>' +
        '<span class="tag">▶ 开始上课</span></a>'
      : '<div class="lesson soon"><span class="no">' + l.no + '</span>' +
        '<h3>' + l.en + ' · ' + l.zh + '</h3><p>' + l.task + '</p>' +
        '<span class="tag">制作中</span></div>';
    box.insertAdjacentHTML('beforeend', tag);
  });

  var assets = document.getElementById('assets');
  var manifestUrls = ['assets/unit1/L1/index.json', 'assets/unit1/L2/index.json'];
  Promise.all(manifestUrls.map(function (u) {
    return fetch(u).then(function (r) { return r.json(); });
  })).then(function (list) {
    var rows = '<tr><th>课时</th><th>图片</th><th>音频</th><th>状态</th></tr>';
    list.forEach(function (d) {
      var imgs = (d.images || []).length;
      var auds = (d.audio || []).length;
      var okAll = imgs && auds;
      rows += '<tr><td>' + (d.lesson || '?') + '</td><td>' + imgs + ' 张</td><td>' + auds + ' 条</td>' +
        '<td class="' + (okAll ? 'ok' : 'miss') + '">' + (okAll ? '✅ 已就绪' : '—') + '</td></tr>';
    });
    var prov = list.map(function (d) { return d.image_provider; }).filter(Boolean).join(' / ');
    rows += '<tr><td>生成器</td><td colspan="2"><code>' + (prov || '-') + '</code></td><td class="ok">AI 生成</td></tr>';
    assets.innerHTML = '<table>' + rows + '</table>';
  }).catch(function () {
    assets.textContent = '素材清单读取失败（assets/unit1/*/index.json）';
  });

  document.getElementById('ua').textContent = location.host;
})();
