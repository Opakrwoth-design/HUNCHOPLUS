/* ═══════════════════════════════════════════════
   HUNCHOPLUS — main.js
═══════════════════════════════════════════════ */

import {
  TMDB_API_KEY,
  TMDB_IMG_W500,
  TMDB_IMG_ORIG,
  fetchTrending,
  fetchPopularMovies,
  fetchPopularTV,
  fetchTopRated,
  fetchUpcoming,
  fetchAnime,
  fetchActionMovies,
  fetchHorror,
  fetchSciFi,
  fetchRomance,
  fetchDocumentaries,
  searchContent,
  fetchTrailer,
} from './api.js';

const SLIDE_DURATION = 5000;
const IS_DEMO = TMDB_API_KEY === 'YOUR_TMDB_API_KEY_HERE';

/* ═══════════════════════════════════════
   STATE  (persisted to localStorage)
═══════════════════════════════════════ */
let likedItems     = JSON.parse(localStorage.getItem('hp_liked')     || '[]');
let watchlistItems = JSON.parse(localStorage.getItem('hp_watchlist') || '[]');
let historyItems   = JSON.parse(localStorage.getItem('hp_history')   || '[]');

const saveLiked     = () => localStorage.setItem('hp_liked',     JSON.stringify(likedItems));
const saveWatchlist = () => localStorage.setItem('hp_watchlist', JSON.stringify(watchlistItems));
const saveHistory   = () => localStorage.setItem('hp_history',   JSON.stringify(historyItems));

/* ── Helper: ensure item is in both liked + watchlist ── */
function addToLiked(item) {
  const { id, title, poster, type } = item;
  if (!likedItems.some(l => l.id === id)) {
    likedItems.push({ id, title, poster, type, addedAt: Date.now() });
    saveLiked();
  }
  // also add to watchlist
  if (!watchlistItems.some(w => w.id === id)) {
    watchlistItems.push({ id, title, poster, type, addedAt: Date.now() });
    saveWatchlist();
  }
}

function removeFromLiked(id) {
  likedItems = likedItems.filter(l => l.id !== id);
  saveLiked();
}

function addToWatchlist(item) {
  const { id, title, poster, type } = item;
  if (!watchlistItems.some(w => w.id === id)) {
    watchlistItems.push({ id, title, poster, type, addedAt: Date.now() });
    saveWatchlist();
  }
  // also add to liked
  if (!likedItems.some(l => l.id === id)) {
    likedItems.push({ id, title, poster, type, addedAt: Date.now() });
    saveLiked();
  }
}

function removeFromWatchlist(id) {
  watchlistItems = watchlistItems.filter(w => w.id !== id);
  saveWatchlist();
}

/* ═══════════════════════════════════════
   GENRE MAP
═══════════════════════════════════════ */
const GENRE_MAP = {
  28:'Action', 12:'Adventure', 16:'Animation', 35:'Comedy',
  80:'Crime', 99:'Documentary', 18:'Drama', 10751:'Family',
  14:'Fantasy', 36:'History', 27:'Horror', 10402:'Music',
  9648:'Mystery', 10749:'Romance', 878:'Sci-Fi', 10770:'TV Movie',
  53:'Thriller', 10752:'War', 37:'Western',
  10759:'Action & Adventure', 10762:'Kids', 10763:'News',
  10764:'Reality', 10765:'Sci-Fi & Fantasy', 10766:'Soap',
  10767:'Talk', 10768:'War & Politics',
};

