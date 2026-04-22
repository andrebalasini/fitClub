import { Loader2, Trash2, type LucideIcon } from 'lucide-react';

interface ConfirmDeleteModalProps {
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting?: boolean;
    confirmText?: string;
    actionLoadingText?: string;
    icon?: LucideIcon;
    variant?: 'danger' | 'warning' | 'info' | 'success';
}

export function ConfirmDeleteModal({
    title,
    description,
    onConfirm,
    onCancel,
    isDeleting = false,
    confirmText = 'Excluir',
    actionLoadingText = 'Excluindo...',
    icon: Icon = Trash2,
    variant = 'danger'
}: ConfirmDeleteModalProps) {
    const variantStyles = {
        danger: {
            iconBg: 'bg-red-500/10 text-red-500',
            btnBg: 'bg-red-500 hover:bg-red-600 shadow-red-500/25'
        },
        warning: {
            iconBg: 'bg-orange-500/10 text-orange-500',
            btnBg: 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
        },
        info: {
            iconBg: 'bg-blue-500/10 text-blue-500',
            btnBg: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/25'
        },
        success: {
            iconBg: 'bg-emerald-500/10 text-emerald-500',
            btnBg: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
        }
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
                onClick={!isDeleting ? onCancel : undefined}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-[#1a1f2e] rounded-3xl p-6 animate-[slideUp_300ms_ease-out] shadow-2xl shadow-black/50 z-10 flex flex-col items-center text-center">
                
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${styles.iconBg}`}>
                    <Icon size={28} />
                </div>

                <h2 className="text-white font-bold text-xl leading-tight mb-2">
                    {title}
                </h2>
                
                <p className="text-[#8e95a3] text-[15px] font-medium leading-relaxed mb-6">
                    {description}
                </p>

                <div className="flex gap-3 w-full">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="flex-1 py-3.5 rounded-xl bg-slate-700/50 text-white font-bold text-base hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className={`flex-1 py-3.5 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg ${styles.btnBg}`}
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                {actionLoadingText}
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
