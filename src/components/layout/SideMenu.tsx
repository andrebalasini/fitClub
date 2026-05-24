import { X, User, Settings, Trophy, LogOut, ChevronRight, MessageCircle, Info, CheckCircle2, Trash2, Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../../lib/auth';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalState = 'none' | 'profile';

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isInstallable, promptInstall } = usePWAInstall();
  
  const [modalState, setModalState] = useState<ModalState>('none');
  const [fitPoints, setFitPoints] = useState(0);
  
  const [profileData, setProfileData] = useState({
    nome: '',
    cidade: '',
    peso: ''
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    async function loadData() {
      const uid = getCurrentUserId();
      if (!uid) return;
      
      // Load fitPoints
      const { data: ptData } = await supabase.from('tbFitPoints').select('pontos').eq('user_id', uid);
      if (ptData) {
        setFitPoints(ptData.reduce((acc: number, curr: { pontos?: number }) => acc + (curr.pontos || 0), 0));
      }
      
      // Load Profile
      const { data: profData } = await supabase.from('profiles').select('nome, cidade, peso, avatar_url').eq('id', uid).maybeSingle();
      if (profData) {
        setProfileData({
          nome: profData.nome || '',
          cidade: profData.cidade || '',
          peso: profData.peso ? String(profData.peso) : ''
        });
        setAvatarUrl(profData.avatar_url || '');
      }
    }
    if (isOpen) loadData();
  }, [isOpen]);

  const displayUserName = profileData.nome || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Atleta';

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const uid = getCurrentUserId();
      if (!uid) throw new Error('Not logged in');
      
      let newAvatarUrl = avatarUrl;
      
      if (avatarFile) {
        // Excluir a foto antiga do bucket se ela existir
        if (avatarUrl) {
          const pathParts = avatarUrl.split('/avatars/');
          if (pathParts.length > 1) {
            const oldPath = pathParts[1];
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        }
        
        // Fazer o upload da nova foto
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${uid}-${Date.now()}.${fileExt}`;
        const filePath = `${uid}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
        if (uploadError) {
           console.error("Upload error:", uploadError);
           throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newAvatarUrl = publicUrlData.publicUrl;
      }
      
      // Atualizar o banco de dados e ignorar update auth para n corromper a sessão
      const { error: updateError } = await supabase.from('profiles').update({
        nome: profileData.nome,
        cidade: profileData.cidade,
        peso: profileData.peso ? Number(profileData.peso) : null,
        avatar_url: newAvatarUrl
      }).eq('id', uid);

      if (updateError) throw updateError;
      
      setAvatarUrl(newAvatarUrl);
      setAvatarFile(null);
      setModalState('none');
      // Forçar refresh para atualizar os dados visíveis no app inteiro
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar o perfil. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const uid = getCurrentUserId();
      if (!uid) throw new Error('Not logged in');
      
      // Attempt to delete user data across tables to clear related records
      const tablesToDelete = [
        'tbFitPoints',
        'tbHistorico',
        'tbTreinosCompletos',
        'tbTreinos',
        'tbFichas',
        'tbProgressoDesafios',
        'tbFeedback'
      ];

      for (const table of tablesToDelete) {
        await supabase.from(table).delete().eq('user_id', uid);
      }

      // Delete the profile explicitly to ensure it is removed from ranking immediately
      await supabase.from('profiles').delete().eq('id', uid);

      // If there's an avatar, attempt to remove it from storage
      if (avatarUrl) {
        const pathParts = avatarUrl.split('/avatars/');
        if (pathParts.length > 1) {
          const oldPath = pathParts[1];
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Call the edge function to hard-delete the user from auth.users
      const { error: invokeError } = await supabase.functions.invoke('delete-account');
      if (invokeError) {
        console.error("Erro ao chamar edge function delete-account. O usuário foi deletado do banco de dados, mas pode ainda existir no Auth:", invokeError);
      }

      onClose();
      await signOut();
      navigate('/login', { replace: true });
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Erro ao solicitar exclusão da conta. Tente novamente.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleNavigation = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = async () => {
    onClose();
    await signOut();
    navigate('/login', { replace: true });
  };

  const MenuItem = ({ icon: Icon, label, onClick }: { icon: React.ElementType, label: string, onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full p-4 rounded-xl hover:bg-zinc-800/60 active:bg-zinc-800 active:scale-95 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
          <Icon className="w-4.5 h-4.5 text-slate-300" />
        </div>
        <span className="font-semibold text-slate-200">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Menu Panel */}
      <div
        className={cn(
          "fixed top-0 left-0 h-full w-[85%] max-w-[340px] bg-[#121212] z-[70] flex flex-col transform transition-transform duration-300 ease-in-out border-r border-zinc-800/80 shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header - User Profile Summary */}
        <div className="relative p-5 pt-6 flex flex-col bg-[#1E1E1E] shadow-sm">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/20 hover:bg-black/40 active:scale-95 transition-all text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Avatar and Name Row */}
          <div className="flex items-center gap-4 w-full pr-10">
            <div className="flex-shrink-0 w-[60px] h-[60px] rounded-[16px] overflow-hidden border-2 border-white/10 bg-[#1a2744] flex items-center justify-center">
              {(avatarFile || avatarUrl) ? (
                <img src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#4d9fff] font-bold text-[24px]">
                  {displayUserName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="flex flex-col min-w-0">
               <h2 className="text-[20px] font-bold text-white leading-tight truncate">{displayUserName}</h2>
            </div>
          </div>

          {/* FitPoints Row */}
          <div className="mt-4 w-full pb-2 flex flex-col items-center justify-center">
            <span className="text-[46px] leading-none font-black text-white tracking-tight drop-shadow-md">
              {fitPoints.toLocaleString('pt-BR')}
            </span>
            <span className="text-[17px] font-black tracking-tight mt-1 drop-shadow-sm">
              <span className="text-white">fit</span><span className="text-[#4d9fff]">Points</span>
            </span>
          </div>
        </div>

        {/* Categories Menu */}
        <div className="flex-1 overflow-y-auto px-4 py-4 hide-scrollbar flex flex-col gap-6">
          
          {/* Perfil */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black text-zinc-500 tracking-wider uppercase ml-2">Perfil</span>
            <div className="flex flex-col gap-1">
              <MenuItem icon={User} label="Meu Perfil" onClick={() => handleNavigation('/perfil')} />
              <MenuItem icon={Settings} label="Editar Perfil" onClick={() => setModalState('profile')} />
            </div>
          </div>

          {/* Aplicativo */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black text-zinc-500 tracking-wider uppercase ml-2">Aplicativo</span>
            <div className="flex flex-col gap-1">
              {isInstallable && (
                <MenuItem icon={Download} label="Download app" onClick={promptInstall} />
              )}
              <MenuItem icon={Settings} label="Configurações" onClick={() => handleNavigation('/settings')} />
            </div>
          </div>

          {/* Clube */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black text-zinc-500 tracking-wider uppercase ml-2">Clube Premium</span>
            <div className="flex flex-col gap-1">
              <MenuItem icon={Trophy} label="Ranking & Desafios" onClick={() => handleNavigation('/premium')} />
            </div>
          </div>

          {/* Suporte */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-black text-zinc-500 tracking-wider uppercase ml-2">Suporte</span>
            <div className="flex flex-col gap-1">
              <MenuItem icon={Info} label="Como Funciona" onClick={() => alert('Em desenvolvimento!')} />
              <MenuItem icon={MessageCircle} label="Fale Conosco" onClick={() => alert('Em desenvolvimento!')} />
            </div>
          </div>
          
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-zinc-800/80 bg-[#121212]">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 active:scale-95 transition-all text-red-500 font-bold group"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair do app</span>
          </button>
        </div>
      </div>

      {/* Sub Modals Overlay */}
      {modalState !== 'none' && (
        <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm border border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#222]">
              <h3 className="font-bold text-white">Editar Perfil</h3>
              <button onClick={() => setModalState('none')} className="p-2 rounded-full hover:bg-zinc-700 active:scale-95 text-zinc-400">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: Profile Edit */}
            {modalState === 'profile' && (
              <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">
                
                {/* Photo Upload */}
                <div className="flex flex-col items-center gap-3 mb-2">
                  <div className="relative w-24 h-24 rounded-full border-2 border-zinc-700 bg-zinc-800 overflow-hidden flex items-center justify-center">
                      {(avatarFile || avatarUrl) ? (
                        <img src={avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-zinc-500 w-10 h-10" />
                      )}
                  </div>
                  <label className="text-sm text-blue-400 font-bold cursor-pointer hover:underline">
                    Alterar Foto
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                            setAvatarFile(e.target.files[0]);
                        }
                    }} />
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Nome de Exibição</label>
                  <input type="text" value={profileData.nome} onChange={e => setProfileData({...profileData, nome: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Cidade</label>
                  <input type="text" value={profileData.cidade} onChange={e => setProfileData({...profileData, cidade: e.target.value})} placeholder="Ex: Mogi Mirim" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Peso Atual (kg)</label>
                  <input type="number" step="0.1" value={profileData.peso} onChange={e => setProfileData({...profileData, peso: e.target.value})} placeholder="Ex: 75.5" className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                </div>
                
                <button 
                   onClick={handleSaveProfile}
                   disabled={isSaving}
                   className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all text-white font-bold py-3.5 rounded-xl mt-2 flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Salvando...' : <><CheckCircle2 size={18} /> Salvar Alterações</>}
                </button>

                <div className="border-t border-zinc-800 my-2 pt-4">
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    type="button"
                    className="w-full bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all text-red-500 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} /> Solicitar Exclusão da Conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {isDeleteModalOpen && (
        <ConfirmDeleteModal
          title="Excluir Conta e Dados?"
          description="Sua conta e todos os seus dados associados (histórico, pontos, perfil) serão anonimizados e removidos imediatamente."
          onConfirm={handleDeleteAccount}
          onCancel={() => setIsDeleteModalOpen(false)}
          isDeleting={isDeletingAccount}
          confirmText="Bloquear e Excluir"
          actionLoadingText="Excluindo Dados..."
        />
      )}
    </>
  );
}
