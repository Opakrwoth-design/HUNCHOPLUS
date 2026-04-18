/* ═══════════════════════════════════════════════
   HUNCHOPLUS  —  movie.js  (Movie Detail Page)
   ═══════════════════════════════════════════════ */

const TMDB_API_KEY = '60593241d155f26b1b83caacb48326a8';
const TMDB_BASE    = 'https://api.themoviedb.org/3';
const TMDB_IMG     = 'https://image.tmdb.org/t/p/original';
const TMDB_THUMB   = 'https://image.tmdb.org/t/p/w500';
const TMDB_FACE    = 'https://image.tmdb.org/t/p/w185';

/* ─── State ─────────────────────────────────── */
let likedItems     = JSON.parse(localStorage.getItem('hp_liked')     || '[]');
let watchlistItems = JSON.parse(localStorage.getItem('hp_watchlist') || '[]');
let historyItems   = JSON.parse(localStorage.getItem('hp_history')   || '[]');

function saveLiked()     { localStorage.setItem('hp_liked',     JSON.stringify(likedItems)); }
function saveWatchlist() { localStorage.setItem('hp_watchlist', JSON.stringify(watchlistItems)); }
function saveHistory()   { localStorage.setItem('hp_history',   JSON.stringify(historyItems)); }

function addToLiked(item) {
  if (!likedItems.some(l => l.id === item.id)) { likedItems.push({ ...item, addedAt: Date.now() }); saveLiked(); }
  if (!watchlistItems.some(w => w.id === item.id)) { watchlistItems.push({ ...item, addedAt: Date.now() }); saveWatchlist(); }
}
function removeFromLiked(id) { likedItems = likedItems.filter(l => l.id !== id); saveLiked(); }
function addToWatchlist(item) {
  if (!watchlistItems.some(w => w.id === item.id)) { watchlistItems.push({ ...item, addedAt: Date.now() }); saveWatchlist(); }
  if (!likedItems.some(l => l.id === item.id)) { likedItems.push({ ...item, addedAt: Date.now() }); saveLiked(); }
}
function removeFromWatchlist(id) { watchlistItems = watchlistItems.filter(w => w.id !== id); saveWatchlist(); }

/* ─── Cast ──────────────────────────────────── */
const CAST_INITIAL = 6;
let allCastMembers = [];
let castExpanded   = false;
let castListenerAttached = false;

/* ─── Sidebar ───────────────────────────────── */
const sidebarWrapper = document.getElementById('sidebar-wrapper');
const desktopToggle  = document.getElementById('desktop-toggle');
let sidebarCollapsed = false;

desktopToggle?.addEventListener('click', () => {
  sidebarCollapsed = !sidebarCollapsed;
  sidebarWrapper?.classList.toggle('collapsed', sidebarCollapsed);
});

/* ─── Mobile Nav ────────────────────────────── */
const mobileMenuBtn  = document.getElementById('mobile-menu-btn');
const mobileNav      = document.getElementById('mobile-nav');
const mobileNavClose = document.getElementById('mobile-nav-close');
const mobileOverlay  = document.getElementById('mobile-overlay');

const openMobileNav  = () => { mobileNav?.classList.add('open'); mobileOverlay?.classList.add('visible'); document.body.style.overflow = 'hidden'; };
const closeMobileNav = () => { mobileNav?.classList.remove('open'); mobileOverlay?.classList.remove('visible'); document.body.style.overflow = ''; };

mobileMenuBtn?.addEventListener('click', openMobileNav);
mobileNavClose?.addEventListener('click', closeMobileNav);
mobileOverlay?.addEventListener('click', closeMobileNav);

/* Wire sidebar nav links → go back to index with a view param */
document.querySelectorAll('.nav-link[data-action], .mobile-nav-link[data-action]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const action = link.getAttribute('data-action');
    closeMobileNav();
    // Navigate back to index with the desired view
    window.location.href = `index.html?view=${action}`;
  });
});

