import type { ReactNode } from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { SideMenu } from './SideMenu';

export function MainLayout({ children }: { children: ReactNode }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const isHomePage = location.pathname === '/';

    return (
        <div className="min-h-screen bg-[#080b12]">
            <div className="flex flex-col min-h-screen bg-[#0f141e] text-slate-100 font-sans max-w-[1024px] mx-auto relative shadow-2xl shadow-black/50">
                <TopBar 
                    onMenuClick={() => setIsMenuOpen(true)} 
                    showBackButton={!isHomePage}
                    onBackClick={() => navigate(-1)}
                />
                
                <SideMenu 
                    isOpen={isMenuOpen} 
                    onClose={() => setIsMenuOpen(false)} 
                />

                <main className="flex-1 overflow-y-auto pb-24 relative">
                    {children}
                </main>
                <BottomNav />
            </div>
        </div>
    );
}
