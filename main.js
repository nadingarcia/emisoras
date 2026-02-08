/**
 * RadioWave - Progressive Web App
 * 
 * Features:
 * - Pagination/Infinite scroll (20 stations per page)
 * - Favorites system (localStorage)
 * - Toast notifications
 * - Loading animations
 * - Service Worker integration
 * - Country flags with fallback
 * - Offline support
 * - URL Parameters support
 * - Clickable tags and countries
 * - Customizable tags and filters (user can add/remove)
 * - Media Session API integration
 * 
 * Version: 2.2.0
 */

// ==================== STATE MANAGEMENT ====================
const state = {
    stations: [],
    allStations: [], // Para paginação client-side
    currentStation: null,
    isPlaying: false,
    currentFilter: 'popular',
    currentTag: null, // Track active tag
    currentCountry: null, // Track active country filter
    searchQuery: '',
    page: 0,
    pageSize: 20,
    isFetching: false,
    noMoreData: false,
    isOnline: navigator.onLine,
    activeFilterType: null // 'tag', 'country', 'search', 'popular', 'favorites'
};

const DEFAULT_ARTWORK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23334155' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='40' text-anchor='middle' dy='.3em' fill='%2364748b'%3E♫%3C/text%3E%3C/svg%3E";

// ==================== DOM ELEMENTS ====================
const elements = {
    searchInput: document.getElementById('searchInput'),
    filterButtons: document.getElementById('filterButtons'),
    radioGrid: document.getElementById('radioGrid'),
    loadingSkeleton: document.getElementById('loadingSkeleton'),
    emptyState: document.getElementById('emptyState'),
    stationCount: document.getElementById('stationCount'),
    audioPlayer: document.getElementById('audioPlayer'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    playerTitle: document.getElementById('playerTitle'),
    playerSubtitle: document.getElementById('playerSubtitle'),
    playerArtwork: document.getElementById('playerArtwork'),
    volumeSlider: document.getElementById('volumeSlider'),
    volumeIcon: document.getElementById('volumeIcon'),
    scrollSentinel: document.getElementById('scrollSentinel'),
    favoritesBadge: document.getElementById('favoritesBadge'),
    favoritesBadgeBtn: document.getElementById('favoritesBadgeBtn'),
    offlineIndicator: document.getElementById('offlineIndicator'),
    toaster: document.getElementById('toaster'),
    tagCloud: document.getElementById('tagCloud'),
    activeFilterBanner: document.getElementById('activeFilterBanner'),
    clearFilterBtn: document.getElementById('clearFilterBtn'),
    filterName: document.getElementById('filterName')
};

// ==================== API CONFIGURATION ====================
const API_BASE = 'https://de1.api.radio-browser.info/json';

// ==================== CUSTOM TAGS & COUNTRIES MANAGEMENT ====================
const CustomFilters = {
    TAGS_KEY: 'radiowave_custom_tags',
    COUNTRIES_KEY: 'radiowave_custom_countries',
    
    DEFAULT_TAGS: [
        { name: 'pop', icon: 'fa-music' },
        { name: 'rock', icon: 'fa-guitar' },
        { name: 'jazz', icon: 'fa-saxophone' },
        { name: 'news', icon: 'fa-newspaper' },
        { name: 'classical', icon: 'fa-violin' },
        { name: 'electronic', icon: 'fa-bolt' },
        { name: 'dance', icon: 'fa-child' },
        { name: '80s', icon: 'fa-history' },
        { name: 'talk', icon: 'fa-microphone' }
    ],
    
    DEFAULT_COUNTRIES: [
        { code: 'BR', name: 'Brasil' },
        { code: 'US', name: 'Estados Unidos' },
        { code: 'GB', name: 'Reino Unido' },
        { code: 'FR', name: 'França' },
        { code: 'ES', name: 'Espanha' }
    ],
    
    getTags() {
        try {
            const tags = localStorage.getItem(this.TAGS_KEY);
            return tags ? JSON.parse(tags) : this.DEFAULT_TAGS;
        } catch (error) {
            console.error('Error reading tags:', error);
            return this.DEFAULT_TAGS;
        }
    },
    
    saveTags(tags) {
        try {
            localStorage.setItem(this.TAGS_KEY, JSON.stringify(tags));
        } catch (error) {
            console.error('Error saving tags:', error);
        }
    },
    
    addTag(tagName, icon = 'fa-music') {
        const tags = this.getTags();
        const exists = tags.some(t => t.name.toLowerCase() === tagName.toLowerCase());
        
        if (!exists) {
            tags.push({ name: tagName, icon: icon });
            this.saveTags(tags);
            renderTags();
            showToast({ message: `Tag "${tagName}" adicionada!`, type: 'success' });
            return true;
        }
        return false;
    },
    
    removeTag(tagName) {
        const tags = this.getTags();
        const filtered = tags.filter(t => t.name !== tagName);
        this.saveTags(filtered);
        renderTags();
        showToast({ message: `Tag "${tagName}" removida`, type: 'info' });
    },
    
    getCountries() {
        try {
            const countries = localStorage.getItem(this.COUNTRIES_KEY);
            return countries ? JSON.parse(countries) : this.DEFAULT_COUNTRIES;
        } catch (error) {
            console.error('Error reading countries:', error);
            return this.DEFAULT_COUNTRIES;
        }
    },
    
    saveCountries(countries) {
        try {
            localStorage.setItem(this.COUNTRIES_KEY, JSON.stringify(countries));
        } catch (error) {
            console.error('Error saving countries:', error);
        }
    },
    
    addCountry(code, name) {
        const countries = this.getCountries();
        const exists = countries.some(c => c.code === code);
        
        if (!exists) {
            countries.push({ code, name });
            this.saveCountries(countries);
            renderCountryFilters();
            showToast({ message: `País "${name}" adicionado!`, type: 'success' });
            return true;
        }
        return false;
    },
    
    removeCountry(code) {
        const countries = this.getCountries();
        const filtered = countries.filter(c => c.code !== code);
        this.saveCountries(filtered);
        renderCountryFilters();
        showToast({ message: 'País removido', type: 'info' });
    }
};

// ==================== URL PARAMETERS ====================
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        filter: params.get('filter'),
        search: params.get('s') || params.get('search'),
        tag: params.get('tag')
    };
}

