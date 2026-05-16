import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export function VersionChecker() {
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION;

        const checkForUpdates = async () => {
            try {
                // Adiciona um timestamp para forçar bypass de cache no navegador e na CDN
                const response = await fetch(`/version.json?t=${Date.now()}`, {
                    cache: 'no-store'
                });
                
                if (!response.ok) return;

                const data = await response.json();
                const latestVersion = data.version;

                // Se a versão atual (injetada no build) for diferente da versão do servidor, exibe banner
                if (CURRENT_VERSION && latestVersion && CURRENT_VERSION !== latestVersion) {
                    setUpdateAvailable(true);
                }
            } catch (error) {
                console.error('Falha ao verificar atualizações de versão:', error);
            }
        };

        // Verifica 5 segundos após a carga inicial (para não bloquear o first paint)
        const initialTimer = setTimeout(checkForUpdates, 5000);

        // Verifica a cada 24 horas (24 * 60 * 60 * 1000 = 86400000 ms)
        const interval = setInterval(checkForUpdates, 86400000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, []);

    const handleUpdate = () => {
        // Limpa o cache se possível e faz reload da página
        if ('caches' in window) {
            caches.keys().then((names) => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
        
        // Em navegadores modernos location.reload() é suficiente se o .htaccess estiver configurado para não cachear o index.html
        window.location.reload();
    };

    if (!updateAvailable) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-600 text-white px-4 py-3 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-[slideDown_300ms_ease-out]">
            <div className="flex items-center gap-2 text-sm font-medium">
                <RefreshCw size={18} className="animate-spin-slow" />
                <span>Uma nova atualização do FitClub está disponível!</span>
            </div>
            <button
                onClick={handleUpdate}
                className="whitespace-nowrap px-4 py-2 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
            >
                Atualizar Agora
            </button>
        </div>
    );
}
