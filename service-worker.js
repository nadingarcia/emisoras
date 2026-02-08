/**
 * RadioWave Service Worker
 * 
 * Caching Strategies:
 * - Static assets: Cache First (HTML, CSS, JS, icons)
 * - Images: Cache First with expiration (30 days, max 200 entries)
 * - API: Stale-While-Revalidate (serve cache quickly, update in background)
 * 
 * Version: 2.0.0
 */

const CACHE_VERSION = 'v1.1.4';
const STATIC_CACHE = `radiowave-static-${CACHE_VERSION}`;
const IMAGES_CACHE = `radiowave-images-${CACHE_VERSION}`;
const API_CACHE = `radiowave-api-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/main.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/bulma@1.0.0/css/bulma.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Sans:wght@400;500;700&display=swap'
];

// Maximum cache sizes and expiration times
const IMAGES_MAX_ENTRIES = 200;
const IMAGES_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const API_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

// ==================== INSTALL EVENT ====================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting(); // Activate immediately
            })
            .catch(error => {
                console.error('[SW] Error caching static assets:', error);
            })
    );
});

// ==================== ACTIVATE EVENT ====================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                // Delete old caches
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName.startsWith('radiowave-') && 
                            cacheName !== STATIC_CACHE && 
                            cacheName !== IMAGES_CACHE && 
                            cacheName !== API_CACHE) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker activated');
                return self.clients.claim(); // Take control immediately
            })
    );
});

// ==================== FETCH EVENT ====================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Strategy selection based on request type
    if (isStaticAsset(url)) {
        // Static assets: Cache First
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else if (isImage(request)) {
        // Images: Cache First with expiration
        event.respondWith(cacheFirstWithExpiration(request, IMAGES_CACHE, IMAGES_MAX_AGE, IMAGES_MAX_ENTRIES));
    } else if (isAPIRequest(url)) {
        // API: Stale-While-Revalidate
        event.respondWith(staleWhileRevalidate(request, API_CACHE, API_MAX_AGE));
    } else {
        // Everything else: Network First
        event.respondWith(networkFirst(request, STATIC_CACHE));
    }
});

// ==================== CACHING STRATEGIES ====================

/**
 * Cache First Strategy
 * Serves from cache if available, otherwise fetches from network and caches
 */
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
        console.log('[SW] Cache hit:', request.url);
        return cached;
    }
    
    console.log('[SW] Cache miss, fetching:', request.url);
    try {
        const response = await fetch(request);
        
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        
        // Return offline page for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
            return new Response(getOfflinePage(), {
                headers: { 'Content-Type': 'text/html' }
            });
        }
        
        throw error;
    }
}

/**
 * Cache First with Expiration
 * Like Cache First but with cache expiration and max entries limit
 */
async function cacheFirstWithExpiration(request, cacheName, maxAge, maxEntries) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    // Check if cached and not expired
    if (cached) {
        const cachedDate = new Date(cached.headers.get('sw-cached-date'));
        const now = new Date();
        
        if (now - cachedDate < maxAge) {
            console.log('[SW] Cache hit (valid):', request.url);
            return cached;
        } else {
            console.log('[SW] Cache expired:', request.url);
            await cache.delete(request);
        }
    }
    
    try {
        const response = await fetch(request);
        
        if (response && response.status === 200) {
            // Add custom header with cache date
            const clonedResponse = response.clone();
            const headers = new Headers(clonedResponse.headers);
            headers.set('sw-cached-date', new Date().toISOString());
            
            const newResponse = new Response(clonedResponse.body, {
                status: clonedResponse.status,
                statusText: clonedResponse.statusText,
                headers: headers
            });
            
            cache.put(request, newResponse);
            
            // Enforce max entries limit
            await trimCache(cacheName, maxEntries);
        }
        
        return response;
    } catch (error) {
        console.error('[SW] Fetch failed, serving stale cache:', error);
        
        // Return stale cache if network fails
        if (cached) {
            return cached;
        }
        
        throw error;
    }
}

/**
 * Stale-While-Revalidate Strategy
 * Serves from cache immediately, then updates cache in background
 */
async function staleWhileRevalidate(request, cacheName, maxAge) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    // Fetch fresh data in the background
    const fetchPromise = fetch(request)
        .then(response => {
            if (response && response.status === 200) {
                const headers = new Headers(response.headers);
                headers.set('sw-cached-date', new Date().toISOString());
                
                const newResponse = new Response(response.clone().body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: headers
                });
                
                cache.put(request, newResponse);
            }
            return response;
        })
        .catch(error => {
            console.error('[SW] Background fetch failed:', error);
            return null;
        });
    
    // Return cached data immediately if available and valid
    if (cached) {
        const cachedDate = new Date(cached.headers.get('sw-cached-date'));
        const now = new Date();
        
        if (now - cachedDate < maxAge) {
            console.log('[SW] Serving stale cache:', request.url);
            return cached;
        }
    }
    
    // Otherwise wait for network
    console.log('[SW] Cache invalid, waiting for network:', request.url);
    const response = await fetchPromise;
    return response || cached || new Response('Offline', { status: 503 });
}

/**
 * Network First Strategy
 * Tries network first, falls back to cache
 */
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    
    try {
        const response = await fetch(request);
        
        if (response && response.status === 200) {
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('[SW] Network failed, trying cache:', error);
        const cached = await cache.match(request);
        
        if (cached) {
            return cached;
        }
        
        throw error;
    }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
    return url.origin === self.location.origin && (
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.json') ||
        url.pathname.includes('/icons/') ||
        url.pathname === '/'
    );
}

/**
 * Check if request is for an image
 */
function isImage(request) {
    return request.destination === 'image' || 
           request.url.includes('favicon') ||
           request.url.includes('flagcdn.com');
}

/**
 * Check if request is for API data
 */
function isAPIRequest(url) {
    return url.hostname.includes('radio-browser.info') ||
           url.pathname.includes('/json/');
}

/**
 * Trim cache to max entries (FIFO)
 */
async function trimCache(cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxEntries) {
        const keysToDelete = keys.slice(0, keys.length - maxEntries);
        console.log(`[SW] Trimming ${keysToDelete.length} entries from ${cacheName}`);
        
        await Promise.all(
            keysToDelete.map(key => cache.delete(key))
        );
    }
}

/**
 * Generate offline page HTML
 */
function getOfflinePage() {
    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>RadioWave - Offline</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: #0F172A;
                    color: #F8FAFC;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 2rem;
                    text-align: center;
                }
                .offline-container {
                    max-width: 500px;
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1.5rem;
                }
                h1 {
                    font-size: 2rem;
                    margin-bottom: 1rem;
                }
                p {
                    color: #94A3B8;
                    line-height: 1.6;
                    margin-bottom: 2rem;
                }
                button {
                    background: #F59E0B;
                    color: #0F172A;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 8px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                button:hover {
                    transform: translateY(-2px);
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📡</div>
                <h1>Você está offline</h1>
                <p>Não foi possível conectar ao RadioWave. Verifique sua conexão com a internet e tente novamente.</p>
                <button onclick="window.location.reload()">Tentar novamente</button>
            </div>
        </body>
        </html>
    `;
}

// ==================== MESSAGE HANDLING ====================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName.startsWith('radiowave-')) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        );
    }
});

console.log('[SW] Service Worker loaded');