/* ─── Search suggestions (same fix as index) ── */
const searchInput   = document.getElementById('search-input');
const searchWrapper = document.querySelector('.search-wrapper');
const suggestionsBox = document.getElementById('search-suggestions');

if (suggestionsBox) {
  suggestionsBox.style.position = 'fixed';
  suggestionsBox.style.zIndex   = '9000';
  suggestionsBox.style.display  = 'none';
  document.body.appendChild(suggestionsBox);
}

function positionSuggestions() {
  if (!searchWrapper || !suggestionsBox) return;
  const rect = searchWrapper.getBoundingClientRect();
  suggestionsBox.style.top   = (rect.bottom + 8) + 'px';
  suggestionsBox.style.left  = rect.left + 'px';
  suggestionsBox.style.width = rect.width + 'px';
}

let searchDebounce = null;

searchInput?.addEventListener('focus', () => { searchWrapper?.classList.add('focused'); positionSuggestions(); });
searchInput?.addEventListener('blur',  () => { searchWrapper?.classList.remove('focused'); setTimeout(() => { if (suggestionsBox) suggestionsBox.style.display = 'none'; }, 200); });
searchInput?.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = searchInput.value.trim();
  if (q.length < 2) { if (suggestionsBox) suggestionsBox.style.display = 'none'; return; }
  searchDebounce = setTimeout(async () => {
    const results = await searchContent(q);
    renderSuggestions(results);
  }, 350);
});
window.addEventListener('resize', positionSuggestions);

async function searchContent(query) {
  try {
    const sep = '/search/multi?query=' + encodeURIComponent(query);
    const res = await fetch(`${TMDB_BASE}${sep}&api_key=${TMDB_API_KEY}`);
    const d = await res.json();
    return (d.results || []).filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path).slice(0, 8);
  } catch { return []; }
}

