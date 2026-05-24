// =============================================================================
// fitClub — Registro do Service Worker (PWA)
// =============================================================================
// Detecta suporte, registra o SW e notifica sobre atualizações disponíveis.
// =============================================================================

(function registerServiceWorker() {
  // Verifica se o navegador suporta Service Workers
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker não suportado neste navegador.');
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);

        // ── Detecta atualização disponível ──────────────────────────────────
        // Quando um novo SW termina de ser baixado, ele fica em estado
        // 'waiting'. Este listener detecta isso e notifica o usuário/console.
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Há um novo SW instalado, aguardando para ativar.
              // Como usamos skipWaiting() no SW, ele se ativará sozinho.
              console.log('[PWA] ✅ Nova versão do app encontrada e cacheada. Será ativada na próxima inicialização.');
            }
          });
        });

        // ── Detecta quando um novo SW assumiu o controle ────────────────────
        // Isso acontece após o `clients.claim()` no activate do novo SW.
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          console.log('[PWA] 🔄 Novo Service Worker ativo. O app foi atualizado.');
          // Opcional: recarregar a página automaticamente para garantir
          // que o usuário veja a versão mais recente imediatamente.
          window.location.reload();
        });
      })
      .catch((error) => {
        console.error('[PWA] Falha ao registrar o Service Worker:', error);
      });
  });
})();
