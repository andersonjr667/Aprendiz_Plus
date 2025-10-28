// news.js — moved from inline script in news.html
async function loadNews() {
  const res = await fetch('/api/news');
  const items = await res.json();
  const el = document.getElementById('news');
  if (!el || !items) return;
  items.forEach(n => {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = `<h3>${n.title}</h3><p>${n.content ? n.content.substring(0,140):''}</p>`;
    el.appendChild(d);
  });
}

window.addEventListener('DOMContentLoaded', loadNews);
