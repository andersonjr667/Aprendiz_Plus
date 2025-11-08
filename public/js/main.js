// Main frontend logic for homepage enhancements
document.addEventListener('DOMContentLoaded', () => {
  // Initialize all homepage features
  initStatCounters();
  initFAQAccordion();
  loadFeaturedJobs();
  initSmoothScroll();
  initBackToTop();
  initScrollAnimations();
});

// Back to Top Button
function initBackToTop() {
  const backToTopButton = document.getElementById('backToTop');
  if (!backToTopButton) return;

  // Show/hide button based on scroll position
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      backToTopButton.classList.add('show');
    } else {
      backToTopButton.classList.remove('show');
    }
  });

  // Scroll to top on click
  backToTopButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// Enhanced scroll animations
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.feature-card, .step-card, .testimonial-card, .job-card-mini, .faq-item');
  
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100); // Stagger animation
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// Animated stat counters
function initStatCounters() {
  const statNumbers = document.querySelectorAll('.stat-number[data-count]');
  
  const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const count = parseInt(target.getAttribute('data-count'));
        animateCounter(target, count);
        observer.unobserve(target);
      }
    });
  }, observerOptions);

  statNumbers.forEach(stat => observer.observe(stat));
}

function animateCounter(element, target) {
  let current = 0;
  const increment = target / 50; // 50 steps
  const duration = 2000; // 2 seconds
  const stepTime = duration / 50;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target.toLocaleString('pt-BR');
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current).toLocaleString('pt-BR');
    }
  }, stepTime);
}

// FAQ Accordion functionality
function initFAQAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', () => {
      // Close other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          otherItem.classList.remove('active');
        }
      });
      
      // Toggle current item
      item.classList.toggle('active');
    });
  });
}

// Load featured jobs dynamically
async function loadFeaturedJobs() {
  const container = document.getElementById('featuredJobs');
  if (!container) return;

  try {
    const response = await fetch('/api/jobs?limit=6');
    const jobs = await response.json();
    
    if (jobs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--gray-600);">
          <i class="fas fa-briefcase" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.3;"></i>
          <p style="font-size: 1.1rem;">Nenhuma vaga disponível no momento. Volte em breve!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = jobs.map(job => `
      <div class="job-card-mini" onclick="window.location.href='/vaga-detalhes?id=${job._id}'" role="button" tabindex="0">
        <div class="job-company">
          <i class="fas fa-building"></i> ${job.company || 'Empresa Confidencial'}
        </div>
        <h3 class="job-title-mini">${job.title}</h3>
        <div class="job-tags">
          ${job.location ? `<span class="job-tag"><i class="fas fa-map-marker-alt"></i> ${job.location}</span>` : ''}
          ${job.type ? `<span class="job-tag"><i class="fas fa-clock"></i> ${job.type}</span>` : ''}
          ${job.salary ? `<span class="job-tag"><i class="fas fa-dollar-sign"></i> ${job.salary}</span>` : ''}
        </div>
      </div>
    `).join('');

    // Add keyboard support for job cards
    document.querySelectorAll('.job-card-mini').forEach(card => {
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          card.click();
        }
      });
    });

  } catch (error) {
    console.error('Error loading featured jobs:', error);
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--error);">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
        <p style="font-size: 1.1rem;">Erro ao carregar vagas. Por favor, tente novamente mais tarde.</p>
      </div>
    `;
  }
}

// Smooth scroll for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// Add scroll animations for sections
const observeElements = () => {
  // This function is now replaced by initScrollAnimations
  // Keeping for backward compatibility
  initScrollAnimations();
};

// Initialize animations after DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeElements);
} else {
  observeElements();
}

// Legacy job fetch function for other pages
async function fetchJobs() {
  const res = await fetch('/api/jobs');
  const jobs = await res.json();
  const list = document.getElementById('jobs');
  if (!list) return;
  list.innerHTML = '';
  jobs.forEach(j => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<h3>${j.title}</h3><p>${j.description ? j.description.substring(0,120) : ''}</p><a class="btn btn-primary" href="/job/${j._id}">Ver</a>`;
    list.appendChild(el);
  });
}
