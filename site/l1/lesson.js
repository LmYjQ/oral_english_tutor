/* L1 · Hello! 认识新朋友 —— 课程数据
 * 换掉这个文件就能把同一套页面骨架变成别的课时（L2–L4 复用）。
 */
const LESSON = {
  unit: 'Unit 1',
  lesson: 'L1',
  title: 'Hello! 认识新朋友',
  titleZh: '你好，认识新朋友',
  assetBase: '../assets/unit1/L1/',
  img: (name) => `../assets/unit1/L1/images/${name}.jpg`,
  audio: (name) => `../assets/unit1/L1/audio/L1_${name}.mp3`,

  stages: [
    { id: 'hello',  en: 'Hello!',            zh: '打个招呼',   time: '0–3 min' },
    { id: 'see',    en: 'What can you see?', zh: '看图说词',   time: '3–8 min' },
    { id: 'listen', en: 'Listen and tap!',   zh: '听音贴一贴', time: '8–14 min' },
    { id: 'act',    en: 'Act it out!',       zh: '演一演',     time: '14–20 min' },
    { id: 'show',   en: 'Show & Star!',      zh: '展示得星星', time: '20–25 min' },
  ],

  /* ① Hello 仪式 —— 自编 chant，歌词原创 */
  chant: [
    { text: 'Hello, hello, how are you?',      zh: '你好，你好吗？',     audio: 'greeting_1' },
    { text: "I'm good, I hope you are!",       zh: '我很好，希望你也很好！', audio: 'greeting_2' },
    { text: 'Wave your hands, give a clap!',   zh: '挥挥手，拍拍手！',   audio: 'greeting_3' },
    { text: 'Hello, hello, here we are!',      zh: '你好，我们开始啦！', audio: 'greeting_4' },
  ],

  /* ② 看图说话 —— 场景图上的热区（百分比坐标，跟图片尺寸无关） */
  scene: {
    file: 'scene_birthday',
    alt: 'Mia and Ben at a birthday party',
    hotspots: [
      { id: 'sun',     word: 'sun',     label: 'sun',     x: 22.5, y: 13 },
      { id: 'balloon', word: 'balloon', label: 'balloon', x: 19.5, y: 42 },
      { id: 'cake',    word: 'cake',    label: 'cake',    x: 51,   y: 58 },
      { id: 'present', word: 'present', label: 'present', x: 24,   y: 78 },
      { id: 'dog',     word: 'dog',     label: 'dog',     x: 51.5, y: 83 },
    ],
  },

  /* 底部词卡：点一下就发音 */
  wordCards: ['cake', 'balloon', 'present', 'dog', 'sun', 'girl'],

  /* ③ 听音贴一贴 —— 听到哪句就点哪张图 */
  listenItems: [
    { word: 'cake',    audio: 'listen_cake' },
    { word: 'balloon', audio: 'listen_balloon' },
    { word: 'present', audio: 'listen_present' },
    { word: 'dog',     audio: 'listen_dog' },
  ],

  /* ④ 演一演 —— 角色扮演：孩子选一个角色，对手说一句，孩子录音回应
   * 每轮：ben/mia = 对手（孩子演 Mia 时对手是 Ben，反之亦然）
   *       replyMia / replyBen = 孩子要说的那句（英文大字 + 中文小字）
   */
  roleplay: {
    rounds: [
      {
        ben:      { text: "Hello, I'm Ben.",        zh: '你好，我是 Ben。',       audio: 'ben_hello' },
        mia:      { text: "Hello, I'm Mia.",        zh: '你好，我是 Mia。',       audio: 'mia_hello' },
        replyMia: { text: 'Hi Ben! I\'m Mia.',      zh: '嗨 Ben！我是 Mia。' },
        replyBen: { text: 'Hi Mia! I\'m Ben.',      zh: '嗨 Mia！我是 Ben。' },
      },
      {
        ben:      { text: "What's your name?",      zh: '你叫什么名字？',         audio: 'ben_whatsname' },
        mia:      { text: "Hi! What's your name?", zh: '嗨！你叫什么名字？',     audio: 'mia_whatsname' },
        replyMia: { text: "I'm Mia.",                zh: '我是 Mia。' },
        replyBen: { text: "I'm Ben.",                zh: '我是 Ben。' },
      },
      {
        ben:      { text: 'Nice to meet you!',      zh: '很高兴认识你！',         audio: 'ben_nicetomeet' },
        mia:      { text: 'Nice to meet you!',      zh: '很高兴认识你！',         audio: 'mia_nicetomeet' },
        replyMia: { text: 'Nice to meet you too!',  zh: '我也很高兴认识你！' },
        replyBen: { text: 'Nice to meet you too!',  zh: '我也很高兴认识你！' },
      },
      {
        ben:      { text: 'Where are you from?',    zh: '你来自哪里？',           audio: 'ben_wherefrom' },
        mia:      { text: 'Hi Ben! Where are you from?', zh: '嗨 Ben！你来自哪里？', audio: 'mia_wherefrom' },
        replyMia: { text: "I'm from China.",        zh: '我来自中国。' },
        replyBen: { text: "I'm from Beijing.",      zh: '我来自北京。' },
      },
      {
        ben:      { text: 'Goodbye! See you later!', zh: '再见！回头见！',          audio: 'ben_bye' },
        mia:      { text: 'Goodbye! See you later!', zh: '再见！回头见！',          audio: 'mia_bye' },
        replyMia: { text: 'Bye, Ben!',               zh: '再见 Ben！' },
        replyBen: { text: 'Bye, Mia!',               zh: '再见 Mia！' },
      },
    ],
  },

  chars: {
    mia: { name: 'Mia', img: 'mia', color: '#ff8a65' },
    ben: { name: 'Ben', img: 'ben', color: '#4dabf7' },
  },
};