function updateUrlParams(filter, search = '', tag = '') {
    const params = new URLSearchParams();
    
    if (filter && filter !== 'popular') params.set('filter', filter);
    if (search) params.set('s', search);
    if (tag) params.set('tag', tag);
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : window.location.pathname;
    
    window.history.replaceState({}, '', newUrl);
}

// ==================== FAVORITES SYSTEM ====================
const Favorites = {
    STORAGE_KEY: 'radiowave_likes',

    getLikes() {
        try {
            const likes = localStorage.getItem(this.STORAGE_KEY);
            return likes ? JSON.parse(likes) : [];
        } catch (error) {
            console.error('Error reading favorites:', error);
            return [];
        }
    },

    saveLikes(likes) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(likes));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    },

    isLiked(stationuuid) {
        const likes = this.getLikes();
        return likes.some(station => station.stationuuid === stationuuid);
    },

    addLike(station) {
        const likes = this.getLikes();
        if (!this.isLiked(station.stationuuid)) {
            likes.push({
                stationuuid: station.stationuuid,
                name: station.name,
                url_resolved: station.url_resolved,
                favicon: station.favicon,
                country: station.country,
                countrycode: station.countrycode,
                codec: station.codec,
                bitrate: station.bitrate,
                tags: station.tags
            });
            this.saveLikes(likes);
            this.updateBadge();
            showToast({ message: `${station.name} adicionada aos favoritos!`, type: 'success' });
            return true;
        }
        return false;
    },

    removeLike(stationuuid) {
        const likes = this.getLikes();
        const filtered = likes.filter(station => station.stationuuid !== stationuuid);
        this.saveLikes(filtered);
        this.updateBadge();
        showToast({ message: 'Removido dos favoritos', type: 'info' });
    },

    getLikedStations() {
        return this.getLikes();
    },

    updateBadge() {
        const count = this.getLikes().length;
        elements.favoritesBadge.textContent = count;
    }
};

// ==================== TOAST NOTIFICATION SYSTEM ====================
function showToast({ message, type = 'info', duration = 4000 }) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    
    elements.toaster.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Remove toast
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
    
    setTimeout(() => {
        toast.remove();
    }, duration + 400);
}

// ==================== FLAG UTILITIES ====================
function getFlagUrl(countryCode) {
    if (!countryCode || countryCode.length !== 2) return null;
    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
}

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

function createFlagElement(countryCode, country) {
    const flagUrl = getFlagUrl(countryCode);
    const emoji = getFlagEmoji(countryCode);
    
    if (flagUrl) {
        return `<img src="${flagUrl}" alt="${escapeHtml(country)}" class="country-flag" onerror="this.style.display='none';this.nextElementSibling.style.display='inline';">
                <span style="display:none;">${emoji}</span>`;
    }
    return emoji;
}

// ==================== ACTIVE FILTER BANNER ====================
function showActiveFilter(type, name) {
    state.activeFilterType = type;
    elements.activeFilterBanner.classList.remove('hidden');
    
    let icon = 'fa-filter';
    let label = name;
    
    switch(type) {
        case 'tag':
            icon = 'fa-tag';
            label = `Gênero: ${name}`;
            break;
        case 'country':
            icon = 'fa-flag';
            label = `País: ${name}`;
            break;
        case 'search':
            icon = 'fa-search';
            label = `Busca: "${name}"`;
            break;
        case 'favorites':
            icon = 'fa-heart';
            label = 'Favoritos';
            break;
    }
    
    elements.filterName.innerHTML = `<i class="fas ${icon}"></i> ${label}`;
}

