import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, ImagePlus, Loader2, AlertTriangle } from 'lucide-react';
import { showToast } from './Toast';
import { TopBar } from './layout/TopBar';
import { BottomNav } from './layout/BottomNav';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

type SignaturePosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface FitCheckCameraProps {
    fitPoints: number;
    workoutDivision: string;
    elapsedSeconds: number;
    totalVolumeKg: number;
    onClose: () => void;
    onShare: () => void;
    initialImageSrc?: string;
}

const FITCHECK_BONUS = 50;

const POSITION_OPTIONS: { id: SignaturePosition; label: string }[] = [
    { id: 'center',       label: 'Centro' },
    { id: 'top-left',     label: 'Superior Esq.' },
    { id: 'top-right',    label: 'Superior Dir.' },
    { id: 'bottom-left',  label: 'Inferior Esq.' },
    { id: 'bottom-right', label: 'Inferior Dir.' },
];

function formatElapsed(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}min`;
    return `${mins}min ${secs}s`;
}

function formatVolume(kg: number): string {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return `${kg.toLocaleString('pt-BR')}kg`;
}

/** Helper to load image for canvas with timeout */
function loadCanvasImage(url: string, timeoutMs = 3000): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();


        const handleLoad = () => {
            clearTimeout(timeoutId);
            resolve(img);
        };

        const handleError = (e: unknown) => {
            clearTimeout(timeoutId);
            reject(e);
        };

        img.crossOrigin = "anonymous";
        img.onload = handleLoad;
        img.onerror = handleError;

        const timeoutId = setTimeout(() => {
            img.onload = null;
            img.onerror = null;
            reject(new Error("Image load timeout"));
        }, timeoutMs);

        img.src = url;
    });
}

/** Draws the Strava-style signature card onto the canvas at the requested position */
async function drawSignatureOnCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    position: SignaturePosition,
    division: string,
    elapsedSeconds: number,
    volumeKg: number,
    totalFitPoints: number
): Promise<void> {
    const W = canvas.width;
    const H = canvas.height;

    // ── Signature card dimensions ──────────────────────────────────────────
    const PAD_CARD   = Math.round(W * 0.026);
    const CARD_W     = Math.round(W * 0.44);
    const rowH       = Math.round(W * 0.042);
    const valueFontSize = Math.round(W * 0.022);
    const bottomFontSize = Math.round(W * 0.016);
    const logoDrawH  = Math.round(W * 0.034);
    const bottomH    = Math.max(bottomFontSize, logoDrawH);
    const contentH   = (rowH * 2) + valueFontSize + Math.round(W * 0.012) + Math.round(W * 0.012) + bottomH;
    const CARD_H     = PAD_CARD + contentH + PAD_CARD;
    const CORNER_R   = Math.round(W * 0.028);
    const MARGIN     = Math.round(W * 0.032);

    // ── Position ───────────────────────────────────────────────────────────
    let cardX = 0;
    let cardY = 0;
    switch (position) {
        case 'center':
            cardX = (W - CARD_W) / 2;
            cardY = (H - CARD_H) / 2;
            break;
        case 'top-left':
            cardX = MARGIN;
            cardY = MARGIN;
            break;
        case 'top-right':
            cardX = W - CARD_W - MARGIN;
            cardY = MARGIN;
            break;
        case 'bottom-left':
            cardX = MARGIN;
            cardY = H - CARD_H - MARGIN;
            break;
        case 'bottom-right':
            cardX = W - CARD_W - MARGIN;
            cardY = H - CARD_H - MARGIN;
            break;
    }

    // ── Frosted dark card ──────────────────────────────────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cardX + CORNER_R, cardY);
    ctx.lineTo(cardX + CARD_W - CORNER_R, cardY);
    ctx.arcTo(cardX + CARD_W, cardY, cardX + CARD_W, cardY + CORNER_R, CORNER_R);
    ctx.lineTo(cardX + CARD_W, cardY + CARD_H - CORNER_R);
    ctx.arcTo(cardX + CARD_W, cardY + CARD_H, cardX + CARD_W - CORNER_R, cardY + CARD_H, CORNER_R);
    ctx.lineTo(cardX + CORNER_R, cardY + CARD_H);
    ctx.arcTo(cardX, cardY + CARD_H, cardX, cardY + CARD_H - CORNER_R, CORNER_R);
    ctx.lineTo(cardX, cardY + CORNER_R);
    ctx.arcTo(cardX, cardY, cardX + CORNER_R, cardY, CORNER_R);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 14, 26, 0.82)';
    ctx.fill();
    ctx.clip();

    // ── Three rows ─────────────────────────────────────────────────────────
    const statsData = [
        { label: '',               value: division || 'Treino' },
        { label: 'Tempo',          value: formatElapsed(elapsedSeconds) },
        { label: 'Volume',         value: formatVolume(volumeKg) },
    ];

    const STATS_TOP = cardY + PAD_CARD;
    const labelFontSize = Math.round(W * 0.022);

    statsData.forEach((stat, i) => {
        const y = STATS_TOP + i * rowH;
        
        // Label (Left aligned)
        ctx.font = `600 ${labelFontSize}px 'Inter', sans-serif`;
        ctx.fillStyle = 'rgba(148,163,184,0.9)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(stat.label, cardX + PAD_CARD, y);

        const labelWidth = ctx.measureText(stat.label).width;

        // Value (Right aligned)
        let dynValueFontSize = valueFontSize;
        ctx.font = `900 ${dynValueFontSize}px 'Inter', sans-serif`;
        
        const gap = Math.round(W * 0.02);
        const maxValW = i === 0 ? (CARD_W - (PAD_CARD * 2)) : (CARD_W - (PAD_CARD * 2) - labelWidth - gap);
        let valW = ctx.measureText(stat.value).width;
        
        if (i === 0) {
            // Dynamically scale font size up or down to exactly fill the available width
            if (valW < maxValW) {
                while (valW < maxValW && dynValueFontSize < 32) {
                    dynValueFontSize += 0.1;
                    ctx.font = `900 ${dynValueFontSize}px 'Inter', sans-serif`;
                    valW = ctx.measureText(stat.value).width;
                }
            } else {
                while (valW > maxValW && dynValueFontSize > 8) {
                    dynValueFontSize -= 0.1;
                    ctx.font = `900 ${dynValueFontSize}px 'Inter', sans-serif`;
                    valW = ctx.measureText(stat.value).width;
                }
            }
        } else {
            while (valW > maxValW && dynValueFontSize > 8) {
                dynValueFontSize -= 0.5;
                ctx.font = `900 ${dynValueFontSize}px 'Inter', sans-serif`;
                valW = ctx.measureText(stat.value).width;
            }
        }

        ctx.fillStyle = '#ffffff';
        const yOffset = (valueFontSize - dynValueFontSize) / 2;
        if (i === 0) {
            ctx.textAlign = 'left';
            ctx.fillText(stat.value, cardX + PAD_CARD, y + yOffset);
        } else {
            ctx.textAlign = 'right';
            ctx.fillText(stat.value, cardX + CARD_W - PAD_CARD, y + yOffset);
        }
        
        // Divider
        if (i < 2) {
            const divY = y + rowH - Math.round(rowH * 0.15);
            ctx.beginPath();
            ctx.moveTo(cardX + PAD_CARD, divY);
            ctx.lineTo(cardX + CARD_W - PAD_CARD, divY);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });

    // ── Separator line ─────────────────────────────────────────────────────
    const SEP_Y = STATS_TOP + rowH * 2 + valueFontSize + Math.round(W * 0.012);
    ctx.beginPath();
    ctx.moveTo(cardX + PAD_CARD, SEP_Y);
    ctx.lineTo(cardX + CARD_W - PAD_CARD, SEP_Y);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const BOTTOM_Y = SEP_Y + Math.round(W * 0.012);
    const bottomCY = BOTTOM_Y + bottomH / 2;

    ctx.font = `700 ${bottomFontSize}px 'Inter', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let currentX = cardX + PAD_CARD;

    // 1. +{totalFitPoints}
    const pointsText = `+${totalFitPoints} `;
    ctx.fillStyle = '#e2c172';
    ctx.fillText(pointsText, currentX, bottomCY);
    currentX += ctx.measureText(pointsText).width;

    // 2. fit
    const fitText = `fit`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fitText, currentX, bottomCY);
    currentX += ctx.measureText(fitText).width;

    // 3. Points
    const pointsWord = `Points`;
    ctx.fillStyle = '#4d9fff';
    ctx.fillText(pointsWord, currentX, bottomCY);
    currentX += ctx.measureText(pointsWord).width;

    // 4.  conquistados
    const suffixText = ` conquistados`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(suffixText, currentX, bottomCY);

    // FitClub Logo Image
    try {
        const logoImg = await loadCanvasImage('https://fafisurbnecapdpguudb.supabase.co/storage/v1/object/public/assets/geral/fitClub_mono2.png');
        const logoH = logoDrawH;
        const logoRatio = logoImg.width / logoImg.height;
        const logoW = logoH * logoRatio;
        const logoX = cardX + CARD_W - PAD_CARD - logoW;
        const logoY = bottomCY - logoH / 2;
        
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);
    } catch {
        // Fallback if logo fails
        ctx.font = `800 ${bottomFontSize}px 'Inter', sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('fitClub', cardX + CARD_W - PAD_CARD, bottomCY);
    }

    ctx.restore();
}

export function FitCheckCamera({
    fitPoints,
    workoutDivision,
    elapsedSeconds,
    totalVolumeKg,
    onClose,
    onShare,
    initialImageSrc,
}: FitCheckCameraProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(initialImageSrc || null);
    const [processedImage, setProcessedImage] = useState<string | null>(null);
    const [position, setPosition] = useState<SignaturePosition>('bottom-right');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showPointsAnimation, setShowPointsAnimation] = useState(false);
    const [targetNavPath, setTargetNavPath] = useState<string | null>(null);
    const navigate = useNavigate();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);

    const totalFitPoints = fitPoints + FITCHECK_BONUS;

    // Re-render the preview canvas whenever image or position changes
    const renderPreview = useCallback(async (imageSrc: string, pos: SignaturePosition) => {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.onload = async () => {
            try {
                const MAX_DIMENSION = 1920;
                let width = img.naturalWidth;
                let height = img.naturalHeight;

                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height = Math.round((height * MAX_DIMENSION) / width);
                        width = MAX_DIMENSION;
                    } else {
                        width = Math.round((width * MAX_DIMENSION) / height);
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width  = width;
                canvas.height = height;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, width, height);
                await drawSignatureOnCanvas(
                    canvas, ctx, pos,
                    workoutDivision, elapsedSeconds, totalVolumeKg, totalFitPoints
                );
                setProcessedImage(canvas.toDataURL('image/jpeg', 0.85));
            } catch (err) {
                console.error("FitCheck Camera Error:", err);
                // Fallback to original image if signature fails to render or export
                setProcessedImage(imageSrc);
            }
        };
        img.onerror = () => {
            console.error("Failed to load user image to canvas.");
            setProcessedImage(imageSrc); // Fallback so UI doesn't hang forever
        };
        img.src = imageSrc;
    }, [workoutDivision, elapsedSeconds, totalVolumeKg, totalFitPoints]);

    // Initial render if initialImageSrc is passed
    useEffect(() => {
        if (initialImageSrc) {
            renderPreview(initialImageSrc, 'bottom-right');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialImageSrc]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            setSelectedImage(src);
            setProcessedImage(null);
            renderPreview(src, position);
        };
        reader.readAsDataURL(file);
    };

    const handlePositionChange = (pos: SignaturePosition) => {
        setPosition(pos);
        if (selectedImage) renderPreview(selectedImage, pos);
    };

    const handleDownload = async () => {
        if (!processedImage) return;
        setIsProcessing(true);
        try {
            const link = document.createElement('a');
            link.href = processedImage;
            link.download = `fitClub-fitCheck-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setShowPointsAnimation(true);
            showToast('FitCheck concluído!', 'success');
            
            // Allow animation to play for 2.5 seconds before calling onShare to close
            setTimeout(() => {
                onShare();
            }, 2500);
        } catch (err) {
            console.error('Erro ao salvar imagem', err);
            setIsProcessing(false);
        }
    };


    const handleBack = () => {
        setShowExitConfirm(true);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#0a0e1a] flex flex-col">
            {/* Standard TopBar */}
            <div className="flex-none">
                <TopBar showBackButton onBackClick={handleBack} />
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Hidden canvas for rendering */}
            <canvas 
                ref={previewCanvasRef} 
                className="hidden" 
                style={{ WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility' }}
            />

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto w-full">
                <div className="min-h-full flex flex-col gap-5 px-5 pt-4 pb-[120px]">
                    {/* ── Image selected — show preview + position picker ── */}

                    {/* Preview */}
                    <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ maxHeight: '55vh' }}>
                        {processedImage ? (
                            <img
                                src={processedImage}
                                alt="FitCheck Preview"
                                className="w-full h-full object-contain"
                                style={{ 
                                    maxHeight: '55vh',
                                    WebkitFontSmoothing: 'antialiased',
                                    textRendering: 'optimizeLegibility',
                                    backfaceVisibility: 'hidden',
                                    transform: 'translateZ(0)'
                                }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 size={32} className="animate-spin text-blue-400" />
                            </div>
                        )}
                    </div>

                    {/* Position picker */}
                    <div>
                        <div className="grid grid-cols-5 gap-2">
                            {POSITION_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => handlePositionChange(opt.id)}
                                    className={`py-2 px-1 rounded-xl text-[11px] font-bold text-center transition-all active:scale-95 ${
                                        position === opt.id
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                            : 'bg-[#151c2c] text-slate-400 border border-white/5 hover:border-blue-500/40 hover:text-slate-200'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Change image */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 text-sm font-medium transition-all active:scale-95"
                    >
                        <ImagePlus size={16} />
                        Trocar imagem
                    </button>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3 mt-auto">
                        <button
                            onClick={handleDownload}
                            disabled={isProcessing || !processedImage}
                            className="w-full py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-500/30 disabled:opacity-50"
                        >
                            {isProcessing
                                ? <Loader2 size={20} className="animate-spin" />
                                : <Download size={20} />
                            }
                            Salvar imagem
                        </button>
                    </div>
                </div>
            </div>

            {/* Exit confirmation modal */}
            {showExitConfirm && (
                <ConfirmDeleteModal
                    title="Sair do FitCheck?"
                    description={
                        <span>
                            Seu FitCheck será perdido e você não ganhará os{' '}
                            <span className="font-bold"><span className="text-white">fit</span><span className="text-[#4d9fff]">Points</span></span>{' '}
                            extras. Deseja realmente sair?
                        </span>
                    }
                    onConfirm={() => {
                        setShowExitConfirm(false);
                        onClose();
                        if (targetNavPath) {
                            navigate(targetNavPath, { replace: true });
                        }
                    }}
                    onCancel={() => {
                        setShowExitConfirm(false);
                        setTargetNavPath(null);
                    }}
                    confirmText="Sim, sair"
                    icon={AlertTriangle}
                    variant="warning"
                />
            )}

            {/* Success Points Animation Overlay */}
            {showPointsAnimation && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_300ms_ease-out]" />
                    <div className="relative flex flex-col items-center justify-center animate-[slideUpFade_500ms_ease-out_forwards]">
                        <div className="text-5xl font-black text-[#e2c172] drop-shadow-[0_0_20px_rgba(226,193,114,0.5)] scale-150 animate-[pulse_1.5s_ease-in-out_infinite]">
                            +{FITCHECK_BONUS}
                        </div>
                        <div className="text-2xl font-bold mt-2">
                            <span className="text-white drop-shadow-md">fit</span><span className="text-[#4d9fff] drop-shadow-md">Points</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Fixed Bottom Navbar */}
            <BottomNav
                onNavClick={(path, e) => {
                    e.preventDefault();
                    setTargetNavPath(path);
                    setShowExitConfirm(true);
                }}
            />
        </div>
    );
}
