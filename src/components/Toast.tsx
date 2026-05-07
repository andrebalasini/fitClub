import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastData {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
let addToastGlobal: ((message: string, type: ToastType) => void) | null = null;

/** Call from anywhere to show a toast */
// eslint-disable-next-line react-refresh/only-export-components
export function showToast(message: string, type: ToastType = 'info') {
  addToastGlobal?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-dismiss after 4s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => { addToastGlobal = null; };
  }, [addToast]);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />;
      case 'error':   return <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />;
      case 'info':    return <Info size={18} className="text-blue-400 flex-shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'border-emerald-500/30';
      case 'error':   return 'border-red-500/30';
      case 'info':    return 'border-blue-500/30';
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-[420px] px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 bg-zinc-900/95 backdrop-blur-xl border ${getBorderColor(toast.type)} rounded-2xl px-4 py-3.5 shadow-2xl shadow-black/50 animate-[slideDown_300ms_ease-out]`}
        >
          {getIcon(toast.type)}
          <p className="text-sm text-white font-medium leading-snug flex-1 pt-[1px] notranslate">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 active:scale-95"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
