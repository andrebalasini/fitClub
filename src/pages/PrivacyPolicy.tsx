import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 px-6 py-12 font-sans flex flex-col">
      <div className="max-w-2xl mx-auto w-full">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all active:scale-95 mb-8"
        >
          <ChevronLeft size={20} />
          Voltar para o login
        </button>

        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck size={32} className="text-[#1D63FF]" />
          <h1 className="text-3xl font-bold text-white">Política de Privacidade</h1>
        </div>

        <div className="space-y-6 text-zinc-400 leading-relaxed bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl">
          <p>
            No <strong className="text-zinc-200">fitClub</strong>, levamos a sua privacidade a sério. Queremos ser totalmente transparentes sobre como guardamos e utilizamos as suas informações.
          </p>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-zinc-200">1. Coleta de Dados</h2>
            <p>
              Coletamos nome e e-mail via login social apenas para identificação no app. Esses dados são essenciais para criar e gerenciar a sua conta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-zinc-200">2. Uso e Compartilhamento</h2>
            <p>
              Não compartilhamos seus dados com terceiros. As informações coletadas são para uso exclusivo dentro do ecossistema do fitClub.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-zinc-200">3. Seus Direitos</h2>
            <p>
              O usuário pode solicitar a exclusão dos dados a qualquer momento via suporte. Assim que solicitado, todas as suas informações pessoais serão removidas permanentemente de nosso banco de dados.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