/* ═══════════════════════════════════════
   TRAILER MODAL
═══════════════════════════════════════ */
function openTrailerModal(youtubeKey, title) {
  const existing = document.getElementById('trailer-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'trailer-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
    animation:fadeInModal 0.25s ease;
  `;

  modal.innerHTML = `
    <style>
      @keyframes fadeInModal { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
    </style>
    <div style="position:relative;width:min(880px,95vw);aspect-ratio:16/9;border-radius:16px;overflow:hidden;border:1px solid rgba(161,56,202,0.4);box-shadow:0 0 60px rgba(161,56,202,0.25);">
      <iframe
        src="https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0"
        title="${title} Trailer"
        frameborder="0"
        allow="autoplay;encrypted-media;fullscreen"
        allowfullscreen
        style="width:100%;height:100%;display:block;">
      </iframe>
      <button id="trailer-close" style="
        position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;
        background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);
        display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:1;
        transition:background 0.2s;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => { modal.style.opacity = '0'; modal.style.transition = 'opacity 0.2s'; setTimeout(() => modal.remove(), 200); };
  modal.querySelector('#trailer-close').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
}

async function handleTrailerClick(id, type, title) {
  const btn = document.querySelector(`[data-trailer-id="${id}"]`);
  if (btn) { btn.textContent = '⏳'; btn.disabled = true; }

  const key = await fetchTrailer(id, type);

  if (btn) { btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg> Trailer`; btn.disabled = false; }

  if (key) {
    openTrailerModal(key, title);
  } else {
    alert('No trailer available for this title.');
  }
}

/* ═══════════════════════════════════════
   SIDEBAR TOGGLE
═══════════════════════════════════════ */
const sidebarWrapper = document.getElementById('sidebar-wrapper');
const desktopToggle  = document.getElementById('desktop-toggle');
let sidebarCollapsed = false;

desktopToggle?.addEventListener('click', () => {
  sidebarCollapsed = !sidebarCollapsed;
  sidebarWrapper.classList.toggle('collapsed', sidebarCollapsed);
});

/* ═══════════════════════════════════════
   MOBILE NAV DRAWER
═══════════════════════════════════════ */
const mobileMenuBtn  = document.getElementById('mobile-menu-btn');
const mobileNav      = document.getElementById('mobile-nav');
const mobileNavClose = document.getElementById('mobile-nav-close');
const mobileOverlay  = document.getElementById('mobile-overlay');

const openMobileNav  = () => { mobileNav.classList.add('open'); mobileOverlay.classList.add('visible'); document.body.style.overflow = 'hidden'; };
const closeMobileNav = () => { mobileNav.classList.remove('open'); mobileOverlay.classList.remove('visible'); document.body.style.overflow = ''; };

mobileMenuBtn?.addEventListener('click', openMobileNav);
mobileNavClose?.addEventListener('click', closeMobileNav);
mobileOverlay?.addEventListener('click', closeMobileNav);

/* ═══════════════════════════════════════
   SEARCH  (live suggestions)
   Fixed: suggestions now render above everything
═══════════════════════════════════════ */
const searchInput     = document.getElementById('search-input');
const searchWrapperEl = document.querySelector('#topbar .search-wrapper');
const suggestionsBox  = document.getElementById('search-suggestions');

// Ensure suggestions box is in body-level so it's above the hero
if (suggestionsBox) {
  // We'll position it absolutely relative to the search wrapper using JS
  suggestionsBox.style.position = 'fixed';
  suggestionsBox.style.zIndex   = '9000';
  suggestionsBox.style.display  = 'none';
  suggestionsBox.classList.remove('hidden');
  document.body.appendChild(suggestionsBox);
}

function positionSuggestions() {
  if (!searchWrapperEl || !suggestionsBox) return;
  const rect = searchWrapperEl.getBoundingClientRect();
  suggestionsBox.style.top   = (rect.bottom + 8) + 'px';
  suggestionsBox.style.left  = rect.left + 'px';
  suggestionsBox.style.width = rect.width + 'px';
}

let searchDebounce = null;

searchInput?.addEventListener('focus', () => {
  searchWrapperEl?.classList.add('focused');
  positionSuggestions();
  if (suggestionsBox?.innerHTML) suggestionsBox.style.display = 'block';
});

searchInput?.addEventListener('blur', () => {
  searchWrapperEl?.classList.remove('focused');
  setTimeout(() => { if (suggestionsBox) suggestionsBox.style.display = 'none'; }, 200);
});

searchInput?.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = searchInput.value.trim();
  if (q.length < 2) {
    if (suggestionsBox) suggestionsBox.style.display = 'none';
    return;
  }
  searchDebounce = setTimeout(async () => {
    if (IS_DEMO) { renderSuggestions(DEMO_SEARCH_RESULTS); return; }
    const results = await searchContent(q);
    renderSuggestions(results);
  }, 350);
});

window.addEventListener('resize', positionSuggestions);

function renderSuggestions(results) {
  if (!suggestionsBox) return;
  if (!results.length) { suggestionsBox.style.display = 'none'; return; }

  suggestionsBox.style.cssText += `
    background:rgba(10,5,20,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border:1px solid rgba(255,255,255,0.1);border-radius:14px;overflow:hidden;
    box-shadow:0 20px 60px rgba(0,0,0,0.6);
  `;

  suggestionsBox.innerHTML = results.map(r => {
    const title   = r.title || r.name || 'Unknown';
    const year    = (r.release_date || r.first_air_date || '').slice(0, 4);
    const typeTag = r.media_type === 'tv' ? 'TV' : 'Movie';
    const poster  = r.poster_path ? `${TMDB_IMG_W500}${r.poster_path}` : '';
    return `
      <div class="suggestion-item" data-id="${r.id}" data-type="${r.media_type}"
           style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;transition:background 0.15s;"
           onmouseenter="this.style.background='rgba(161,56,202,0.14)'"
           onmouseleave="this.style.background='transparent'">
        ${poster ? `<img src="${poster}" style="width:34px;height:50px;border-radius:5px;object-fit:cover;flex-shrink:0;">` : '<div style="width:34px;height:50px;background:rgba(255,255,255,0.06);border-radius:5px;flex-shrink:0;"></div>'}
        <div style="min-width:0;">
          <p style="font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</p>
          <p style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">${year} · ${typeTag}</p>
        </div>
      </div>`;
  }).join('');

  positionSuggestions();
  suggestionsBox.style.display = 'block';

  suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      suggestionsBox.style.display = 'none';
      searchInput.value = '';
      window.location.href = `movie.html?id=${item.dataset.id}&type=${item.dataset.type}`;
    });
  });
}

/* ═══════════════════════════════════════
   VIEW / SECTION MANAGEMENT
═══════════════════════════════════════ */
let currentView = 'home';
// Cache all data once loaded
const dataCache = {};

// All section IDs on the page
const ALL_SECTIONS = [
  'row-popular-movies', 'row-popular-tv', 'row-top-rated',
  'row-upcoming', 'row-anime', 'row-action', 'row-horror',
  'row-scifi', 'row-romance', 'row-documentaries',
];

// Which sections belong to each view
const VIEW_SECTIONS = {
  home:    ALL_SECTIONS, // show everything
  movies:  ['row-popular-movies', 'row-top-rated', 'row-upcoming', 'row-action', 'row-horror', 'row-scifi', 'row-romance', 'row-documentaries'],
  series:  ['row-popular-tv', 'row-anime'],
  explore: ALL_SECTIONS,
};

function getSectionParent(rowId) {
  const row = document.getElementById(rowId);
  return row ? row.closest('section') : null;
}

function showView(view) {
  currentView = view;

  // Hide/show standard sections
  const toShow = VIEW_SECTIONS[view] || [];
  ALL_SECTIONS.forEach(id => {
    const section = getSectionParent(id);
    if (!section) return;
    if (toShow.includes(id)) {
      section.style.display = '';
    } else {
      section.style.display = 'none';
    }
  });

  // Show/hide hero
  const hero = document.getElementById('trending-hero');

  // Handle special views
  const specialViews = ['watchlist', 'liked', 'history'];
  const specialSection = document.getElementById('special-section');

  if (specialViews.includes(view)) {
    // Hide all standard sections + hero for now, show special section
    ALL_SECTIONS.forEach(id => {
      const section = getSectionParent(id);
      if (section) section.style.display = 'none';
    });
    if (hero) hero.style.display = 'none';
    renderSpecialView(view);
  } else {
    if (hero) hero.style.display = '';
    if (specialSection) specialSection.style.display = 'none';
  }

  // Update active nav links
  document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(l => {
    const action = l.getAttribute('data-action');
    l.classList.toggle('active', action === view);
  });
}

function renderSpecialView(view) {
  let items = [];
  let title = '';
  let emoji = '';

  if (view === 'liked') {
    items = likedItems;
    title = 'Liked Videos';
    emoji = '❤️';
  } else if (view === 'watchlist') {
    items = watchlistItems;
    title = 'My Watchlist';
    emoji = '🔖';
  } else if (view === 'history') {
    items = historyItems;
    title = 'Watch History';
    emoji = '🕐';
  }

  let specialSection = document.getElementById('special-section');
  if (!specialSection) {
    specialSection = document.createElement('div');
    specialSection.id = 'special-section';
    const content = document.getElementById('content');
    // Insert before footer
    const footer = content.querySelector('footer');
    content.insertBefore(specialSection, footer);
  }

  specialSection.style.display = '';

  if (!items.length) {
    specialSection.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;gap:16px;text-align:center;">
        <div style="font-size:52px;">${emoji}</div>
        <h2 style="font-size:20px;font-weight:700;color:#fff;">${title}</h2>
        <p style="font-size:14px;color:rgba(255,255,255,0.4);max-width:340px;">Nothing here yet. Start exploring and ${view === 'history' ? 'watch something!' : 'add some titles!'}</p>
        <button onclick="window.__switchView('home')" style="margin-top:8px;background:var(--accent);color:#fff;border:none;border-radius:10px;padding:11px 22px;font-family:'Public Sans',sans-serif;font-size:13px;font-weight:700;cursor:pointer;letter-spacing:0.02em;">Browse Content</button>
      </div>`;
    return;
  }

  // Convert stored items to pseudo-TMDB format for buildRow
  const pseudoItems = items.map(item => {
    const parts = (item.id || '').split('-');
    const numId = parts[parts.length - 1];
    return {
      id: numId,
      media_type: item.type || 'movie',
      title: item.type === 'tv' ? undefined : item.title,
      name: item.type === 'tv' ? item.title : undefined,
      poster_path: item.poster || null,
      vote_average: null,
      release_date: '',
      first_air_date: '',
      genre_ids: [],
    };
  });

  specialSection.innerHTML = `
    <section>
      <h2 class="section-heading"><span class="section-emoji">${emoji}</span> ${title} <span>— ${items.length} title${items.length !== 1 ? 's' : ''}</span></h2>
      <div id="special-row" class="movie-row"></div>
    </section>`;

  buildRow('special-row', pseudoItems);
}

// Global helper for inline onclick
window.__switchView = (view) => showView(view);

/* ═══════════════════════════════════════
   NAV LINK WIRING
═══════════════════════════════════════ */
function wireNavLinks() {
  document.querySelectorAll('.nav-link[data-action], .mobile-nav-link[data-action]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const action = link.getAttribute('data-action');
      showView(action);
      closeMobileNav();
    });
  });
}

