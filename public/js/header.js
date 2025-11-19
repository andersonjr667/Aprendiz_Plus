// header.js - Header dinâmico Aprendiz+

function loadHeader() {
  fetch('/public/components/header.html')
    .then(res => res.text())
    .then(html => {
      const container = document.getElementById('header-container');
      if (container) {
        container.innerHTML = html;
        initHeaderMenu();
      }
    });
}

function initHeaderMenu() {
  // Mobile menu toggle
  const hamburger = document.querySelector('.apz-header__hamburger');
  const mobileMenu = document.querySelector('.apz-header__mobile-menu');
  const nav = document.querySelector('.apz-header__nav');
  if (hamburger && mobileMenu && nav) {
    hamburger.addEventListener('click', () => {
      if (mobileMenu.style.display === 'block') {
        mobileMenu.style.display = 'none';
      } else {
        mobileMenu.innerHTML = nav.innerHTML;
        mobileMenu.style.display = 'block';
      }
    });
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.style.display = 'none';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', loadHeader);
