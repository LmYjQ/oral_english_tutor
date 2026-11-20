/* L2 · My Favorite Things 我喜欢什么 —— 课程数据
 * 目标语言：What's your favorite fruit / animal / color? — I like grapes / cats / green.
 */
const LESSON = {
  unit: 'Unit 1',
  lesson: 'L2',
  title: 'My Favorite Things 我喜欢什么',
  titleZh: '我喜欢什么',
  assetBase: '../assets/unit1/L2/',
  img: (name) => `../assets/unit1/L2/images/${name}.jpg`,
  audio: (name) => `../assets/unit1/L2/audio/L2_${name}.mp3`,

  stages: [
    { id: 'hello', en: 'Hello!',          zh: '打招呼·复习', time: '0–3 min' },
    { id: 'bag',   en: 'Magic Bag',       zh: '魔法袋',     time: '3–9 min' },
    { id: 'pick',  en: 'Tap the One!',    zh: '听音选图',   time: '9–14 min' },
    { id: 'drill', en: 'I Like It!',      zh: '说出喜好',   time: '14–21 min' },
    { id: 'show',  en: 'My Favorites',    zh: '我的三样最爱', time: '21–25 min' },
  ],

  /* ① 自编 chant + L1 单词复习 */
  chant: [
    { text: 'Hello, hello, what do you like?', zh: '你好，你喜欢什么？',   audio: 'greeting_1' },
    { text: 'I like it, I like that!',         zh: '我喜欢它，我喜欢那个！', audio: 'greeting_2' },
    { text: 'Grapes, cats, and colors too!',   zh: '葡萄、小猫，还有颜色！', audio: 'greeting_3' },
    { text: "Hello, hello, let's say it!",     zh: '你好，我们说出来吧！',  audio: 'greeting_4' },
  ],
  review: [
    { word: 'cake',    zh: '蛋糕',   audio: 'review_cake' },
    { word: 'balloon', zh: '气球',   audio: 'review_balloon' },
    { word: 'present', zh: '礼物',   audio: 'review_present' },
    { word: 'dog',     zh: '小狗',   audio: 'review_dog' },
  ],

  /* ② 魔法袋：依次摸出 4 样 */
  bag: {
    img: 'magic_bag',
    items: [
      { word: 'grapes', zh: '葡萄', card: 'card_grapes', audio: 'word_grapes' },
      { word: 'cats',   zh: '小猫', card: 'card_cats',   audio: 'word_cats' },
      { word: 'green',  zh: '绿色', card: 'card_green',  audio: 'word_green' },
      { word: 'hot dog', zh: '热狗', card: 'card_hotdog', audio: 'word_hotdog' },
    ],
  },

  /* ③ 听音选图：房间里 8 样东西（百分比坐标） */
  scene: {
    file: 'scene_playroom',
    alt: 'Mia and Ben playing in a playroom',
    hotspots: [
      { id: 'green',   word: 'green',   card: 'card_green',   audio: 'word_green',   x: 14,   y: 72 },
      { id: 'blue',    word: 'blue',    card: 'card_blue',    audio: 'word_blue',    x: 29.5, y: 80 },
      { id: 'pink',    word: 'pink',    card: 'card_pink',    audio: 'word_pink',    x: 24,   y: 88.5 },
      { id: 'pizza',   word: 'pizza',   card: 'card_pizza',   audio: 'word_pizza',   x: 39,   y: 72 },
      { id: 'grapes',  word: 'grapes',  card: 'card_grapes',  audio: 'word_grapes',  x: 55.5, y: 62.5 },
      { id: 'hotdog',  word: 'hot dog', card: 'card_hotdog',  audio: 'word_hotdog',  x: 54.5, y: 79 },
      { id: 'cats',    word: 'cats',    card: 'card_cats',    audio: 'word_cats',    x: 51.8, y: 45 },
      { id: 'pandas',  word: 'pandas',  card: 'card_pandas',  audio: 'word_pandas',  x: 76,   y: 77 },
    ],
  },

  /* ④ 句型操练：问 → 选 → 跟说 */
  drills: [
    {
      asker: 'ben', question: "What's your favorite fruit?", qAudio: 'q_fruit',
      qZh: '你最喜欢什么水果？',
      options: ['grapes', 'pizza', 'hot dog'],
    },
    {
      asker: 'ben', question: "What's your favorite animal?", qAudio: 'q_animal',
      qZh: '你最喜欢什么动物？',
      options: ['cats', 'pandas'],
    },
    {
      asker: 'mia', question: "What's your favorite color?", qAudio: 'q_color',
      qZh: '你最喜欢什么颜色？',
      options: ['green', 'blue', 'pink'],
    },
  ],

  /* ⑤ 我的三样最爱：从这 8 样里挑 3 样 */
  favorites: ['grapes', 'cats', 'green', 'hot dog', 'pizza', 'pandas', 'blue', 'pink'],

  chars: {
    mia: { name: 'Mia', img: '../assets/unit1/L1/images/mia.jpg', color: '#ff8a65' },
    ben: { name: 'Ben', img: '../assets/unit1/L1/images/ben.jpg', color: '#4dabf7' },
  },
};