/* ═══════════════════════════════════════
   HERO SLIDESHOW
═══════════════════════════════════════ */
let currentSlide  = 0;
let totalSlides   = 0;
let slideshowTimer = null;

function buildHeroSlides(items) {
  const hero     = document.getElementById('trending-hero');
  const skeleton = document.getElementById('hero-skeleton');
  if (skeleton) skeleton.remove();

  items.forEach((item, idx) => {
    const title      = item.title || item.name || 'Unknown';
    const desc       = item.overview || '';
    const imgUrl     = `${TMDB_IMG_ORIG}${item.backdrop_path}`;
    const genres     = (item.genre_ids || []).slice(0,4).map(id => GENRE_MAP[id] || '').filter(Boolean);
    const mediaLabel = item.media_type === 'tv' ? 'Series' : 'Movie';
    const itemId     = `${item.media_type}-${item.id}`;
    const isLiked    = likedItems.some(l => l.id === itemId);
    const isWL       = watchlistItems.some(w => w.id === itemId);

    const slide = document.createElement('div');
    slide.className = 'hero-slide' + (idx === 0 ? ' active' : '');

    slide.innerHTML = `
      <div class="hero-bg" style="background-image:url('${imgUrl}')"></div>
      <div class="hero-gradient"></div>
      <div class="hero-trending-badge">🔥 Trending Now &nbsp;·&nbsp; ${mediaLabel}</div>
      <div class="hero-content">
        <div class="hero-genres">${genres.map(g => `<span class="hero-genre-tag">${g}</span>`).join('')}</div>
        <h2 class="hero-title">${title}</h2>
        <p class="hero-desc">${desc}</p>
        <div class="hero-actions">
          <button class="btn-watch-now" data-id="${itemId}" data-title="${title}" data-type="${item.media_type}">
            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Watch Now
          </button>
          <button class="btn-hero-trailer"
            data-trailer-id="${item.id}" data-trailer-type="${item.media_type}" data-trailer-title="${title}"
            style="background:rgba(255,255,255,0.08);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
                   border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:0 16px;height:43px;
                   display:flex;align-items:center;gap:7px;cursor:pointer;
                   color:rgba(255,255,255,0.9);font-family:'Public Sans',sans-serif;font-size:13px;font-weight:600;
                   transition:background 0.2s,transform 0.15s;white-space:nowrap;flex-shrink:0;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Trailer
          </button>
          <button class="btn-icon-action btn-like ${isLiked ? 'liked' : ''}"
            data-id="${itemId}" data-title="${title}" data-poster="${item.poster_path||''}" data-type="${item.media_type}" title="Like">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button class="btn-icon-action btn-watchlist ${isWL ? 'watchlisted' : ''}"
            data-id="${itemId}" data-title="${title}" data-poster="${item.poster_path||''}" data-type="${item.media_type}" title="Watchlist">
            <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>`;

    hero.appendChild(slide);
  });

  /* progress dots */
  const bar = document.createElement('div');
  bar.id = 'hero-progress';
  items.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.className = 'hero-dot' + (idx === 0 ? ' active' : '');
    dot.addEventListener('click', () => goToSlide(idx));
    bar.appendChild(dot);
  });
  hero.appendChild(bar);

  attachHeroListeners();
  totalSlides = items.length;
}

