// =============================================================================
// fitClub Service Worker — Stale-While-Revalidate + Auto-Update
// =============================================================================
//
// ── ESTRATÉGIA DE ATUALIZAÇÃO ──────────────────────────────────────────────
// Para forçar todos os usuários a baixar a nova versão, basta incrementar
// CACHE_VERSION antes de fazer o build e deploy.
//
//   v1 → v2 → v3 ...
//
// O SW antigo será descartado automaticamente na próxima inicialização do app.
// =============================================================================

const CACHE_VERSION = 'v5';
const CACHE_NAME = `fitclub-cache-${CACHE_VERSION}`;

// Recursos que serão pré-cacheados na instalação do SW (App Shell)
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ===========================================================================
// INSTALL — Pré-cacheia o App Shell e ativa imediatamente sem esperar
// ===========================================================================
self.addEventListener('install', (event) => {
  console.log(`[SW] Instalando versão ${CACHE_VERSION}...`);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_URLS);
    })
  );

  // Força este SW a se tornar ativo imediatamente, sem esperar que
  // todas as abas com o SW antigo sejam fechadas.
  self.skipWaiting();
});

// ===========================================================================
// ACTIVATE — Remove caches de versões antigas e assume o controle
// ===========================================================================
self.addEventListener('activate', (event) => {
  console.log(`[SW] Ativando versão ${CACHE_VERSION}. Limpando caches antigos...`);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('fitclub-cache-') && name !== CACHE_NAME)
          .map((oldCache) => {
            console.log(`[SW] Removendo cache antigo: ${oldCache}`);
            return caches.delete(oldCache);
          })
      );
    }).then(() => {
      // Assume o controle de todas as abas abertas imediatamente,
      // sem precisar recarregar.
      return self.clients.claim();
    })
  );
});

// ===========================================================================
// FETCH — Estratégia Stale-While-Revalidate para assets estáticos
// ===========================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições que não são GET (POST, PUT, DELETE etc.)
  if (request.method !== 'GET') return;

  // Ignora requisições para APIs externas (Supabase, Google Fonts, etc.)
  // Apenas recursos da mesma origem (mesmo domínio) serão cacheados.
  if (url.origin !== self.location.origin) return;

  // Ignora arquivos que nunca devem ser cacheados para garantir
  // que o usuário sempre receba a versão mais recente.
  const noCachePatterns = ['/manifest.json', '/version.json'];
  if (noCachePatterns.some((pattern) => url.pathname === pattern)) return;

  // ── Stale-While-Revalidate ────────────────────────────────────────────────
  // 1. Retorna imediatamente do cache (se existir) para o usuário.
  // 2. Simultaneamente, busca a versão mais nova na rede.
  // 3. Atualiza o cache em background para a próxima visita.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request).then((networkResponse) => {
          // Cacheia apenas respostas válidas (status 200, tipo básico)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Falha silenciosa na rede (offline) — o cache já foi retornado
        });

        // Retorna o cache imediatamente se disponível, caso contrário aguarda a rede
        return cachedResponse || networkFetch;
      });
    })
  );
});

// ===========================================================================
// MESSAGE — Canal de comunicação com a página principal
// ===========================================================================
self.addEventListener('message', (event) => {
  // Permite que a página force o SW a pular a espera programaticamente
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