function hideActiveFilter() {
    state.activeFilterType = null;
    elements.activeFilterBanner.classList.add('hidden');
}

function clearActiveFilter() {
    hideActiveFilter();
    state.currentTag = null;
    state.currentCountry = null;
    state.searchQuery = '';
    elements.searchInput.value = '';
    clearAllActiveStates();
    
    // Activate popular
    const popularBtn = elements.filterButtons.querySelector('[data-filter="popular"]');
    if (popularBtn) {
        popularBtn.classList.add('active');
    }
    
    loadStationsByFilter('popular');
}

// ==================== API FUNCTIONS ====================
async function fetchStations(endpoint, resetPagination = true) {
    try {
        if (resetPagination) {
            state.page = 0;
            state.noMoreData = false;
            state.allStations = [];
        }

        showLoading();
        
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'GET',
            headers: { 'User-Agent': 'RadioWave/2.0' }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        // FILTRAGEM E ORDENAÇÃO APRIMORADA
        const validStations = data.filter(station => 
            station.url_resolved && 
            station.url_resolved.trim() !== '' &&
            station.lastcheckok === 1 &&
            station.ssl_error === 0
        ).sort((a, b) => {
            return (b.clickcount || 0) - (a.clickcount || 0);
        });
        
        state.allStations = validStations;
        state.noMoreData = false; 
        
        loadNextPage(true);
        
    } catch (error) {
        console.error('Error fetching stations:', error);
        showToast({ message: 'Erro ao carregar. Tentando cache...', type: 'error' });
        showError();
    } finally {
        hideLoading();
    }
}

function loadNextPage(isFirst = false) {
    if (state.isFetching || state.noMoreData) return;
    
    state.isFetching = true;
    
    if (!isFirst) {
        showSkeletonForNextPage();
    }
    
    const start = state.page * state.pageSize;
    const end = start + state.pageSize;
    const pageStations = state.allStations.slice(start, end);
    
    if (pageStations.length === 0) {
        state.noMoreData = true;
        state.isFetching = false;
        hideSkeletonForNextPage();
        return;
    }
    
    if (pageStations.length < state.pageSize) {
        state.noMoreData = true;
    }
    
    setTimeout(() => {
        appendStationsToGrid(pageStations, isFirst);
        state.page++;
        state.isFetching = false;
        hideSkeletonForNextPage();
    }, 300);
}

async function searchStations(query) {
    if (!query || query.trim() === '') {
        clearActiveFilter();
        return;
    }
    
    const endpoint = `/stations/byname/${encodeURIComponent(query)}`;
    await fetchStations(endpoint);
    updateUrlParams(state.currentFilter, query, state.currentTag);
    showActiveFilter('search', query);
}

function loadStationsByFilter(filter) {
    let endpoint;
    
    // Clear tag state when switching filters
    state.currentTag = null;
    state.currentCountry = null;
    clearTagActive();
    
    switch(filter) {
        case 'popular':
            endpoint = '/stations/topclick';
            hideActiveFilter();
            break;
        case 'favorites':
            showFavorites();
            updateUrlParams('favorites');
            return;
        default:
            endpoint = `/stations/bycountrycodeexact/${filter}`;
            state.currentCountry = filter;
            const country = CustomFilters.getCountries().find(c => c.code === filter);
            if (country) {
                showActiveFilter('country', country.name);
            }
    }
    
    state.currentFilter = filter;
    fetchStations(endpoint);
    updateUrlParams(filter);
}

function showFavorites() {
    const favorites = Favorites.getLikedStations();
    state.allStations = favorites;
    state.page = 0;
    state.noMoreData = false;
    state.currentFilter = 'favorites';
    
    hideLoading();
    showActiveFilter('favorites', '');
    
    if (favorites.length === 0) {
        showEmptyState();
        elements.emptyState.innerHTML = `
            <i class="fas fa-heart-broken"></i>
            <h3>Nenhuma emissora favorita</h3>
            <p>Comece curtindo algumas emissoras!</p>
        `;
        updateStationCount(0);
        return;
    }
    
    loadNextPage(true);
}

// ==================== UI RENDERING ====================
function appendStationsToGrid(stations, clearFirst = false) {
    if (clearFirst) {
        elements.radioGrid.innerHTML = '';
        elements.radioGrid.classList.remove('hidden');
        elements.emptyState.classList.add('hidden');
    }
    
    if (state.page === 0 && stations.length === 0) {
        showEmptyState();
        return;
    }

    const fragment = document.createDocumentFragment();
    
    stations.forEach((station, index) => {
        const card = createStationCard(station);
        fragment.appendChild(card);
    });
    
    elements.radioGrid.appendChild(fragment);
    
    // Update count only on first page
    if (clearFirst) {
        updateStationCount(state.allStations.length);
    }

    // Lazy load images
    lazyLoadImages();

    // Attach listeners
    attachCardListeners();
}

