/**
 * RadioWave Service Worker - Versão Final v3.0.0
 * 
 * Estratégias Unificadas:
 * 1. Assets Estáticos: Cache First (Rápido para o App Shell)
 * 2. API: Stale-While-Revalidate (Instantâneo + Atualização em Background)
 * 3. Imagens: Cache First Híbrido (Suporta CORS e Opaque Responses para logotipos externos)
 * 
 * Version: 3.0.0
 */

const CACHE_VERSION = 'v3.1.1';
const STATIC_CACHE = `radiowave-static-${CACHE_VERSION}`;
const IMAGES_CACHE = `radiowave-images-${CACHE_VERSION}`;
const API_CACHE = `radiowave-api-${CACHE_VERSION}`;

// Assets essenciais para o App funcionar offline
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

// Configurações
const IMAGES_MAX_ENTRIES = 200; // Máximo de imagens salvas
const IMAGES_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 dias
const API_MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas

// ==================== INSTALAÇÃO ====================
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando v3.0.0...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// ==================== ATIVAÇÃO ====================
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando e limpando caches antigos...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName.startsWith('radiowave-') && 
                        cacheName !== STATIC_CACHE && 
                        cacheName !== IMAGES_CACHE && 
                        cacheName !== API_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ==================== FETCH (ROTEADOR) ====================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora requisições que não sejam GET (POST, PUT, etc.)
    if (request.method !== 'GET') return;

    // 1. Assets Estáticos (CSS, JS, HTML Local)
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // 2. Imagens (Logos, Ícones, Favicons)
    if (isImage(request)) {
        event.respondWith(imageStrategy(request));
        return;
    }

    // 3. API (Radio Browser, JSONs)
    if (isAPIRequest(url)) {
        event.respondWith(apiStrategy(request));
        return;
    }

    // 4. Fallback para rede (qualquer outra coisa)
    event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ==================== ESTRATÉGIAS ====================

/**
 * Estratégia para IMAGENS (A mais complexa para garantir compatibilidade)
 * Tenta cache -> Tenta Rede (CORS) -> Tenta Rede (No-CORS/Opaco) -> Salva Cache
 */
async function imageStrategy(request) {
    const cache = await caches.open(IMAGES_CACHE);
    const cachedResponse = await cache.match(request);

    // Se estiver no cache, retorna, mas verifica validade se possível
    if (cachedResponse) {
        // Se for resposta opaca (status 0), não conseguimos ler headers de data.
        // Assumimos válido para performance.
        if (cachedResponse.status === 0) return cachedResponse;

        // Se tiver data, verifica validade
        const dateHeader = cachedResponse.headers.get('sw-cached-date');
        if (dateHeader) {
            const age = Date.now() - new Date(dateHeader).getTime();
            if (age < IMAGES_MAX_AGE) return cachedResponse;
            // Se expirou, deleta e continua para o fetch
            await cache.delete(request);
        } else {
            return cachedResponse;
        }
    }

    try {
        // Tenta fetch normal primeiro (com CORS)
        const response = await fetch(request);
        
        // Se for 200 OK ou 0 (Opaco/No-Cors)
        if (response && (response.status === 200 || response.status === 0)) {
            // Clona para salvar
            const responseToCache = response.clone();
            
            // Tenta adicionar header de data se não for opaco
            if (response.status === 200 && response.type !== 'opaque') {
                try {
                    const headers = new Headers(responseToCache.headers);
                    headers.append('sw-cached-date', new Date().toISOString());
                    const newResponse = new Response(responseToCache.body, {
                        status: responseToCache.status,
                        statusText: responseToCache.statusText,
                        headers: headers
                    });
                    await cache.put(request, newResponse);
                } catch (e) {
                    // Fallback se falhar ao recriar Response
                    await cache.put(request, response.clone());
                }
            } else {
                // Salva resposta opaca diretamente
                await cache.put(request, responseToCache);
            }
            
            // Limpa cache se estiver muito cheio
            trimCache(IMAGES_CACHE, IMAGES_MAX_ENTRIES);
        }
        return response;

    } catch (error) {
        console.warn('[SW] Falha no fetch de imagem, tentando no-cors:', request.url);
        
        // Fallback: Tenta fetch com mode: 'no-cors' (para cross-origin rígido)
        try {
            const noCorsRequest = new Request(request.url, {
                mode: 'no-cors',
                credentials: 'omit' // Importante para não enviar cookies
            });
            const response = await fetch(noCorsRequest);
            if (response) {
                await cache.put(request, response.clone());
                return response;
            }
        } catch (innerError) {
            console.error('[SW] Imagem falhou totalmente:', innerError);
        }
        
        // Se tudo falhar, retorna imagem transparente ou nada (para não quebrar layout)
        if (cachedResponse) return cachedResponse;
        return new Response('', { status: 404, statusText: 'Not Found' });
    }
}

/**
 * Estratégia para API (Stale-While-Revalidate)
 * Retorna cache imediatamente (se houver), e atualiza em background.
 */
async function apiStrategy(request) {
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);

    // Promise da rede (Network)
    const networkFetch = fetch(request).then(response => {
        if (response && response.status === 200) {
            // Clona e salva a nova versão
            cache.put(request, response.clone());
        }
        return response;
    }).catch(err => {
        console.log('[SW] API offline/erro:', err);
        return null; // Retorna null para tratarmos depois
    });

    // Se temos cache, retornamos ele IMEDIATAMENTE e deixamos a rede atualizar o cache
    if (cachedResponse) {
        // Não esperamos o networkFetch terminar para responder ao usuário (velocidade)
        // O networkFetch vai rodar em background e atualizar o cache para a PRÓXIMA vez.
        return cachedResponse;
    }

    // Se não temos cache, somos obrigados a esperar a rede
    const response = await networkFetch;
    return response || new Response(JSON.stringify({ error: "Offline" }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
    });
}

/**
 * Estratégia Padrão (Cache First simples)
 */
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.status === 200) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Página offline se for HTML
        if (request.headers.get('accept').includes('text/html')) {
            return new Response(getOfflinePage(), { headers: { 'Content-Type': 'text/html' } });
        }
        throw error;
    }
}

async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cache = await caches.open(cacheName);
        return await cache.match(request);
    }
}

// ==================== HELPERS ====================

function isStaticAsset(url) {
    return url.origin === self.location.origin && (
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname === '/'
    );
}

function isImage(request) {
    const url = request.url;
    return request.destination === 'image' || 
           url.match(/\.(png|jpg|jpeg|svg|gif|ico|webp)$/i) ||
           url.includes('favicon') ||
           url.includes('flagcdn');
}

function isAPIRequest(url) {
    return url.hostname.includes('radio-browser.info') ||
           url.pathname.includes('/json/') ||
           url.pathname.includes('api');
}

// Remove itens antigos do cache (FIFO)
async function trimCache(cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
        // Deleta os mais antigos (do início do array)
        await Promise.all(
            keys.slice(0, keys.length - maxEntries).map(key => cache.delete(key))
        );
    }
}

function getOfflinePage() {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><title>Offline - RadioWave</title></head>
    <body style="background:#0F172A;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;text-align:center">
        <div>
            <h1>📡 Sem Conexão</h1>
            <p>Verifique sua internet e tente novamente.</p>
        </div>
    </body>
    </html>`;
}