function goToSlide(idx) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots   = document.querySelectorAll('.hero-dot');
  slides[currentSlide]?.classList.remove('active');
  dots[currentSlide]?.classList.remove('active');
  currentSlide = ((idx % totalSlides) + totalSlides) % totalSlides;
  slides[currentSlide]?.classList.add('active');
  dots[currentSlide]?.classList.add('active');
  clearInterval(slideshowTimer);
  slideshowTimer = setInterval(() => goToSlide(currentSlide + 1), SLIDE_DURATION);
}

function startSlideshow() {
  if (totalSlides > 1) slideshowTimer = setInterval(() => goToSlide(currentSlide + 1), SLIDE_DURATION);
  const hero = document.getElementById('trending-hero');
  hero?.addEventListener('mouseenter', () => clearInterval(slideshowTimer));
  hero?.addEventListener('mouseleave', () => {
    if (totalSlides > 1) slideshowTimer = setInterval(() => goToSlide(currentSlide + 1), SLIDE_DURATION);
  });
}

function attachHeroListeners() {
  // Trailer buttons on hero
  document.querySelectorAll('.btn-hero-trailer').forEach(btn => {
    btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(255,255,255,0.14)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'rgba(255,255,255,0.08)');
    btn.addEventListener('click', () => {
      const { trailerType, trailerTitle } = btn.dataset;
      const id = btn.getAttribute('data-trailer-id');
      handleTrailerClick(id, trailerType, trailerTitle);
    });
  });

  // Like buttons on hero
  document.querySelectorAll('.btn-like').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, title, poster, type } = btn.dataset;
      const has = likedItems.some(l => l.id === id);
      if (has) {
        removeFromLiked(id);
        document.querySelectorAll(`.btn-like[data-id="${id}"]`).forEach(b => b.classList.remove('liked'));
      } else {
        addToLiked({ id, title, poster, type });
        document.querySelectorAll(`.btn-like[data-id="${id}"]`).forEach(b => b.classList.add('liked'));
        // also update watchlist buttons
        document.querySelectorAll(`.btn-watchlist[data-id="${id}"]`).forEach(b => b.classList.add('watchlisted'));
      }
    });
  });

  // Watchlist buttons on hero
  document.querySelectorAll('.btn-watchlist').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, title, poster, type } = btn.dataset;
      const has = watchlistItems.some(w => w.id === id);
      if (has) {
        removeFromWatchlist(id);
        document.querySelectorAll(`.btn-watchlist[data-id="${id}"]`).forEach(b => b.classList.remove('watchlisted'));
      } else {
        addToWatchlist({ id, title, poster, type });
        document.querySelectorAll(`.btn-watchlist[data-id="${id}"]`).forEach(b => b.classList.add('watchlisted'));
        document.querySelectorAll(`.btn-like[data-id="${id}"]`).forEach(b => b.classList.add('liked'));
      }
    });
  });

  // Watch now buttons on hero
  document.querySelectorAll('.btn-watch-now').forEach(btn => {
    btn.addEventListener('click', () => {
      const { id, title, type } = btn.dataset;
      const rawId = id.split('-')[1] || id;
      if (!historyItems.some(h => h.id === id)) {
        historyItems.unshift({ id, title, type, watchedAt: Date.now() });
        if (historyItems.length > 100) historyItems = historyItems.slice(0, 100);
        saveHistory();
      }
      window.location.href = `movie.html?id=${rawId}&type=${type}`;
    });
  });
}

