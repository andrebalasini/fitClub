import { Menu, ArrowLeft, Square } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopBarProps {
    onMenuClick?: () => void;
    showBackButton?: boolean;
    onBackClick?: () => void;
    backIconType?: 'arrow' | 'stop';
    timerLabel?: string;
}

export function TopBar({ 
    onMenuClick, 
    showBackButton, 
    onBackClick, 
    backIconType = 'arrow',
    timerLabel
}: TopBarProps) {
    return (
        <header 
            className="sticky top-0 z-50 h-[72px] flex items-center justify-between px-5 pt-3 pb-1 shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
            style={{ background: 'linear-gradient(180deg, #0D1117 0%, #0E121A 75%, #0f141e 100%)' }}
        >
            {/* Left: Menu Hamburger or Back Button */}
            <div className="flex items-center gap-3">
                {showBackButton ? (
                    <button 
                        onClick={onBackClick}
                        className={`rounded-full active:scale-95 transition-all outline-none flex items-center ${timerLabel ? 'pr-5 gap-0.5' : ''} ${backIconType === 'stop' ? 'bg-[#1a2235] shadow-lg shadow-black/40' : 'bg-transparent'}`}
                        aria-label={backIconType === 'stop' ? "Parar" : "Voltar"}
                    >
                        <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center">
                            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${backIconType === 'stop' ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`}>
                                <ArrowLeft className="w-[30px] h-[30px] text-white" strokeWidth={2.5} />
                            </div>
                            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${backIconType === 'stop' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'}`}>
                                <Square size={18} fill="#ef4444" strokeWidth={0} className="text-red-500 rounded-sm" />
                            </div>
                        </div>
                        {timerLabel && (
                            <span className="text-[18px] font-black text-white tracking-tight tabular-nums ml-1 pr-1">
                                {timerLabel}
                            </span>
                        )}
                    </button>
                ) : (
                    <button 
                        onClick={onMenuClick}
                        className="p-1.5 -ml-1.5 rounded-full bg-transparent active:scale-95 transition-all outline-none"
                        aria-label="Menu"
                    >
                        <Menu className="w-[30px] h-[30px] text-white" strokeWidth={2.5} />
                    </button>
                )}
            </div>

            {/* Right: fitClub Logo */}
        <Link to="/" className="flex items-center active:scale-95 transition-all outline-none">
            <img
                src="https://fafisurbnecapdpguudb.supabase.co/storage/v1/object/public/assets/geral/logo_fitclub_500kb%20(1).png"
                alt="fitClub Logo"
                className="h-[34px] w-auto object-contain"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                style={{ imageRendering: '-webkit-optimize-contrast' as any }}
            />
        </Link>
        </header>
    );
}
