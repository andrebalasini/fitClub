import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DataDeletion() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 px-6 py-12 font-sans flex flex-col">
      <div className="max-w-2xl mx-auto w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all active:scale-95 mb-8"
        >
          <ChevronLeft size={20} />
          Voltar para Home
        </button>

        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle size={32} className="text-red-500" />
          <h1 className="text-3xl font-bold text-white">Exclusão de Dados</h1>
        </div>

        <div className="space-y-6 text-zinc-400 leading-relaxed bg-[#121214] border border-[#27272a] rounded-2xl p-6 shadow-xl">
          <p>
            No <strong className="text-zinc-200">fitClub</strong>, respeitamos o seu direito à privacidade e ao controle de seus dados pessoais em conformidade com as diretrizes das plataformas de login social (como a Meta).
          </p>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-zinc-200">Como excluir sua conta e dados</h2>
            <p>
              Você pode excluir a sua conta e todos os dados associados diretamente no aplicativo, acessando as configurações do seu perfil:
            </p>
            <ol className="list-decimal pl-5 space-y-2 text-sm mt-2">
              <li>Faça login na sua conta do fitClub.</li>
              <li>Abra o <strong>Menu Lateral</strong> no canto superior esquerdo.</li>
              <li>Vá em <strong>Editar Perfil</strong>.</li>
              <li>Role até o final da tela e clique no botão <strong className="text-red-400">Solicitar Exclusão da Conta</strong>.</li>
              <li>Confirme a exclusão do perfil.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-zinc-200">Qual é o prazo para a exclusão?</h2>
            <p>
              A exclusão e anonimização de seus dados (métricas, histórico de treinos e identificação do perfil) ocorre <strong>imediatamente</strong> assim que você confirma a solicitação pelo aplicativo. Nenhuma informação pessoal sua será retida em nossos servidores.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
