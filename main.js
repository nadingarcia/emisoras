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
 * 
 * Version: 2.0.0
 */

// ==================== STATE MANAGEMENT ====================
const state = {
    stations: [],
    allStations: [], // Para paginação client-side
    currentStation: null,
    isPlaying: false,
    currentFilter: 'popular',
    searchQuery: '',
    page: 0,
    pageSize: 20,
    isFetching: false,
    noMoreData: false,
    isOnline: navigator.onLine
};

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
    toaster: document.getElementById('toaster')
};

// ==================== API CONFIGURATION ====================
const API_BASE = 'https://de2.api.radio-browser.info/json';

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
            headers: {
                'User-Agent': 'RadioWave/2.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filter valid stations
        const validStations = data.filter(station => 
            station.url_resolved && 
            station.url_resolved.trim() !== '' &&
            station.lastcheckok === 1
        );
        
        state.allStations = validStations;
        
        // --- CORREÇÃO AQUI ---
        // Força o reset do noMoreData novamente, pois o IntersectionObserver 
        // pode ter setado como true enquanto o fetch estava acontecendo.
        state.noMoreData = false; 
        
        // Load first page
        loadNextPage(true);
        
    } catch (error) {
        console.error('Error fetching stations:', error);
        showToast({ message: 'Erro ao carregar emissoras. Tentando cache offline...', type: 'error' });
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
        loadStationsByFilter(state.currentFilter);
        return;
    }
    
    const endpoint = `/stations/byname/${encodeURIComponent(query)}`;
    await fetchStations(endpoint);
}

function loadStationsByFilter(filter) {
    let endpoint;
    
    switch(filter) {
        case 'popular':
            endpoint = '/stations/topclick';
            break;
        case 'favorites':
            showFavorites();
            return;
        default:
            endpoint = `/stations/bycountrycodeexact/${filter}`;
    }
    
    fetchStations(endpoint);
}

function showFavorites() {
    const favorites = Favorites.getLikedStations();
    state.allStations = favorites;
    state.page = 0;
    state.noMoreData = false;
    
    hideLoading();
    
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
                data-src="${station.favicon || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect fill=\'%23334155\' width=\'100\' height=\'100\'/%3E%3Ctext x=\'50\' y=\'50\' font-size=\'40\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%2364748b\'%3E♫%3C/text%3E%3C/svg%3E'}"
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
                <div class="radio-meta-item">
                    ${createFlagElement(station.countrycode, station.country)}
                    <span>${escapeHtml(station.country || 'Unknown')}</span>
                </div>
                ${station.codec ? `
                    <div class="radio-meta-item">
                        <i class="fas fa-music"></i>
                        <span>${station.codec} ${station.bitrate ? '• ' + station.bitrate + 'kbps' : ''}</span>
                    </div>
                ` : ''}
            </div>
            ${tags.length > 0 ? `
                <div class="radio-tags">
                    ${tags.map(tag => `<span class="tag">${escapeHtml(tag.trim())}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    return article;
}

function showSkeletonForNextPage() {
    // Add skeleton cards at the end
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
                    img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23334155' width='100' height='100'/%3E%3Ctext x='50' y='50' font-size='40' text-anchor='middle' dy='.3em' fill='%2364748b'%3E♫%3C/text%3E%3C/svg%3E";
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

        // Play handler - only on card, not like button
        const playHandler = (e) => {
            if (e.target.closest('.like-btn')) return;
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
    
    const subtitleParts = [];
    if (station.country) subtitleParts.push(station.country);
    if (station.state) subtitleParts.push(station.state);
    
    const flagHtml = station.countrycode ? createFlagElement(station.countrycode, station.country) : '<i class="fas fa-globe"></i>';
    
    elements.playerSubtitle.innerHTML = `
        ${flagHtml}
        <span>${subtitleParts.join(', ') || 'Tocando agora'}</span>
    `;

    if (station.favicon) {
        elements.playerArtwork.src = station.favicon;
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

    // Filter buttons
    elements.filterButtons.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;

        const filter = btn.getAttribute('data-filter');
        
        // Update active state
        elements.filterButtons.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.remove('active');
        });
        btn.classList.add('active');

        // Clear search
        elements.searchInput.value = '';
        state.searchQuery = '';

        // Update state and load
        state.currentFilter = filter;
        loadStationsByFilter(filter);
    });

    // Favorites badge button
    elements.favoritesBadgeBtn.addEventListener('click', () => {
        // Trigger favorites filter
        const favBtn = elements.filterButtons.querySelector('[data-filter="favorites"]');
        if (favBtn) favBtn.click();
    });

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
    // Set initial volume
    elements.audioPlayer.volume = 0.7;
    
    // Update favorites badge
    Favorites.updateBadge();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup infinite scroll
    setupInfiniteScroll();
    
    // Register Service Worker
    registerServiceWorker();
    
    // Check online status
    if (!state.isOnline) {
        elements.offlineIndicator.classList.remove('hidden');
    }
    
    // Load popular stations by default
    loadStationsByFilter('popular');
    
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