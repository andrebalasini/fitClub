import { Info, MessageSquare, CheckCircle, Send } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TestingNoticeProps {
    title: string;
}

export function TestingNotice({ title }: TestingNoticeProps) {
    const { user } = useAuth();
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!feedback.trim() || isSubmitting) return;
        setIsSubmitting(true);
        
        try {
            await supabase.from('tbFeedback').insert({
                user_id: user?.id,
                mensagem: feedback,
                pagina: title, // to know context
            });
            setIsSubmitted(true);
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
            <div className="w-24 h-24 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-6 animate-pulse shadow-[0_0_50px_rgba(29,112,245,0.15)] border border-blue-500/20">
                <Info size={48} className="text-[#1d70f5]" strokeWidth={1.5} />
            </div>
            
            <h1 className="text-white text-3xl font-black mb-4 tracking-tight">
                {title}
            </h1>
            
            <div className="space-y-4 max-w-sm mb-8">
                <p className="text-slate-400 text-lg font-medium leading-relaxed">
                    O <span className="text-white font-bold">fitClub</span> está em fase de testes para garantir a melhor experiência possível.
                </p>
                <div className="h-px w-12 bg-slate-800 mx-auto my-4" />
                <p className="text-slate-500 text-sm font-semibold leading-relaxed">
                    Em breve, você terá todas as funcionalidades do app disponíveis na palma da sua mão. 🚀
                </p>
            </div>

            {isSubmitted ? (
                <div className="w-full max-w-sm bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex flex-col items-center gap-3 animate-[fadeIn_300ms_ease-out]">
                    <CheckCircle className="text-green-500" size={32} />
                    <p className="text-green-400 font-bold text-lg">Obrigado pelo seu feedback!</p>
                    <p className="text-slate-400 text-sm font-medium">Sua sugestão foi enviada para nossa equipe de desenvolvimento.</p>
                </div>
            ) : (
                <div className="w-full max-w-sm flex flex-col gap-3">
                    <div className="relative">
                        <MessageSquare className="absolute top-3.5 left-4 text-slate-500" size={20} />
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Deixe sua sugestão ou opinião sobre o app..."
                            className="w-full bg-[#0a0d14] border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none min-h-[120px] placeholder:text-slate-600"
                        />
                    </div>
                    
                    <button 
                        onClick={handleSubmit}
                        disabled={!feedback.trim() || isSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-[#1d70f5] text-white font-bold rounded-2xl shadow-[0_8px_25px_rgba(29,112,245,0.3)] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 hover:bg-blue-600"
                    >
                        {isSubmitting ? (
                            <span className="animate-pulse">Enviando...</span>
                        ) : (
                            <>
                                <span>Enviar Sugestão</span>
                                <Send size={18} />
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
