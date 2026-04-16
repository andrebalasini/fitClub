import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toast';

const LOGO_URL = 'https://fafisurbnecapdpguudb.supabase.co/storage/v1/object/public/assets/geral/logo_fitclub_500kb%20(1).png';

export function AuthLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    const { default: { auth } } = await import('../lib/supabase').then(m => ({ default: m.supabase }));
    const { error } = await auth.resetPasswordForEmail(email.trim());
    if (error) {
      showToast('Erro ao enviar e-mail de recuperação.', 'error');
    } else {
      showToast('E-mail de recuperação enviado! Verifique sua caixa de entrada.', 'success');
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
      </div>

      {/* Sign Up Link */}
      <p className="text-zinc-500 text-sm mt-8">
        Ainda não sou membro?{' '}
        <Link to="/auth/cadastro" className="text-[#1D63FF] font-semibold hover:underline transition-all">Cadastre-se</Link>
      </p>

      {/* Footer */}
      <p className="text-zinc-700 text-[11px] mt-6 text-center leading-relaxed">
        Ao continuar, você concorda com nossa <Link to="/privacidade" className="text-[#1D63FF] font-semibold hover:underline transition-all">Política de Privacidade</Link><br />fitClub - O clube de vantagens da sua vida fitness
      </p>
    </div>
  );
}