function createStationCard(station) {
    const article = document.createElement('article');
    const isPlaying = state.currentStation?.stationuuid === station.stationuuid;
    const isLiked = Favorites.isLiked(station.stationuuid);
    
    article.className = `radio-card ${isPlaying ? 'playing' : ''}`;
    article.setAttribute('data-station-id', station.stationuuid);
    article.setAttribute('role', 'button');
    article.setAttribute('tabindex', '0');
    article.setAttribute('aria-label', `Tocar ${station.name}`);
    
    const tags = station.tags ? station.tags.split(',').slice(0, 3) : [];
    
    article.innerHTML = `
        ${isPlaying ? '<div class="playing-indicator"></div>' : ''}
        
        <button class="like-btn ${isLiked ? 'liked' : ''}" data-station-id="${station.stationuuid}" aria-label="${isLiked ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
            <i class="fas fa-heart"></i>
        </button>
        
        <div class="radio-image-wrapper">
            <img 
                class="radio-image loading" 
                data-src="${station.favicon || DEFAULT_ARTWORK}"
                alt="${escapeHtml(station.name)}"
                loading="lazy"
            >
            <div class="play-overlay">
                <i class="fas ${isPlaying ? 'fa-pause' : 'fa-play'}"></i>
            </div>
            <div class="loading-overlay">
                <div class="loading-spinner"></div>
                <div class="loading-text">Conectando...</div>
            </div>
        </div>
        
        <div class="radio-info">
            <h3 class="radio-name">${escapeHtml(station.name)}</h3>
            <div class="radio-meta">
                ${station.countrycode ? `
                    <div class="radio-meta-item clickable-meta" data-country="${station.countrycode}" data-country-name="${escapeHtml(station.country)}" title="Filtrar por ${escapeHtml(station.country)}">
                        ${createFlagElement(station.countrycode, station.country)}
                        <span>${escapeHtml(station.country || 'Unknown')}</span>
                    </div>
                ` : ''}
                ${station.codec ? `
                    <div class="radio-meta-item">
                        <i class="fas fa-music"></i>
                        <span>${station.codec} ${station.bitrate ? '• ' + station.bitrate + 'kbps' : ''}</span>
                    </div>
                ` : ''}
            </div>
            ${tags.length > 0 ? `
                <div class="radio-tags">
                    ${tags.map(tag => `<span class="tag clickable-tag" data-tag="${escapeHtml(tag.trim())}" title="Clique para filtrar por ${escapeHtml(tag.trim())}">
                        <i class="fas fa-hand-pointer tag-click-icon"></i>
                        ${escapeHtml(tag.trim())}
                    </span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    return article;
}

function showSkeletonForNextPage() {
    const skeletonHTML = `
        <div class="skeleton-card next-page-skeleton">
            <div class="skeleton-image"></div>
            <div class="skeleton-text"></div>
            <div class="skeleton-text short"></div>
        </div>
    `.repeat(3);
    
    const temp = document.createElement('div');
    temp.innerHTML = skeletonHTML;
    
    while (temp.firstChild) {
        elements.radioGrid.appendChild(temp.firstChild);
    }
}

function hideSkeletonForNextPage() {
    const skeletons = elements.radioGrid.querySelectorAll('.next-page-skeleton');
    skeletons.forEach(skeleton => skeleton.remove());
}

function lazyLoadImages() {
    const images = elements.radioGrid.querySelectorAll('.radio-image.loading');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.getAttribute('data-src');
                
                img.addEventListener('load', () => {
                    img.classList.remove('loading');
                });
                
                img.addEventListener('error', () => {
                    img.src = DEFAULT_ARTWORK;
                    img.classList.remove('loading');
                });
                
                img.src = src;
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px'
    });

    images.forEach(img => imageObserver.observe(img));
}

function attachCardListeners() {
    const cards = elements.radioGrid.querySelectorAll('.radio-card');
    
    cards.forEach(card => {
        const stationId = card.getAttribute('data-station-id');
        const station = [...state.allStations, ...Favorites.getLikedStations()].find(s => s.stationuuid === stationId);
        
        if (!station) return;

        // Like button
        const likeBtn = card.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleLike(station, likeBtn);
            });
        }

        // Clickable country meta
        const countryMeta = card.querySelector('.clickable-meta[data-country]');
        if (countryMeta) {
            countryMeta.addEventListener('click', (e) => {
                e.stopPropagation();
                const countryCode = countryMeta.getAttribute('data-country');
                const countryName = countryMeta.getAttribute('data-country-name');
                filterByCountry(countryCode, countryName);
            });
        }

        // Clickable tags
        const tagElements = card.querySelectorAll('.clickable-tag');
        tagElements.forEach(tagEl => {
            tagEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const tagName = tagEl.getAttribute('data-tag');
                handleTagClick(tagName, null);
            });
        });

        // Play handler - only on card, not like button or clickable elements
        const playHandler = (e) => {
            if (e.target.closest('.like-btn, .clickable-meta, .clickable-tag')) return;
            playStation(station, card);
        };

        card.addEventListener('click', playHandler);

        // Keyboard handler
        card.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                playHandler(e);
            }
        });
    });
}

function filterByCountry(countryCode, countryName) {
    // Clear search
    elements.searchInput.value = '';
    state.searchQuery = '';
    
    // Check if country already in custom list, if not offer to add
    const countries = CustomFilters.getCountries();
    const exists = countries.some(c => c.code === countryCode);
    
    if (!exists) {
        // Show toast with option to add
        showToast({ 
            message: `Gostou de ${countryName}? A tag será adicionada automaticamente aos seus filtros.`, 
            type: 'info',
            duration: 5000
        });
        CustomFilters.addCountry(countryCode, countryName);
    }
    
    // Update filter buttons
    const filterBtn = elements.filterButtons.querySelector(`[data-filter="${countryCode}"]`);
    if (filterBtn) {
        filterBtn.click();
    } else {
        // If button doesn't exist, load directly
        clearAllActiveStates();
        state.currentFilter = countryCode;
        loadStationsByFilter(countryCode);
    }
}

function toggleLike(station, likeBtn) {
    if (Favorites.isLiked(station.stationuuid)) {
        Favorites.removeLike(station.stationuuid);
        likeBtn.classList.remove('liked');
        likeBtn.setAttribute('aria-label', 'Adicionar aos favoritos');
        
        // If we're viewing favorites, remove the card
        if (state.currentFilter === 'favorites') {
            const card = likeBtn.closest('.radio-card');
            card.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                card.remove();
                if (elements.radioGrid.children.length === 0) {
                    showFavorites();
                }
            }, 300);
        }
    } else {
        Favorites.addLike(station);
        likeBtn.classList.add('liked');
        likeBtn.setAttribute('aria-label', 'Remover dos favoritos');
    }
}

// ==================== MEDIA SESSION API ====================
function updateMediaSession(station) {
    if ('mediaSession' in navigator) {
        const artwork = station.favicon && station.favicon.trim() !== '' 
            ? station.favicon 
            : window.location.origin + '/icons/icon-512.png';
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: station.name,
            artist: station.country || 'RadioWave',
            album: station.tags ? station.tags.split(',')[0] : 'Rádio Online',
            artwork: [
                { src: artwork, sizes: '96x96', type: 'image/png' },
                { src: artwork, sizes: '128x128', type: 'image/png' },
                { src: artwork, sizes: '512x512', type: 'image/png' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
            if (state.currentStation) {
                elements.audioPlayer.play();
            }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
            elements.audioPlayer.pause();
        });

        // These don't work for live streams but we set them anyway
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
    }
}

// ==================== PLAYER FUNCTIONS ====================
async function playStation(station, card) {
    // If clicking the same station
    if (state.currentStation?.stationuuid === station.stationuuid) {
        togglePlayPause();
        return;
    }

    // Show loading overlay on card
    const loadingOverlay = card.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }

    // Show loading on player button
    elements.playPauseBtn.classList.add('loading');
    elements.playPauseBtn.innerHTML = '<div class="mini-spinner"></div><i class="fas fa-play"></i>';

    // Stop current station
    if (state.isPlaying) {
        elements.audioPlayer.pause();
    }

    // Update state
    state.currentStation = station;

    // Update audio source
    elements.audioPlayer.src = station.url_resolved;
    elements.audioPlayer.volume = elements.volumeSlider.value / 100;
    
    // Play
    try {
        await elements.audioPlayer.play();
        state.isPlaying = true;
        updatePlayerUI(station);
        updateMediaSession(station);
        updateCardStates();
        elements.playPauseBtn.disabled = false;
        
        // Hide loading
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
        elements.playPauseBtn.classList.remove('loading');
        
    } catch (error) {
        console.error('Error playing station:', error);
        showToast({ 
            message: 'Não foi possível reproduzir esta emissora. Tente outra.', 
            type: 'error',
            duration: 5000
        });
        state.isPlaying = false;
        
        // Hide loading
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
        elements.playPauseBtn.classList.remove('loading');
    }
}

function togglePlayPause() {
    if (!state.currentStation) return;

    if (state.isPlaying) {
        elements.audioPlayer.pause();
        state.isPlaying = false;
    } else {
        elements.audioPlayer.play();
        state.isPlaying = true;
    }

    updatePlayPauseButton();
}

function updatePlayerUI(station) {
    elements.playerTitle.textContent = station.name;
    
    // Tratamento de legendas
    const subtitleParts = [];
    if (station.country) subtitleParts.push(station.country);
    
    // Mostra tags no player se disponível (melhora a info)
    if (station.tags) {
        const mainTag = station.tags.split(',')[0];
        if(mainTag) subtitleParts.push(mainTag);
    }
    
    const flagHtml = station.countrycode ? createFlagElement(station.countrycode, station.country) : '<i class="fas fa-globe"></i>';
    
    elements.playerSubtitle.innerHTML = `
        ${flagHtml}
        <span>${subtitleParts.join(' • ') || 'Tocando agora'}</span>
    `;

    // LÓGICA DE IMAGEM DO PLAYER CORRIGIDA
    const artwork = elements.playerArtwork;
    
    // Define o handler de erro ANTES de definir o src para pegar erros imediatos
    artwork.onerror = () => {
        artwork.src = DEFAULT_ARTWORK;
        artwork.classList.add('fallback');
    };

    // Tenta carregar o favicon, se for vazio ou der erro, o onerror assume
    if (station.favicon && station.favicon.trim() !== '') {
        artwork.src = station.favicon;
    } else {
        artwork.src = DEFAULT_ARTWORK;
    }

    updatePlayPauseButton();
}

function updatePlayPauseButton() {
    const icon = elements.playPauseBtn.querySelector('i');
    
    if (state.isPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        elements.playPauseBtn.setAttribute('aria-label', 'Pausar');
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        elements.playPauseBtn.setAttribute('aria-label', 'Play');
    }
}

function updateCardStates() {
    // Remove playing state from all cards
    const allCards = elements.radioGrid.querySelectorAll('.radio-card');
    allCards.forEach(card => {
        card.classList.remove('playing');
        const indicator = card.querySelector('.playing-indicator');
        if (indicator) indicator.remove();
        
        const playIcon = card.querySelector('.play-overlay i');
        if (playIcon) {
            playIcon.classList.remove('fa-pause');
            playIcon.classList.add('fa-play');
        }
    });

    // Add playing state to current card
    if (state.currentStation) {
        const currentCard = elements.radioGrid.querySelector(
            `[data-station-id="${state.currentStation.stationuuid}"]`
        );
        
        if (currentCard) {
            currentCard.classList.add('playing');
            
            if (!currentCard.querySelector('.playing-indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'playing-indicator';
                currentCard.insertBefore(indicator, currentCard.firstChild);
            }
            
            const playIcon = currentCard.querySelector('.play-overlay i');
            if (playIcon) {
                playIcon.classList.remove('fa-play');
                playIcon.classList.add('fa-pause');
            }
        }
    }
}

// ==================== UI STATE FUNCTIONS ====================
function showLoading() {
    elements.loadingSkeleton.classList.remove('hidden');
    elements.radioGrid.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
}

function hideLoading() {
    elements.loadingSkeleton.classList.add('hidden');
}

function showEmptyState() {
    elements.emptyState.classList.remove('hidden');
    elements.radioGrid.classList.add('hidden');
}

function showError() {
    elements.emptyState.classList.remove('hidden');
    elements.radioGrid.classList.add('hidden');
    elements.emptyState.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Erro ao carregar emissoras</h3>
        <p>Verifique sua conexão e tente novamente</p>
    `;
}

function updateStationCount(count) {
    elements.stationCount.textContent = `${count} emissora${count !== 1 ? 's' : ''} disponível${count !== 1 ? 'veis' : ''}`;
}

// ==================== INFINITE SCROLL ====================
function setupInfiniteScroll() {
    const sentinelObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !state.isFetching && !state.noMoreData) {
                loadNextPage();
            }
        });
    }, {
        rootMargin: '400px'
    });

    sentinelObserver.observe(elements.scrollSentinel);
}