/* ═══════════════════════════════════════
   MOVIE / TV ROW BUILDER
═══════════════════════════════════════ */
function buildRow(rowId, items) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = '';

  if (!items.length) {
    row.innerHTML = '<p style="color:rgba(255,255,255,0.2);font-size:13px;padding:8px 0;">Nothing to show yet.</p>';
    return;
  }

  items.forEach(item => {
    const rawId   = String(item.id);
    const mtype   = item.media_type || 'movie';
    const itemId  = rawId.includes('-') ? rawId : `${mtype}-${rawId}`;
    const title   = item.title || item.name || 'Untitled';
    const year    = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating  = item.vote_average ? item.vote_average.toFixed(1) : '—';
    const poster  = item.poster_path ? `${TMDB_IMG_W500}${item.poster_path}` : '';
    const isLiked = likedItems.some(l => l.id === itemId);

    const card = document.createElement('div');
    card.className = 'movie-card snap-start cursor-pointer';

    card.innerHTML = `
      <div style="position:relative;border-radius:12px;overflow:hidden;aspect-ratio:2/3;background:#111;">
        ${poster
          ? `<img src="${poster}" alt="${title}" loading="lazy"
               style="width:100%;height:100%;object-fit:cover;display:block;transition:transform 0.3s;">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.2);font-size:11px;">No Image</div>`
        }
        <div class="card-overlay" style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,transparent 55%);opacity:0;transition:opacity 0.25s;display:flex;align-items:flex-end;justify-content:center;padding-bottom:10px;"></div>
        <button class="card-trailer-btn"
          data-trailer-id="${rawId}" data-trailer-type="${mtype}" data-trailer-title="${title}"
          style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);
                 background:rgba(161,56,202,0.85);border:none;border-radius:8px;
                 padding:6px 12px;display:flex;align-items:center;gap:5px;cursor:pointer;
                 color:#fff;font-family:'Public Sans',sans-serif;font-size:11px;font-weight:700;
                 opacity:0;transition:opacity 0.2s;white-space:nowrap;letter-spacing:0.04em;">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Trailer
        </button>
        <button class="card-like-btn ${isLiked ? 'liked' : ''}"
          data-id="${itemId}" data-title="${title}" data-poster="${item.poster_path||''}" data-type="${mtype}"
          style="position:absolute;top:7px;right:7px;width:30px;height:30px;border-radius:50%;
                 background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.15);
                 display:flex;align-items:center;justify-content:center;cursor:pointer;
                 opacity:${isLiked ? '1' : '0'};transition:opacity 0.2s;">
          <svg width="13" height="13" viewBox="0 0 24 24"
            fill="${isLiked ? '#e8335a' : 'none'}"
            stroke="${isLiked ? '#e8335a' : 'rgba(255,255,255,0.8)'}"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div style="padding:8px 2px 0;">
        <p style="font-size:12px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</p>
        <p style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">${year}${year ? ' · ' : ''}⭐ ${rating}</p>
      </div>`;

    const img        = card.querySelector('img');
    const overlay    = card.querySelector('.card-overlay');
    const likeBtn    = card.querySelector('.card-like-btn');
    const trailerBtn = card.querySelector('.card-trailer-btn');

    card.addEventListener('mouseenter', () => {
      img?.style && (img.style.transform = 'scale(1.05)');
      overlay.style.opacity = '1';
      trailerBtn.style.opacity = '1';
      if (!likeBtn.classList.contains('liked')) likeBtn.style.opacity = '1';
    });
    card.addEventListener('mouseleave', () => {
      img?.style && (img.style.transform = 'scale(1)');
      overlay.style.opacity = '0';
      trailerBtn.style.opacity = '0';
      if (!likeBtn.classList.contains('liked')) likeBtn.style.opacity = '0';
    });

    // Trailer button on card
    trailerBtn.addEventListener('click', e => {
      e.stopPropagation();
      const id     = trailerBtn.getAttribute('data-trailer-id');
      const type   = trailerBtn.dataset.trailerType;
      const tTitle = trailerBtn.dataset.trailerTitle;
      handleTrailerClick(id, type, tTitle);
    });

    // Like toggle on card — syncs with watchlist
    likeBtn.addEventListener('click', e => {
      e.stopPropagation();
      const { id, title: t, poster, type } = likeBtn.dataset;
      const svg = likeBtn.querySelector('svg');
      const has = likedItems.some(l => l.id === id);
      if (has) {
        removeFromLiked(id);
        likeBtn.classList.remove('liked');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'rgba(255,255,255,0.8)');
        likeBtn.style.opacity = '0';
      } else {
        addToLiked({ id, title: t, poster, type });
        likeBtn.classList.add('liked');
        svg.setAttribute('fill', '#e8335a');
        svg.setAttribute('stroke', '#e8335a');
        likeBtn.style.opacity = '1';
        // update hero watchlist/like btns if they exist
        document.querySelectorAll(`.btn-like[data-id="${id}"]`).forEach(b => b.classList.add('liked'));
        document.querySelectorAll(`.btn-watchlist[data-id="${id}"]`).forEach(b => b.classList.add('watchlisted'));
      }
    });

    // Card click → detail
    card.addEventListener('click', () => {
      const numId = rawId.split('-').pop();
      if (!historyItems.some(h => h.id === itemId)) {
        historyItems.unshift({ id: itemId, title, type: mtype, watchedAt: Date.now() });
        saveHistory();
      }
      window.location.href = `movie.html?id=${numId}&type=${mtype}`;
    });

    row.appendChild(card);
  });
}

/* skeleton placeholder row while loading */
function buildSkeletonRow(rowId, count = 10) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = Array.from({ length: count }).map(() => `
    <div class="movie-card snap-start" style="pointer-events:none;">
      <div style="border-radius:12px;aspect-ratio:2/3;background:linear-gradient(90deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 100%);background-size:200% 100%;animation:shimmer 1.6s infinite;"></div>
      <div style="padding:8px 2px 0;">
        <div style="height:10px;border-radius:4px;background:rgba(255,255,255,0.06);margin-bottom:5px;"></div>
        <div style="height:8px;border-radius:4px;background:rgba(255,255,255,0.04);width:55%;"></div>
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════
   DEMO FALLBACK DATA
