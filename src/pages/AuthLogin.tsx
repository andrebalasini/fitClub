import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Mail, Lock, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { showToast } from '../components/Toast';
import { supabase } from '../lib/supabase';

const LOGO_URL = 'https://fafisurbnecapdpguudb.supabase.co/storage/v1/object/public/assets/geral/logo_fitclub_500kb%20(1).png';

export function AuthLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { isInstallable, promptInstall } = usePWAInstall();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      showToast('Preencha todos os campos.', 'error');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email.trim(), password);
    setIsLoading(false);

    if (error) {
      showToast(error, 'error');
      return;
    }

    showToast('Bem-vindo de volta! 💪', 'success');
    navigate('/', { replace: true });
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showToast('Preencha o campo de e-mail primeiro.', 'info');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      showToast('Erro ao enviar e-mail de recuperação.', 'error');
    } else {
      showToast('E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'success');
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://appfitclub.com.br/',
        },
      });

      if (error) throw error;
      
      showToast('Redirecionando para o Google...', 'success');
      // Note: No need to reset loading state on success because the page will redirect
    } catch (error) {
      console.error('Google login error:', error);
      setIsGoogleLoading(false);
      showToast('Ops! Ocorreu um problema ao conectar com o Google. Tente novamente!', 'error');
    }
  };



  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 font-sans" style={{ background: '#121212' }}>
      {/* Logo */}
      <div className="mb-10 flex flex-col items-center">
        <img src={LOGO_URL} alt="fitClub Logo" className="h-14 w-auto object-contain mb-3" />
        <p className="text-zinc-500 text-sm font-medium tracking-wide">Entre na sua conta</p>
      </div>

      {/* Glass Container */}
      <div className="w-full max-w-[420px] bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/40">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-zinc-400 text-sm font-medium ml-1">E-mail</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full bg-[#1E1E1E] text-white rounded-xl pl-12 pr-4 py-3.5 outline-none border border-zinc-800 focus:border-[#1D63FF] focus:shadow-[0_0_0_3px_rgba(29,99,255,0.15)] transition-all placeholder:text-zinc-600 text-[15px]"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-zinc-400 text-sm font-medium ml-1">Senha</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-[#1E1E1E] text-white rounded-xl pl-12 pr-12 py-3.5 outline-none border border-zinc-800 focus:border-[#1D63FF] focus:shadow-[0_0_0_3px_rgba(29,99,255,0.15)] transition-all placeholder:text-zinc-600 text-[15px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-[#1D63FF] text-sm font-medium hover:underline transition-all"
            >
              Esqueci minha senha
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl bg-[#1D63FF] text-white font-bold text-[15px] tracking-wide flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:bg-[#1854db] hover:shadow-[0_0_30px_rgba(29,99,255,0.3)] focus:shadow-[0_0_30px_rgba(29,99,255,0.4)] active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Entrando...
              </>
            ) : (
              'ENTRAR NO CLUBE'
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="text-zinc-500 text-[13px] mt-6 text-center">
          Ainda não é membro?{' '}
          <Link to="/auth/cadastro" className="text-[#1D63FF] font-semibold hover:underline transition-all">Cadastre-se</Link>
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-zinc-800"></div>
          <span className="text-zinc-500 text-[13px] font-medium uppercase tracking-wider">ou</span>
          <div className="flex-1 h-px bg-zinc-800"></div>
        </div>

        {/* Social Login Button Container */}
        <div className="w-full">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-3.5 rounded-xl text-zinc-900 font-bold text-[14px] tracking-wide flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 border border-zinc-200 bg-white hover:bg-zinc-50 relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <Loader2 size={18} className="animate-spin text-zinc-500" />
            ) : (
              <svg className="w-[18px] h-[18px] relative z-10" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span className="relative z-10 text-zinc-900 transition-colors uppercase tracking-wide">
              {isGoogleLoading ? 'CONECTANDO...' : 'ENTRAR COM GOOGLE'}
            </span>
          </button>

          {/* PWA Install Button */}
          {isInstallable && (
            <button
              type="button"
              onClick={promptInstall}
              className="galactic-badge w-full mt-3 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer hover:brightness-110"
            >
              <Download size={18} className="text-white font-bold" />
              <span className="text-white font-bold text-[14px] tracking-wide">OBTER O APLICATIVO</span>
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-zinc-700 text-[11px] mt-6 text-center leading-relaxed">
        Ao continuar, você concorda com nossa <Link to="/privacidade" className="text-[#1D63FF] font-semibold hover:underline transition-all">Política de Privacidade</Link><br />fitClub - O clube de vantagens da sua vida fitness
      </p>
    </div>
  );
}