function renderSuggestions(results) {
  if (!suggestionsBox) return;
  if (!results.length) { suggestionsBox.style.display = 'none'; return; }

  suggestionsBox.innerHTML = results.map(r => {
    const title   = r.title || r.name || 'Unknown';
    const year    = (r.release_date || r.first_air_date || '').slice(0, 4);
    const typeTag = r.media_type === 'tv' ? 'TV' : 'Movie';
    const poster  = r.poster_path ? `${TMDB_THUMB}${r.poster_path}` : '';
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

/* ─── Trailer Modal ─────────────────────────── */
function openTrailerModal(videoKey, title) {
  const existing = document.getElementById('trailer-modal-overlay');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'trailer-modal-overlay';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  `;
  modal.innerHTML = `
    <div style="position:relative;width:min(880px,95vw);aspect-ratio:16/9;border-radius:16px;overflow:hidden;
                border:1px solid rgba(161,56,202,0.4);box-shadow:0 0 60px rgba(161,56,202,0.25);">
      ${videoKey
        ? `<iframe src="https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0" title="${title} Trailer"
             frameborder="0" allow="autoplay;encrypted-media;fullscreen" allowfullscreen
             style="width:100%;height:100%;display:block;"></iframe>`
        : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;
                       background:#0d0d0d;gap:14px;color:rgba(255,255,255,0.4);font-size:14px;">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(161,56,202,0.5)" stroke-width="1.4" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
             No trailer available for this title.
           </div>`
      }
      <button onclick="document.getElementById('trailer-modal-overlay').remove();document.body.style.overflow='';"
        style="position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;
               background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);
               display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>`;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  modal.addEventListener('click', e => {
    if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { modal.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc); }
  });
}

/* ─── Helpers ───────────────────────────────── */
function getParams() {
  const p = new URLSearchParams(window.location.search);
  return { id: p.get('id') || null, type: p.get('type') || 'movie' };
}

async function tmdbFetch(path) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${TMDB_BASE}${path}${sep}api_key=${TMDB_API_KEY}`);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

function formatRuntime(minutes) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function buildStarHTML(score) {
  const stars = Math.round((score / 10) * 5);
  return Array.from({ length: 5 }, (_, i) =>
    `<svg width="13" height="13" viewBox="0 0 24 24" style="fill:${i < stars ? '#f5c518' : 'rgba(255,255,255,0.15)'};flex-shrink:0;">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`
  ).join('');
}

/* ─── Build Hero ────────────────────────────── */
function buildHero(data, trailerKey) {
  const hero    = document.getElementById('movie-hero');
  const skelEl  = document.getElementById('hero-skeleton');
  if (!hero) return;
  if (skelEl) skelEl.remove();

  const imgUrl = data.backdrop_path ? `${TMDB_IMG}${data.backdrop_path}` : '';

  hero.innerHTML = `
    <div class="hero-bg-img" style="background-image:url('${imgUrl}');background-size:cover;background-position:center top;position:absolute;inset:0;transition:transform 0.4s ease;"></div>
    <div class="hero-gradient" style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.1) 30%,rgba(0,0,0,0.55) 60%,rgba(0,0,0,0.93) 100%);"></div>
    <div class="play-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:5;">
      <div class="play-btn-circle">
        <svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:#fff;margin-left:4px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </div>
    </div>
    <div style="position:absolute;bottom:22px;left:22px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.6);z-index:5;display:flex;align-items:center;gap:6px;">
      <span style="width:6px;height:6px;border-radius:50%;background:var(--accent);display:inline-block;"></span>
      Watch Trailer
    </div>`;

  hero.style.cursor = 'pointer';
  hero.onclick = () => openTrailerModal(trailerKey, data.title || data.name || '');

  hero.addEventListener('mouseenter', () => {
    const bg = hero.querySelector('.hero-bg-img');
    if (bg) bg.style.transform = 'scale(1.03)';
  });
  hero.addEventListener('mouseleave', () => {
    const bg = hero.querySelector('.hero-bg-img');
    if (bg) bg.style.transform = 'scale(1)';
  });
}

/* ─── Build Movie Info ──────────────────────── */
function buildMovieInfo(data, type) {
  const section = document.getElementById('movie-info-section');
  if (!section) return;

  const title    = data.title || data.name || 'Unknown Title';
  const year     = (data.release_date || data.first_air_date || '').slice(0, 4);
  const rating   = data.vote_average ? data.vote_average.toFixed(1) : null;
  const runtime  = formatRuntime(data.runtime || (data.episode_run_time && data.episode_run_time[0]));
  const genres   = (data.genres || []).slice(0, 5);
  const posterUrl = data.poster_path ? `${TMDB_THUMB}${data.poster_path}` : null;
  const itemId   = `${type}-${data.id}`;
  const isLiked  = likedItems.some(l => l.id === itemId);
  const isWL     = watchlistItems.some(w => w.id === itemId);
  const posterStr = data.poster_path || '';

  const starsHtml = rating ? buildStarHTML(parseFloat(rating)) : '';

  section.innerHTML = `
    <div class="poster-card">
      ${posterUrl
        ? `<img src="${posterUrl}" alt="${title}" style="width:100%;height:100%;object-fit:cover;display:block;">`
        : `<div class="poster-placeholder"><svg viewBox="0 0 24 24" style="width:32px;height:32px;stroke:rgba(161,56,202,0.4);fill:none;stroke-width:1.4;stroke-linecap:round;"><rect x="2" y="2" width="20" height="20" rx="3"/><polygon points="10 8 16 12 10 16 10 8"/></svg></div>`
      }
    </div>
    <div class="movie-meta">
      <h1 class="movie-title">${title}</h1>

      ${genres.length ? `<div class="genre-tags">${genres.map(g => `<span class="genre-tag">${g.name}</span>`).join('')}</div>` : ''}

      <div class="movie-stats-row">
        ${year ? `<div class="stat-item">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span class="stat-value">${year}</span>
        </div>` : ''}

        ${runtime ? `<div class="stat-item">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span class="stat-value">${runtime}</span>
        </div>` : ''}

        ${rating ? `<div class="stat-item">
          <svg viewBox="0 0 24 24" style="fill:#f5c518;stroke:none;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span class="stat-value">${rating}</span><span style="font-size:11px;color:rgba(255,255,255,0.35)">/10</span>
        </div>` : ''}

        ${type === 'tv' && data.number_of_seasons ? `<div class="stat-item">
          <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          <span class="stat-value">${data.number_of_seasons} Season${data.number_of_seasons > 1 ? 's' : ''}</span>
        </div>` : ''}
      </div>

      ${rating ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:18px;">${starsHtml}<span style="font-size:12px;color:rgba(255,255,255,0.4);margin-left:4px;">${data.vote_count ? data.vote_count.toLocaleString() + ' votes' : ''}</span></div>` : ''}

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="detail-like-btn" data-id="${itemId}" data-title="${title}" data-poster="${posterStr}" data-type="${type}"
          style="display:flex;align-items:center;gap:8px;padding:11px 20px;border-radius:10px;font-family:'Public Sans',sans-serif;
                 font-size:13px;font-weight:700;cursor:pointer;letter-spacing:0.02em;transition:all 0.2s;
                 background:${isLiked ? 'rgba(220,40,90,0.18)' : 'rgba(255,255,255,0.08)'};
                 border:1px solid ${isLiked ? 'rgba(220,40,90,0.5)' : 'rgba(255,255,255,0.2)'};
                 color:${isLiked ? '#e8335a' : 'rgba(255,255,255,0.85)'};">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="${isLiked ? '#e8335a' : 'none'}" stroke="${isLiked ? '#e8335a' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          ${isLiked ? 'Liked' : 'Like'}
        </button>

        <button id="detail-wl-btn" data-id="${itemId}" data-title="${title}" data-poster="${posterStr}" data-type="${type}"
          style="display:flex;align-items:center;gap:8px;padding:11px 20px;border-radius:10px;font-family:'Public Sans',sans-serif;
                 font-size:13px;font-weight:700;cursor:pointer;letter-spacing:0.02em;transition:all 0.2s;
                 background:${isWL ? 'var(--accent-dim)' : 'rgba(255,255,255,0.08)'};
                 border:1px solid ${isWL ? 'var(--accent-glow)' : 'rgba(255,255,255,0.2)'};
                 color:${isWL ? '#c96aec' : 'rgba(255,255,255,0.85)'};">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="${isWL ? 'rgba(161,56,202,0.3)' : 'none'}" stroke="${isWL ? '#c96aec' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          ${isWL ? 'In Watchlist' : 'Watchlist'}
        </button>
      </div>
    </div>`;

  /* Like button */
  document.getElementById('detail-like-btn')?.addEventListener('click', function() {
    const { id, title: t, poster, type: tp } = this.dataset;
    const has = likedItems.some(l => l.id === id);
    if (has) {
      removeFromLiked(id);
      this.style.background = 'rgba(255,255,255,0.08)';
      this.style.borderColor = 'rgba(255,255,255,0.2)';
      this.style.color = 'rgba(255,255,255,0.85)';
      this.querySelector('svg').setAttribute('fill', 'none');
      this.querySelector('svg').setAttribute('stroke', 'currentColor');
      this.childNodes[this.childNodes.length - 1].textContent = ' Like';
    } else {
      addToLiked({ id, title: t, poster, type: tp });
      this.style.background = 'rgba(220,40,90,0.18)';
      this.style.borderColor = 'rgba(220,40,90,0.5)';
      this.style.color = '#e8335a';
      this.querySelector('svg').setAttribute('fill', '#e8335a');
      this.querySelector('svg').setAttribute('stroke', '#e8335a');
      this.childNodes[this.childNodes.length - 1].textContent = ' Liked';
      // sync watchlist btn
      const wlBtn = document.getElementById('detail-wl-btn');
      if (wlBtn) {
        wlBtn.style.background = 'var(--accent-dim)';
        wlBtn.style.borderColor = 'var(--accent-glow)';
        wlBtn.style.color = '#c96aec';
        wlBtn.querySelector('svg').setAttribute('fill', 'rgba(161,56,202,0.3)');
        wlBtn.querySelector('svg').setAttribute('stroke', '#c96aec');
        wlBtn.childNodes[wlBtn.childNodes.length - 1].textContent = ' In Watchlist';
      }
    }
  });

  /* Watchlist button */
  document.getElementById('detail-wl-btn')?.addEventListener('click', function() {
    const { id, title: t, poster, type: tp } = this.dataset;
    const has = watchlistItems.some(w => w.id === id);
    if (has) {
      removeFromWatchlist(id);
      this.style.background = 'rgba(255,255,255,0.08)';
      this.style.borderColor = 'rgba(255,255,255,0.2)';
      this.style.color = 'rgba(255,255,255,0.85)';
      this.querySelector('svg').setAttribute('fill', 'none');
      this.querySelector('svg').setAttribute('stroke', 'currentColor');
      this.childNodes[this.childNodes.length - 1].textContent = ' Watchlist';
    } else {
      addToWatchlist({ id, title: t, poster, type: tp });
      this.style.background = 'var(--accent-dim)';
      this.style.borderColor = 'var(--accent-glow)';
      this.style.color = '#c96aec';
      this.querySelector('svg').setAttribute('fill', 'rgba(161,56,202,0.3)');
      this.querySelector('svg').setAttribute('stroke', '#c96aec');
      this.childNodes[this.childNodes.length - 1].textContent = ' In Watchlist';
      // sync like btn
      const lkBtn = document.getElementById('detail-like-btn');
      if (lkBtn) {
        lkBtn.style.background = 'rgba(220,40,90,0.18)';
        lkBtn.style.borderColor = 'rgba(220,40,90,0.5)';
        lkBtn.style.color = '#e8335a';
        lkBtn.querySelector('svg').setAttribute('fill', '#e8335a');
        lkBtn.querySelector('svg').setAttribute('stroke', '#e8335a');
        lkBtn.childNodes[lkBtn.childNodes.length - 1].textContent = ' Liked';
      }
    }
  });

  document.title = `${title} | HUNCHOPLUS`;

  const overviewCard = document.getElementById('overview-card');
  const overviewText = document.getElementById('overview-text');
  if (overviewCard && overviewText && data.overview) {
    overviewText.textContent = data.overview;
    overviewCard.style.display = 'block';
  }
}

/* ─── Build Cast ────────────────────────────── */
function buildCast(credits) {
  const section     = document.getElementById('cast-section');
  const grid        = document.getElementById('cast-grid');
  const showMoreBtn = document.getElementById('btn-show-more');
  if (!section || !grid || !showMoreBtn) return;

  const cast = (credits.cast || []).filter(m => m.profile_path || m.name).slice(0, 30);
  allCastMembers = cast;
  if (!cast.length) return;

  section.style.display = 'block';
  renderCastCards(cast.slice(0, CAST_INITIAL));

  if (cast.length > CAST_INITIAL && !castListenerAttached) {
    showMoreBtn.style.display = 'block';
    showMoreBtn.addEventListener('click', () => {
      castExpanded = !castExpanded;
      renderCastCards(castExpanded ? allCastMembers : allCastMembers.slice(0, CAST_INITIAL));
      showMoreBtn.textContent = castExpanded ? 'Show Less' : 'Show More Cast';
    });
    castListenerAttached = true;
  }
}

function renderCastCards(members) {
  const grid = document.getElementById('cast-grid');
  if (!grid) return;
  grid.innerHTML = members.map(m => {
    const avatarUrl = m.profile_path ? `${TMDB_FACE}${m.profile_path}` : null;
    return `
      <div class="cast-card">
        <div class="cast-avatar">
          ${avatarUrl
            ? `<img src="${avatarUrl}" alt="${m.name}" loading="lazy">`
            : `<div class="cast-avatar-placeholder"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg></div>`
          }
        </div>
        <div class="cast-info">
          <div class="cast-name">${m.name}</div>
          <div class="cast-character">${m.character || ''}</div>
        </div>
      </div>`;
  }).join('');
}

/* ─── Build Similar ─────────────────────────── */
function buildSimilar(similar, type) {
  const container = document.getElementById('similar-cards');
  if (!container) return;

  const items = (similar.results || []).filter(m => m.poster_path).slice(0, 12);

  if (!items.length) {
    container.innerHTML = `<div style="color:rgba(255,255,255,0.2);font-size:13px;text-align:center;padding:20px 0;">No recommendations found.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const title   = item.title || item.name || 'Untitled';
    const year    = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating  = item.vote_average ? item.vote_average.toFixed(1) : '—';
    const poster  = `${TMDB_THUMB}${item.poster_path}`;
    const genres  = (item.genre_ids || []).slice(0, 2).map(id => window.GENRE_MAP[id]).filter(Boolean);
    const starsH  = item.vote_average ? buildStarHTML(item.vote_average) : '';

    return `
      <a class="similar-card" href="movie.html?id=${item.id}&type=${type}" title="${title}">
        <div class="similar-thumb">
          <img src="${poster}" alt="${title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;">
        </div>
        <div class="similar-info">
          <div class="similar-title">${title}</div>
          <div class="similar-meta">
            ${year ? `<span>${year}</span>` : ''}
            ${genres.length ? `<span>${genres.join(' · ')}</span>` : ''}
          </div>
          <div class="similar-rating">
            ${starsH}
            <span style="margin-left:4px;color:rgba(255,255,255,0.5);font-weight:500;">${rating}</span>
          </div>
        </div>
      </a>`;
  }).join('');
}

/* ─── Init ──────────────────────────────────── */
async function init() {
  const { id, type } = getParams();
  if (!id) { window.location.href = 'index.html'; return; }

  // Add to history
  const itemId = `${type}-${id}`;
  if (!historyItems.some(h => h.id === itemId)) {
    historyItems.unshift({ id: itemId, type, watchedAt: Date.now() });
    if (historyItems.length > 100) historyItems = historyItems.slice(0, 100);
    saveHistory();
  }

  try {
    const [details, credits, videosData, similarData] = await Promise.all([
      tmdbFetch(`/${type}/${id}`),
      tmdbFetch(`/${type}/${id}/credits`),
      tmdbFetch(`/${type}/${id}/videos`),
      tmdbFetch(`/${type}/${id}/similar`),
    ]);

    const videos  = videosData.results || [];
    const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube')
                 || videos.find(v => v.site === 'YouTube')
                 || null;

    buildHero(details, trailer?.key);
    buildMovieInfo(details, type);
    buildCast(credits);
    buildSimilar(similarData, type);

    // Update history with title/poster once we have it
    const existIdx = historyItems.findIndex(h => h.id === itemId);
    if (existIdx !== -1) {
      historyItems[existIdx].title  = details.title || details.name;
      historyItems[existIdx].poster = details.poster_path || '';
      saveHistory();
    }

  } catch (err) {
    console.error('movie.js init error:', err);
    const hero = document.getElementById('movie-hero');
    if (hero) hero.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.3);font-size:14px;flex-direction:column;gap:12px;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(161,56,202,0.4)" stroke-width="1.4" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      Failed to load content. <a href="index.html" style="color:var(--accent);text-decoration:none;font-weight:600;">Go Home</a>
    </div>`;
  }
}

document.addEventListener('DOMContentLoaded', init);

/* Handle index.html?view= param so nav links from movie page work */
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
  const viewParam = new URLSearchParams(window.location.search).get('view');
  if (viewParam && window.__switchView) window.__switchView(viewParam);
}