═══════════════════════════════════════ */
const DEMO_HERO = [
  { id:1, media_type:'movie', title:'Add your TMDB API key', overview:'Open api.js and replace YOUR_TMDB_API_KEY_HERE with a real TMDB key to load live content.', backdrop_path:null, poster_path:null, genre_ids:[28,878,53] },
  { id:2, media_type:'tv',    name:'Get your key at themoviedb.org', overview:'Sign up free at TMDB → Settings → API → copy your key.', backdrop_path:null, poster_path:null, genre_ids:[18,10765] },
];

const DEMO_SEARCH_RESULTS = [
  { media_type:'movie', id:550, title:'Fight Club', release_date:'1999', poster_path:null },
  { media_type:'tv', id:1396, name:'Breaking Bad', first_air_date:'2008', poster_path:null },
];

function buildDemoHero() {
  const hero     = document.getElementById('trending-hero');
  const skeleton = document.getElementById('hero-skeleton');
  if (skeleton) skeleton.remove();

  const grads = ['linear-gradient(135deg,#1a0830 0%,#2d1060 50%,#0d0020 100%)','linear-gradient(135deg,#0a1628 0%,#1a3a6e 50%,#050e1c 100%)'];

  DEMO_HERO.forEach((item, idx) => {
    const genres = (item.genre_ids||[]).slice(0,3).map(id => GENRE_MAP[id]||'').filter(Boolean);
    const title  = item.title || item.name;
    const slide  = document.createElement('div');
    slide.className = 'hero-slide' + (idx === 0 ? ' active' : '');
    slide.innerHTML = `
      <div class="hero-bg" style="background:${grads[idx]};"></div>
      <div class="hero-gradient"></div>
      <div class="hero-trending-badge">🔥 Trending Now &nbsp;·&nbsp; Demo</div>
      <div class="hero-content">
        <div class="hero-genres">${genres.map(g=>`<span class="hero-genre-tag">${g}</span>`).join('')}</div>
        <h2 class="hero-title">${title}</h2>
        <p class="hero-desc">${item.overview}</p>
        <div class="hero-actions">
          <button class="btn-watch-now"><svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>Watch Now</button>
          <button class="btn-icon-action btn-like" title="Like"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>
          <button class="btn-icon-action btn-watchlist" title="Watchlist"><svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></button>
        </div>
      </div>`;
    hero.appendChild(slide);
  });

  const bar = document.createElement('div');
  bar.id = 'hero-progress';
  DEMO_HERO.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.className = 'hero-dot' + (idx === 0 ? ' active' : '');
    dot.addEventListener('click', () => goToSlide(idx));
    bar.appendChild(dot);
  });
  hero.appendChild(bar);
  totalSlides = DEMO_HERO.length;
}

