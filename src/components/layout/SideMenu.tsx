import { X, UserRound, Shield, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email || '';

  const handleNavigation = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = async () => {
    onClose();
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Menu Panel */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-[80%] max-w-[320px] bg-zinc-900 z-[70] flex flex-col transform transition-transform duration-300 ease-in-out border-r border-zinc-800",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header - User Profile */}
        <div className="p-6 border-b border-zinc-800 flex flex-col items-start gap-4 bg-zinc-800/20">
          <div className="flex justify-between items-start w-full">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-800 flex items-center justify-center">
              <span className="text-2xl font-bold text-slate-300">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-zinc-800 active:scale-95 transition-all text-slate-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Olá, {userName}!</h2>
            <p className="text-sm text-slate-400 font-medium">{userEmail}</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col py-4 flex-1 overflow-y-auto">
          <button
            onClick={() => handleNavigation('/profile')}
            className="flex items-center justify-between w-full px-6 py-4 hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <UserRound className="w-4 h-4 text-slate-300" />
              </div>
              <span className="font-semibold text-slate-200">Minha Conta</span>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>

          <button
            onClick={() => handleNavigation('/settings')}
            className="flex items-center justify-between w-full px-6 py-4 hover:bg-zinc-800/50 active:bg-zinc-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                <Shield className="w-4 h-4 text-slate-300" />
              </div>
              <span className="font-semibold text-slate-200">Dados Cadastrais</span>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-zinc-800 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/10 active:bg-red-500/20 active:scale-[0.98] transition-all text-red-500 font-semibold group"
          >
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
              <LogOut className="w-4 h-4" />
            </div>
            <span>Sair do app</span>
          </button>
        </div>
      </div>
    </>
  );
}
