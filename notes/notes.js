// Replace these examples with public notes when ready
// Each entry has a unique id, category, title, excerpt, and an array of paragraphs
const notes = [
  { id: 'everyday', category: '生活片段', title: '把平常的一天，好好收藏', excerpt: '有些片刻不必盛大，一束落在桌边的光，也值得停下来看看', paragraphs: ['以下是排版示例，并非站长的真实经历', '有些片刻不必盛大\n一束落在桌边的光，一阵穿过树叶的风，都可以成为今天留下的一小段记忆', '记录的时候，不必急着写出完整的故事\n先留下一种颜色、一句话，或一个当下的心情，等以后翻到这一页，再慢慢想起它'] },
  { id: 'reading', category: '阅读随想', title: '在文字之间，留一点空白', excerpt: '读到喜欢的句子，可以停一停，让自己的想法慢慢跟上来', paragraphs: ['以下是排版示例，并非站长的真实读书笔记', '有时，读完一页之后最想留下的，并不是结论，而是一个新的问题', '可以在这里写下书名、触动自己的片段，以及还没想明白的事情\n让阅读有回声，也给思考留一点余地'] },
  { id: 'idea', category: '灵感手记', title: '先记下，再慢慢实现', excerpt: '一个还不完整的想法，也可以先拥有属于自己的位置', paragraphs: ['以下是排版示例，并非站长的真实项目记录', '灵感来的时候，先用几句话把它留下\n它想解决什么，最吸引自己的地方是什么，下一步可以从哪里开始', '不需要一次想清楚所有细节\n下一次回来时，补上一点新的发现，也是在向前走'] }
];
const entries = document.querySelector('#entries');
const reader = document.querySelector('#reader');
let opener;
function openNote(note, button) {
  opener = button;
  document.querySelector('#reader-title').textContent = note.title;
  document.querySelector('#reader-category').textContent = note.category;
  const body = document.querySelector('#reader-body');
  body.replaceChildren(...note.paragraphs.map(text => {
    const p = document.createElement('p'); p.textContent = text; return p;
  }));
  reader.showModal();
  reader.scrollTop = 0;
}
function render(category = '全部') {
  const selected = notes.filter(note => category === '全部' || note.category === category);
  entries.replaceChildren(...selected.map(note => {
    const article = document.createElement('article'); article.className = 'entry';
    const meta = document.createElement('div'); meta.className = 'entry-meta';
    const tag = document.createElement('span'); tag.className = 'category'; tag.textContent = note.category;
    const sample = document.createElement('span'); sample.className = 'sample'; sample.textContent = '示例';
    meta.append(tag, sample);
    const title = document.createElement('h3'); title.textContent = note.title;
    const excerpt = document.createElement('p'); excerpt.textContent = note.excerpt;
    const button = document.createElement('button'); button.className = 'read'; button.type = 'button';
    button.textContent = '展开阅读 ↗'; button.setAttribute('aria-label', `阅读：${note.title}`);
    button.addEventListener('click', () => openNote(note, button));
    article.append(meta, title, excerpt, button); return article;
  }));
  document.querySelector('#empty').hidden = selected.length > 0;
  document.querySelector('#result-count').textContent = `${selected.length} 篇示例笔记`;
}
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  render(button.dataset.category);
}));
document.querySelector('.close').addEventListener('click', () => reader.close());
reader.addEventListener('click', event => {
  const bounds = reader.getBoundingClientRect();
  if (event.target === reader && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) reader.close();
});
reader.addEventListener('close', () => opener?.focus());
render();
