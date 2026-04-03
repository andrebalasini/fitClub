import { Zap, Flame, Gift, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Login() {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-screen flex flex-col bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
            {/* Background Image with Top-to-Bottom Fade */}
            <div
                className="absolute inset-0 z-0 h-[60vh] bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: 'url("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop")',
                    backgroundPosition: 'center top'
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]"></div>
            </div>

            <div className="relative z-10 flex flex-col flex-1 px-6 pt-32 pb-8">

                {/* Logo Section */}
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-14 h-14 bg-vibrant-blue rounded-2xl flex items-center justify-center glow-blue shrink-0">
                        <span className="text-white font-bold text-3xl">?</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold tracking-tight text-white leading-none">fitClub</h1>
                        <span className="text-[10px] font-bold text-vibrant-blue tracking-widest mt-0.5">ECOSSISTEMA MOGI</span>
                    </div>
                </div>

                {/* Hero Text */}
                <div className="mb-6 space-y-3">
                    <h2 className="text-4xl font-bold text-white leading-[1.15] tracking-tight">
                        Transforme suor em recompensas
                    </h2>
                    <p className="text-sm text-zinc-400 leading-relaxed pr-4">
                        O hub fitness gamificado de Mogi Mirim e Mogi Guaçu. Treine, ganhe <span className="text-white">fit</span><span className="text-[#4d9fff]">Points</span> e resgate em parceiros locais.
                    </p>
                </div>

                {/* Horizontal Scroll Tags */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide -mx-6 px-6">
                    <div className="flex items-center gap-1.5 bg-[#0a1930] border border-[#1e3a8a] rounded-full px-3 py-1.5 whitespace-nowrap">
                        <Zap size={12} className="text-blue-500 fill-blue-500" />
                        <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wide">Multiplicador 3x</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#0a1930] border border-[#1e3a8a] rounded-full px-3 py-1.5 whitespace-nowrap">
                        <Flame size={12} className="text-blue-500 fill-blue-500" />
                        <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wide">Ofensiva Diária</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#0a1930] border border-[#1e3a8a] rounded-full px-3 py-1.5 whitespace-nowrap">
                        <Gift size={12} className="text-blue-500 fill-blue-500" />
                        <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wide">Cashback</span>
                    </div>
                </div>

                <div className="mt-auto space-y-4">
                    <button 
                        onClick={() => navigate('/auth/cadastro')}
                        className="w-full bg-vibrant-blue text-white font-semibold py-4 rounded-full flex items-center justify-center gap-2 glow-blue text-lg transition-all active:scale-95"
                    >
                        Começar Agora
                        <ArrowRight size={20} />
                    </button>
                    <button 
                        onClick={() => navigate('/auth/login')}
                        className="w-full bg-[#121214] border border-[#27272a] text-zinc-300 font-semibold py-4 rounded-full transition-all hover:bg-[#18181b] active:scale-95"
                    >
                        Já sou membro
                    </button>

                    <div className="text-center pt-6">
                        <p className="text-[10px] text-zinc-600 leading-relaxed px-4">
                            Ao continuar, você concorda com nossos Termos de Serviço<br />fitClub - O clube de vantagens da sua vida fitness
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
