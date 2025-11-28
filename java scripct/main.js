// scripts/main.js
// FitTracker - vanilla JS (safe, modular, and ready to use)

// Utilities
function qs(selector, parent = document) { return parent.querySelector(selector); }
function qsa(selector, parent = document) { return Array.from(parent.querySelectorAll(selector)); }
function safeAddListener(el, event, fn) { if (el) el.addEventListener(event, fn); }

// Debounce
function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Notification system
function showNotification(message) {
  document.querySelector('.notification')?.remove();

  const n = document.createElement('div');
  n.className = 'notification';
  n.textContent = message;
  n.style.cssText = `
    position: fixed;
    top: 100px;
    right: 30px;
    background: linear-gradient(135deg, var(--red-600, #ef4444), var(--red-700, #dc2626));
    color: white;
    padding: 12px 18px;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    z-index: 1200;
    font-weight: 600;
    font-size: 14px;
    animation: slideIn 0.28s ease-out;
  `;

  document.body.appendChild(n);

  setTimeout(() => {
    n.style.animation = 'slideOut 0.28s ease-in';
    setTimeout(() => n.remove(), 300);
  }, 3000);
}

// Insert required keyframes & simple helper animations if not present
(function ensureKeyframes() {
  const id = 'fittracker-keyframes';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `
      @keyframes slideIn {
        from { transform: translateX(300px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(300px); opacity: 0; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(s);
  }
})();

// Main app initializer
document.addEventListener('DOMContentLoaded', () => {
  // DOM refs (query after DOM loaded)
  const searchInput = qs('#searchInput');
  const levelFilter = qs('#levelFilter');
  const categoryFilter = qs('#categoryFilter');
  const workoutGrid = qs('#workoutGrid');
  const logoutBtn = qs('.logout-btn');
  const notificationIcon = qs('.notification-icon');
  const settingsIcon = qs('.settings-icon');
  const userAvatar = qs('.user-avatar');
  const sidebar = qs('.sidebar');

  // Helper to get live list of workout cards
  function getWorkoutCards() {
    return qsa('.workout-card');
  }

  // FILTER LOGIC
  function filterWorkouts() {
    const cards = getWorkoutCards();
    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    const selectedLevel = (levelFilter?.value || 'all');
    const selectedCategory = (categoryFilter?.value || 'all');

    cards.forEach(card => {
      const title = (qs('.card-title', card)?.textContent || '').toLowerCase();
      const level = card.getAttribute('data-level') || '';
      const category = card.getAttribute('data-category') || '';

      const matchesSearch = title.includes(searchTerm);
      const matchesLevel = selectedLevel === 'all' || selectedLevel === level;
      const matchesCategory = selectedCategory === 'all' || selectedCategory === category;

      const visible = matchesSearch && matchesLevel && matchesCategory;

      card.style.display = visible ? 'block' : 'none';
      if (visible) {
        card.style.animation = 'fadeIn 0.35s ease-out';
      } else {
        card.style.animation = '';
      }
    });

    const visibleCount = cards.filter(c => c.style.display !== 'none').length;
    visibleCount === 0 ? showNoResults() : hideNoResults();
  }

  // NO RESULTS
  function showNoResults() {
    if (qs('#noResults')) return;
    const div = document.createElement('div');
    div.id = 'noResults';
    div.className = 'no-results';
    div.style.cssText = 'text-align:center;padding:64px 20px;color:var(--gray-400, #9ca3af);grid-column:1 / -1;';
    div.innerHTML = `
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.6;margin-bottom:12px">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
      </svg>
      <h3 style="margin:8px 0 6px;font-size:18px;color:inherit">No workout programs found</h3>
      <p style="margin:0;font-size:14px;color:inherit;opacity:0.9">Try adjusting your filters</p>
    `;
    workoutGrid?.appendChild(div);
  }

  function hideNoResults() {
    qs('#noResults')?.remove();
  }

  // PROGRESS BAR ANIMATION (weekly)
  function animateWeeklyProgress() {
    const bars = qsa('.progress-fill-weekly');
    // slight delay to allow CSS paint
    setTimeout(() => {
      bars.forEach(bar => {
        const p = Number(bar.getAttribute('data-progress') || 0);
        bar.style.width = Math.max(0, Math.min(100, p)) + '%';
      });
    }, 250);
  }

  // START BUTTONS
  function initStartButtons() {
    getWorkoutCards().forEach(card => {
      const btn = qs('.start-btn', card);
      if (!btn) return;
      // ensure not multiple listeners
      btn.replaceWith(btn.cloneNode(true));
    });

    // delegate clicks (safer)
    workoutGrid?.addEventListener('click', (e) => {
      const btn = e.target.closest('.start-btn');
      if (!btn) return;
      e.stopPropagation();
      const card = btn.closest('.workout-card');
      const name = qs('.card-title', card)?.textContent || 'workout';
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => { btn.style.transform = 'scale(1)'; }, 110);
      showNotification(`Starting ${name}...`);
    });
  }

  // CARD CLICK EFFECT
  function initCardClicks() {
    getWorkoutCards().forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.start-btn')) return;
        card.style.transform = 'scale(1.04)';
        setTimeout(() => { card.style.transform = ''; }, 170);
      });
      // initial style for intersection observer
      card.style.opacity = '0';
      card.style.transform = 'translateY(14px)';
      card.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
    });
  }

  // NAV INTERACTIONS (hover + active)
  function initNav() {
    const items = qsa('.nav-item');
    items.forEach(i => {
      i.style.transition = 'all 0.18s ease';
      i.addEventListener('mouseenter', () => i.style.transform = 'translateX(4px)');
      i.addEventListener('mouseleave', () => i.style.transform = 'translateX(0)');
      i.addEventListener('click', (ev) => {
        ev.preventDefault();
        items.forEach(x => x.classList.remove('active'));
        i.classList.add('active');
      });
    });
  }

  // TOP ICONS
  safeAddListener(notificationIcon, 'click', () => showNotification('You have new notifications.'));
  safeAddListener(settingsIcon, 'click', () => showNotification('Opening settings...'));
  safeAddListener(userAvatar, 'click', () => showNotification('Opening profile...'));

  // LOGOUT
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      logoutBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        logoutBtn.style.transform = 'scale(1)';
        showNotification('Logging out...');
        // add real logout behavior here (redirect / api call)
      }, 120);
    });
  }

  // MOBILE SIDEBAR TOGGLE
  function createMobileMenuToggle() {
    const existing = qs('#menuToggle');
    if (window.innerWidth <= 768) {
      if (!existing) {
        const btn = document.createElement('button');
        btn.id = 'menuToggle';
        btn.className = 'menu-toggle';
        btn.innerHTML = '☰';
        btn.style.cssText = `
          position:fixed;top:18px;left:18px;z-index:1100;
          width:44px;height:44px;border-radius:10px;border:none;
          background:var(--red-600,#ef4444);color:white;font-size:20px;
        `;
        document.body.appendChild(btn);
        btn.addEventListener('click', () => sidebar?.classList.toggle('open'));
      }
    } else {
      existing?.remove();
      sidebar?.classList.remove('open');
    }
  }

  // CLOSE SIDEBAR WHEN CLICK OUTSIDE ON MOBILE
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar) return;
      const menuToggle = qs('#menuToggle');
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          (!menuToggle || !menuToggle.contains(e.target))) {
        sidebar.classList.remove('open');
      }
    }
  });

  // INTERSECTION OBSERVER FOR CARDS
  function initIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(ent => {
        if (ent.isIntersecting) {
          ent.target.style.opacity = '1';
          ent.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    getWorkoutCards().forEach(c => observer.observe(c));
  }

  // SMOOTH SCROLL
  qsa('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const t = document.querySelector(a.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // INITIALIZE FEATURES
  // Filters (debounced)
  if (searchInput) {
    searchInput.addEventListener('input', debounce(filterWorkouts, 280));
  }
  safeAddListener(levelFilter, 'change', filterWorkouts);
  safeAddListener(categoryFilter, 'change', filterWorkouts);

  // Initial run
  filterWorkouts();
  animateWeeklyProgress();
  initStartButtons();
  initCardClicks();
  initNav();
  initIntersectionObserver();
  createMobileMenuToggle();

  // Recreate mobile toggle on resize
  window.addEventListener('resize', debounce(createMobileMenuToggle, 180));

  // Expose a tiny API on window for debugging if needed
  window.FitTracker = {
    filterWorkouts,
    animateWeeklyProgress,
    refresh: () => {
      // useful after dynamically adding cards
      initStartButtons();
      initCardClicks();
      initIntersectionObserver();
      filterWorkouts();
    }
  };

  console.log('FitTracker initialized.');
}); // DOMContentLoaded end