// ==================== TAG NAVIGATION ====================
function renderTags() {
    const container = elements.tagCloud;
    if (!container) return;

    const tags = CustomFilters.getTags();
    
    container.innerHTML = tags.map(tag => `
        <button class="tag-card" data-tag="${tag.name}">
            <i class="fas ${tag.icon}"></i>
            <span class="tag-name">${tag.name}</span>
            <span class="tag-remove-btn" data-tag="${tag.name}" title="Remover tag" aria-label="Remover tag ${tag.name}">
                <i class="fas fa-times"></i>
            </span>
        </button>
    `).join('') + `
        <button class="tag-card add-tag-btn" title="Adicionar nova tag">
            <i class="fas fa-plus"></i>
            <span class="tag-name">Adicionar</span>
        </button>
    `;
    
    // Attach listeners
    attachTagListeners();
}

function attachTagListeners() {
    // Tag click handlers
    const tagCards = document.querySelectorAll('.tag-card[data-tag]');
    tagCards.forEach(card => {
        const tagName = card.getAttribute('data-tag');
        
        card.addEventListener('click', (e) => {
            // Ignore if clicking remove button
            if (e.target.closest('.tag-remove-btn')) return;
            handleTagClick(tagName, card);
        });
    });
    
    // Remove button handlers
    const removeButtons = document.querySelectorAll('.tag-remove-btn');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tagName = btn.getAttribute('data-tag');
            
            if (confirm(`Remover a tag "${tagName}"?`)) {
                CustomFilters.removeTag(tagName);
                
                // If currently filtered by this tag, clear filter
                if (state.currentTag === tagName) {
                    clearActiveFilter();
                }
            }
        });
    });
    
    // Add tag button
    const addBtn = document.querySelector('.add-tag-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const tagName = prompt('Digite o nome da nova tag (gênero musical):');
            if (tagName && tagName.trim()) {
                const added = CustomFilters.addTag(tagName.trim().toLowerCase());
                if (!added) {
                    showToast({ message: 'Esta tag já existe!', type: 'warning' });
                }
            }
        });
    }
}

