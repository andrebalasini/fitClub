import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useActiveWorkout } from '../../contexts/WorkoutContext';

interface BottomNavProps {
    onNavClick?: (path: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function BottomNav({ onNavClick }: BottomNavProps = {}) {
    const { workoutConfig } = useActiveWorkout();

    const navItems = [
        { 
            label: 'Início', 
            path: '/', 
            icon: (props: React.SVGProps<SVGSVGElement>) => (
                <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
            ) 
        },
        { 
            label: 'Loja', 
            path: '/loja', 
            icon: (props: React.SVGProps<SVGSVGElement>) => (
                <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
                    <path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z" />
                </svg>
            ) 
        },
        { 
            label: 'Treinos', 
            path: workoutConfig ? '/treino/executar' : '/treino', 
            icon: (props: React.SVGProps<SVGSVGElement>) => (
                <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
                    <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
                </svg>
            ) 
        },
        { 
            label: 'Dieta', 
            path: '/dieta', 
            icon: (props: React.SVGProps<SVGSVGElement>) => (
                <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
                    <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                </svg>
            ) 
        },
        { 
            label: 'Temporada', 
            path: '/premium', 
            isPremium: true,
            icon: (props: React.SVGProps<SVGSVGElement>) => (
                <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.993 5.99 0 0 0 11 14.9V19H7v2h10v-2h-4v-4.1a5.993 5.99 0 0 0 3.61-3.96C19.08 10.63 21 8.55 21 6V5c0-1.1-.9-2-2-2zm-12 6c-1.1 0-2-.9-2-2V5h2v4zm10 0V5h2v2c0 1.1-.9 2-2 2z" />
                </svg>
            ) 
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-[1024px] mx-auto bg-[#0D1117] rounded-t-[20px] z-50 pb-safe shadow-lg">
            <div className="flex justify-around items-center h-[76px] px-1 pb-1 pt-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            viewTransition
                            onClick={(e) => {
                                if (onNavClick) {
                                    onNavClick(item.path, e);
                                }
                            }}
                            className="flex flex-col items-center justify-center w-full h-full gap-0.5 transition-all active:scale-95 relative"
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon
                                        className={cn(
                                            "w-7 h-7 transition-transform", 
                                            isActive && "scale-105",
                                            item.isPremium 
                                                ? "text-[#e2c172]" 
                                                : isActive 
                                                    ? "text-[#1d70f5]" 
                                                    : "text-[#8e95a3]"
                                        )}
                                    />
                                    <span className={cn(
                                        "text-[12px] tracking-wide",
                                        item.isPremium 
                                            ? "text-[#e2c172] font-bold" 
                                            : isActive 
                                                ? "text-white font-bold" 
                                                : "text-[#8e95a3] font-semibold"
                                    )}>
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