/* ═══════════════════════════════════════
   ROW CONFIG
═══════════════════════════════════════ */
const ROW_CONFIG = [
  { id: 'row-popular-movies',  fetch: fetchPopularMovies  },
  { id: 'row-popular-tv',      fetch: fetchPopularTV      },
  { id: 'row-top-rated',       fetch: fetchTopRated       },
  { id: 'row-upcoming',        fetch: fetchUpcoming       },
  { id: 'row-anime',           fetch: fetchAnime          },
  { id: 'row-action',          fetch: fetchActionMovies   },
  { id: 'row-horror',          fetch: fetchHorror         },
  { id: 'row-scifi',           fetch: fetchSciFi          },
  { id: 'row-romance',         fetch: fetchRomance        },
  { id: 'row-documentaries',   fetch: fetchDocumentaries  },
];

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
async function init() {
  wireNavLinks();

  if (IS_DEMO) {
    buildDemoHero();
    ROW_CONFIG.forEach(r => buildSkeletonRow(r.id));
  } else {
    ROW_CONFIG.forEach(r => buildSkeletonRow(r.id));

    const trendingItems = await fetchTrending();
    if (trendingItems.length) buildHeroSlides(trendingItems);
    else buildDemoHero();

    ROW_CONFIG.forEach(async ({ id, fetch: fn }) => {
      const items = await fn();
      dataCache[id] = items;
      buildRow(id, items);
    });
  }

  startSlideshow();
}

document.addEventListener('DOMContentLoaded', () => {
  init().then(() => {
    // Handle ?view= param — e.g. coming back from movie.html?view=watchlist
    const viewParam = new URLSearchParams(window.location.search).get('view');
    if (viewParam) {
      showView(viewParam);
      // Clean the URL without reloading
      history.replaceState({}, '', window.location.pathname);
    }
  });
});

/* ── global helper for any inline onclick still in HTML ── */
window.openMovie = (id, type = 'movie') => {
  window.location.href = `movie.html?id=${id}&type=${type}`;
};