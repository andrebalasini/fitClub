import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import html2canvas from 'html2canvas';
import { RefreshCw, Download, Info, Loader2 } from 'lucide-react';
import { showToast } from './Toast';

interface FitCheckCameraProps {
    fitPoints: number;
    onClose: () => void;
    onShare: (platform: 'instagram' | 'facebook' | 'both', imageUrl: string) => void;
}

export function FitCheckCamera({ fitPoints, onClose, onShare }: FitCheckCameraProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const webcamRef = useRef<Webcam>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const capture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setImageSrc(imageSrc);
        }
    }, [webcamRef]);

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const processPicture = async () => {
        if (!containerRef.current || !imageSrc) return null;
        
        setIsProcessing(true);
        try {
            // Wait for images to load
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const canvas = await html2canvas(containerRef.current, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                scale: 2 // Better quality
            });
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            return dataUrl;
        } catch (error) {
            console.error('Error generating image:', error);
            showToast('Erro ao processar imagem', 'error');
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    const handleShare = async (platform: 'instagram' | 'facebook' | 'both') => {
        const finalImage = await processPicture();
        if (finalImage) {
            onShare(platform, finalImage);
        }
    };

    const handleDownload = async () => {
        const finalImage = await processPicture();
        if (finalImage) {
            const link = document.createElement('a');
            link.href = finalImage;
            link.download = `fitClub-fitCheck-${new Date().getTime()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Imagem salva!', 'success');
        }
    };

    const retake = () => {
        setImageSrc(null);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col pt-safe-top pb-safe-bottom">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <button 
                    onClick={onClose}
                    className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
                >
                    <span className="font-bold">Cancelar</span>
                </button>
                
                {!imageSrc && (
                    <button 
                        onClick={toggleCamera}
                        className="text-white hover:bg-white/20 p-2 rounded-full transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={20} />
                        <span className="text-sm font-medium">Virar Câmera</span>
                    </button>
                )}
            </div>

            {/* Camera / Preview Area */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#121212]">
                {/* We wrap the preview in a container to render it with html2canvas */}
                <div 
                    ref={containerRef} 
                    className="relative w-full h-full max-w-md mx-auto aspect-[9/16] bg-black overflow-hidden flex items-center justify-center"
                >
                    {!imageSrc ? (
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{
                                facingMode: facingMode,
                                aspectRatio: 9/16, // Use aspect ratio that works well for stories
                            }}
                            className="w-full h-full object-cover"
                            mirrored={facingMode === 'user'}
                        />
                    ) : (
                        <img 
                            src={imageSrc} 
                            alt="FitCheck" 
                            className="w-full h-full object-cover" 
                        />
                    )}

                    {/* Overlay Elements (visible always in preview, or when picture taken) */}
                    {(imageSrc || !imageSrc) && (
                        <>
                            {/* Watermark / Logo */}
                            <div className="absolute top-6 left-6 z-10 flex items-center gap-2 opacity-90 drop-shadow-md">
                                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg">
                                    <span className="text-white font-black text-xl italic leading-none pt-1">fC</span>
                                </div>
                                <span className="text-white font-bold text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">fitClub</span>
                            </div>

                            {/* FitPoints Badge */}
                            <div className="absolute bottom-10 inset-x-0 mx-auto w-max z-10 flex flex-col items-center">
                                <div className="bg-black/60 backdrop-blur-md border border-yellow-500/30 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex flex-col items-center justify-center border border-yellow-400">
                                        <span className="text-yellow-400 font-black leading-none drop-shadow-md pb-0.5">F</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-black text-2xl leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">+{fitPoints}</span>
                                        <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">FitPoints</span>
                                    </div>
                                </div>
                                <div className="mt-2 text-white/90 text-sm font-bold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm drop-shadow-md">
                                    Treino Concluído ✅
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-black pt-6 pb-12 px-6">
                {!imageSrc ? (
                    <div className="flex justify-center">
                        <button 
                            onClick={capture}
                            className="w-20 h-20 rounded-full border-4 border-white/80 p-1 active:scale-95 transition-all"
                        >
                            <div className="w-full h-full rounded-full bg-white transition-all hover:bg-slate-200"></div>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                            <span className="text-white text-center font-bold mb-2">Compartilhe sua conquista!</span>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => handleShare('instagram')}
                                    disabled={isProcessing}
                                    className="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 py-3 rounded-xl text-white font-bold text-sm tracking-wide disabled:opacity-50 transition-all active:scale-95 shadow-lg flex justify-center items-center gap-2"
                                >
                                    {isProcessing && <Loader2 size={16} className="animate-spin" />}
                                    Instagram
                                </button>
                                <button 
                                    onClick={() => handleShare('facebook')}
                                    disabled={isProcessing}
                                    className="bg-[#1877F2] py-3 rounded-xl text-white font-bold text-sm tracking-wide disabled:opacity-50 transition-all active:scale-95 shadow-lg flex justify-center items-center gap-2"
                                >
                                    {isProcessing && <Loader2 size={16} className="animate-spin" />}
                                    Facebook
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <button 
                                    onClick={retake}
                                    className="bg-slate-800 py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={16} />
                                    Tirar Outra
                                </button>
                                <button 
                                    onClick={handleDownload}
                                    disabled={isProcessing}
                                    className="bg-slate-800 py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    Salvar Imagem
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 flex items-start gap-2 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                            <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-blue-300 text-xs leading-relaxed">
                                Você será redirecionado para compartilhar o link.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