window.handleTagClick = async (tagName, element) => {
    // Clear all active states
    clearAllActiveStates();
    
    // Activate clicked tag
    if (element) {
        element.classList.add('active');
    } else {
        // If called programmatically, find and activate the button
        const tagBtn = document.querySelector(`[data-tag="${tagName}"]`);
        if (tagBtn) tagBtn.classList.add('active');
    }
    
    // Clear search
    elements.searchInput.value = '';
    state.currentFilter = 'tag';
    state.currentTag = tagName;
    
    // Fetch stations by tag
    const endpoint = `/stations/bytag/${encodeURIComponent(tagName)}`;
    await fetchStations(endpoint);
    
    updateUrlParams('tag', '', tagName);
    showActiveFilter('tag', tagName);
};

// ==================== COUNTRY FILTERS RENDERING ====================
function renderCountryFilters() {
    const container = elements.filterButtons;
    if (!container) return;
    
    const countries = CustomFilters.getCountries();
    
    // Keep popular and favorites buttons
    const fixedButtons = `
        <button class="filter-btn active" data-filter="popular" aria-label="Emissoras populares">
            <i class="fas fa-fire"></i> Populares
        </button>
        <button class="filter-btn" data-filter="favorites" aria-label="Minhas emissoras favoritas">
            <i class="fas fa-heart"></i> Curtidas
        </button>
    `;
    
    const countryButtons = countries.map(country => `
        <button class="filter-btn country-filter-btn" data-filter="${country.code}" aria-label="Emissoras de ${country.name}">
            <img src="https://flagcdn.com/24x18/${country.code.toLowerCase()}.png" alt="${country.name}" class="country-flag"> 
            ${country.name}
            <span class="country-remove-btn" data-country="${country.code}" title="Remover" aria-label="Remover ${country.name}">
                <i class="fas fa-times"></i>
            </span>
        </button>
    `).join('');
    
    const addButton = `
        <button class="filter-btn add-country-btn" title="Adicionar país">
            <i class="fas fa-plus"></i> Adicionar
        </button>
    `;
    
    container.innerHTML = fixedButtons + countryButtons + addButton;
    
    // Reattach filter listeners
    attachFilterListeners();
}

