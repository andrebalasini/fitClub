import { Menu, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopBarProps {
    onMenuClick?: () => void;
    showBackButton?: boolean;
    onBackClick?: () => void;
}

export function TopBar({ onMenuClick, showBackButton, onBackClick }: TopBarProps) {
    return (
        <header className="sticky top-0 z-50 bg-gradient-to-b from-[#161d2d] to-[#0f141e] h-[72px] flex items-center justify-between px-5 pt-3 pb-1 shadow-sm">
            {/* Left: Menu Hamburger or Back Button */}
            <div className="flex items-center">
                {showBackButton ? (
                    <button 
                        onClick={onBackClick}
                        className="p-1.5 -ml-1.5 rounded-full bg-transparent active:scale-95 transition-all outline-none"
                        aria-label="Voltar"
                    >
                        <ArrowLeft className="w-[30px] h-[30px] text-white" strokeWidth={2.5} />
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
            <Link to="/" className="flex items-center active:scale-95 transition-all">
                <img
                    src="https://fafisurbnecapdpguudb.supabase.co/storage/v1/object/public/assets/geral/logo_fitclub_500kb%20(1).png"
                    alt="fitClub Logo"
                    className="h-[34px] w-auto object-contain"
                />
            </Link>
        </header>
    );
}