function attachFilterListeners() {
    // Filter button clicks
    const filterBtns = elements.filterButtons.querySelectorAll('.filter-btn:not(.add-country-btn)');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Ignore if clicking remove button
            if (e.target.closest('.country-remove-btn')) return;
            
            const filter = btn.getAttribute('data-filter');
            
            // Update active state
            clearFilterActive();
            btn.classList.add('active');

            // Clear search
            elements.searchInput.value = '';
            state.searchQuery = '';

            // Update state and load
            state.currentFilter = filter;
            loadStationsByFilter(filter);
        });
    });
    
    // Remove country buttons
    const removeButtons = elements.filterButtons.querySelectorAll('.country-remove-btn');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const countryCode = btn.getAttribute('data-country');
            const country = CustomFilters.getCountries().find(c => c.code === countryCode);
            
            if (country && confirm(`Remover "${country.name}" dos filtros?`)) {
                CustomFilters.removeCountry(countryCode);
                
                // If currently filtered by this country, clear filter
                if (state.currentCountry === countryCode) {
                    clearActiveFilter();
                }
            }
        });
    });
    
    // Add country button
    const addBtn = elements.filterButtons.querySelector('.add-country-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const countryCode = prompt('Digite o código do país (2 letras, ex: BR, US, DE):');
            if (countryCode && countryCode.trim().length === 2) {
                const code = countryCode.trim().toUpperCase();
                const name = prompt(`Digite o nome do país para ${code}:`);
                
                if (name && name.trim()) {
                    const added = CustomFilters.addCountry(code, name.trim());
                    if (!added) {
                        showToast({ message: 'Este país já existe!', type: 'warning' });
                    }
                }
            } else {
                showToast({ message: 'Código inválido! Use 2 letras (ex: BR)', type: 'error' });
            }
        });
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Search with debounce
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        searchTimeout = setTimeout(() => {
            state.searchQuery = query;
            searchStations(query);
        }, 500);
    });

    // Favorites badge button
    elements.favoritesBadgeBtn.addEventListener('click', () => {
        // Trigger favorites filter
        const favBtn = elements.filterButtons.querySelector('[data-filter="favorites"]');
        if (favBtn) favBtn.click();
    });
    
    // Clear filter button
    elements.clearFilterBtn.addEventListener('click', clearActiveFilter);

    // Play/Pause button
    elements.playPauseBtn.addEventListener('click', togglePlayPause);

    // Volume control
    elements.volumeSlider.addEventListener('input', (e) => {
        const volume = e.target.value / 100;
        elements.audioPlayer.volume = volume;
        updateVolumeIcon(volume);
    });

    elements.volumeIcon.addEventListener('click', () => {
        if (elements.audioPlayer.volume > 0) {
            elements.audioPlayer.dataset.previousVolume = elements.audioPlayer.volume;
            elements.audioPlayer.volume = 0;
            elements.volumeSlider.value = 0;
            updateVolumeIcon(0);
        } else {
            const previousVolume = parseFloat(elements.audioPlayer.dataset.previousVolume) || 0.7;
            elements.audioPlayer.volume = previousVolume;
            elements.volumeSlider.value = previousVolume * 100;
            updateVolumeIcon(previousVolume);
        }
    });

    // Audio events
    elements.audioPlayer.addEventListener('pause', () => {
        state.isPlaying = false;
        updatePlayPauseButton();
    });

    elements.audioPlayer.addEventListener('play', () => {
        state.isPlaying = true;
        updatePlayPauseButton();
    });

    elements.audioPlayer.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        state.isPlaying = false;
        updatePlayPauseButton();
        showToast({ message: 'Erro na reprodução. Tente outra emissora.', type: 'error' });
    });

    // Online/Offline detection
    window.addEventListener('online', () => {
        state.isOnline = true;
        elements.offlineIndicator.classList.add('hidden');
        showToast({ message: 'Você está online!', type: 'success' });
    });

    window.addEventListener('offline', () => {
        state.isOnline = false;
        elements.offlineIndicator.classList.remove('hidden');
        showToast({ message: 'Você está offline. Usando cache.', type: 'warning', duration: 6000 });
    });
}

function updateVolumeIcon(volume) {
    elements.volumeIcon.className = 'volume-icon fas ';
    if (volume === 0) {
        elements.volumeIcon.classList.add('fa-volume-mute');
    } else if (volume < 0.5) {
        elements.volumeIcon.classList.add('fa-volume-down');
    } else {
        elements.volumeIcon.classList.add('fa-volume-up');
    }
}

// ==================== UTILITIES ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function clearAllActiveStates() {
    clearFilterActive();
    clearTagActive();
}

function clearFilterActive() {
    elements.filterButtons.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
    });
}

function clearTagActive() {
    document.querySelectorAll('.tag-card').forEach(btn => {
        btn.classList.remove('active');
    });
}

// ==================== SERVICE WORKER REGISTRATION ====================
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showToast({
                                message: 'Atualização disponível! Recarregue a página.',
                                type: 'info',
                                duration: 8000
                            });
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
}

// ==================== INITIALIZATION ====================
function init() {
    elements.audioPlayer.volume = 0.7;
    Favorites.updateBadge();
    setupEventListeners();
    setupInfiniteScroll();
    registerServiceWorker();
    
    // Renderiza as tags e países customizáveis
    renderTags();
    renderCountryFilters();
    
    if (!state.isOnline) {
        elements.offlineIndicator.classList.remove('hidden');
    }
    
    // Read URL parameters
    const urlParams = getUrlParams();
    
    if (urlParams.search) {
        elements.searchInput.value = urlParams.search;
        state.searchQuery = urlParams.search;
        searchStations(urlParams.search);
    } else if (urlParams.tag) {
        // Activate tag from URL
        const tagBtn = document.querySelector(`[data-tag="${urlParams.tag}"]`);
        if (tagBtn) {
            handleTagClick(urlParams.tag, tagBtn);
        } else {
            loadStationsByFilter('popular');
        }
    } else if (urlParams.filter) {
        // Activate filter from URL
        const filterBtn = elements.filterButtons.querySelector(`[data-filter="${urlParams.filter}"]`);
        if (filterBtn) {
            filterBtn.click();
        } else {
            loadStationsByFilter('popular');
        }
    } else {
        loadStationsByFilter('popular');
    }
    
    // Welcome toast
    setTimeout(() => {
        showToast({ 
            message: 'Bem-vindo ao RadioWave! 🎵', 
            type: 'success',
            duration: 3000 
        });
    }, 500);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);