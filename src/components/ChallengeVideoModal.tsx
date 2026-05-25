import { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  Video,
  StopCircle,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FlipHorizontal,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from './Toast';
import type { FeedChallenge } from '../hooks/useFeedChallenges';

interface ChallengeVideoModalProps {
  challenge: FeedChallenge;
  myName: string;
  onClose: () => void;
  onPublished: () => void;
}

type RecordingPhase = 'preview' | 'recording' | 'review' | 'confirming' | 'uploading';

const MAX_RECORDING_SECONDS = 60;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ChallengeVideoModal({
  challenge,
  myName,
  onClose,
  onPublished,
}: ChallengeVideoModalProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<RecordingPhase>('preview');
  const [elapsed, setElapsed] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start camera stream
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch (err) {
      console.error('[ChallengeVideoModal] Camera error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setCameraError('Permissão de câmera negada. Por favor, permita o acesso nas configurações do seu navegador.');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setCameraError('Nenhuma câmera encontrada neste dispositivo.');
      } else {
        setCameraError('Não foi possível acessar a câmera. Verifique as permissões e tente novamente.');
      }
    }
  }, []);

  // Mount: start camera
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      // Cleanup on unmount
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flip camera
  const handleFlip = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Start recording
  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : 'video/mp4';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setPhase('review');
    };

    recorder.start(200); // collect chunks every 200ms
    recorderRef.current = recorder;
    setElapsed(0);
    setPhase('recording');

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= MAX_RECORDING_SECONDS) {
          stopRecording();
          return MAX_RECORDING_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    // Stop live preview stream tracks so camera light turns off
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Auto-stop when timer reaches max
  useEffect(() => {
    if (elapsed >= MAX_RECORDING_SECONDS && phase === 'recording') {
      stopRecording();
    }
  }, [elapsed, phase, stopRecording]);

  // Reattach review video when url changes
  useEffect(() => {
    if (recordedUrl && reviewVideoRef.current) {
      reviewVideoRef.current.src = recordedUrl;
    }
  }, [recordedUrl]);

  const handleReRecord = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
    setPhase('preview');
    startCamera(facingMode);
  };

  // Upload and publish to feed
  const handleConfirmPublish = async () => {
    if (!recordedBlob || !user) return;
    setPhase('uploading');
    setUploadError(null);

    try {
      // 1. Upload video to Supabase Storage
      const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `${user.id}_${Date.now()}.${ext}`;
      const filePath = `challenge-proofs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, recordedBlob, {
          contentType: recordedBlob.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      // 2. Get current user's name from profiles/leaderboard
      const { data: lbRaw } = await supabase.rpc('leaderboard_temporada' as any);
      const leaderboard: Array<{ user_id: string; nome: string }> = Array.isArray(lbRaw) ? lbRaw : [];
      const myEntry = leaderboard.find((e) => e.user_id === user.id);
      const challengerName = myEntry?.nome || myName || 'Você';

      // 3. Insert into tbfeedevents
      const { error: insertError } = await supabase
        .from('tbfeedevents')
        .insert({
          user_id: user.id,
          event_type: 'challenge_victory',
          challenger_name: challengerName,
          rival_name: challenge.rivalName,
          exercise_name: challenge.exercicioNome,
          challenger_carga: challenge.myBestCarga,
          rival_carga: challenge.rivalCarga,
          video_url: publicUrl,
        });

      if (insertError) throw insertError;

      showToast('🏆 Vitória publicada nas Novidades!', 'success');
      onPublished();
    } catch (err) {
      console.error('[ChallengeVideoModal] Upload failed:', err);
      setUploadError('Erro ao publicar o vídeo. Verifique sua conexão e tente novamente.');
      setPhase('review');
    }
  };

  const isCommunity = challenge.rivalName === 'a Comunidade';
  const rivalFirstName = isCommunity ? challenge.rivalName : challenge.rivalName.split(' ')[0];
  const progressPct = Math.round((elapsed / MAX_RECORDING_SECONDS) * 100);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black">
      {/* ── Top Bar ── */}
      <div
        className="flex-none flex items-center justify-between px-4 pt-safe-top py-3"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex flex-col">
          <span className="text-white font-black text-[14px] leading-tight">
            Gravar Prova
          </span>
          <span className="text-slate-400 text-[11px] font-medium leading-none mt-0.5">
            {challenge.exercicioNome}{!isCommunity && ` · vs ${rivalFirstName}`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 relative overflow-hidden flex flex-col">

        {/* PHASE: preview / recording — show live camera */}
        {(phase === 'preview' || phase === 'recording') && (
          <>
            {cameraError ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={32} className="text-red-400" />
                </div>
                <p className="text-slate-300 text-[14px] font-medium leading-relaxed">
                  {cameraError}
                </p>
                <button
                  onClick={() => startCamera(facingMode)}
                  className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-[13px] active:scale-95 transition-all"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : (
              <>
                {/* Live video feed */}
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="flex-1 w-full object-cover"
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />

                {/* Recording timer bar */}
                {phase === 'recording' && (
                  <div className="absolute top-0 left-0 right-0 h-1">
                    <div
                      className="h-full bg-red-500 transition-all duration-1000"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}

                {/* Recording indicator + timer */}
                {phase === 'recording' && (
                  <div
                    className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white font-black text-[13px] tabular-nums">
                      {formatTime(elapsed)}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      / {formatTime(MAX_RECORDING_SECONDS)}
                    </span>
                  </div>
                )}

                {/* Challenge overlay badge */}
                {phase === 'preview' && (
                  <div
                    className="absolute bottom-36 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-white font-bold text-[12px]">
                      {isCommunity ? (
                        <>Prova para <span className="text-red-400 font-black">Comunidade</span> validar</>
                      ) : (
                        <>Supere <span className="text-red-400 font-black">{rivalFirstName}</span> no {challenge.exercicioNome}</>
                      )}
                    </span>
                  </div>
                )}

                {/* Bottom controls */}
                <div
                  className="absolute bottom-0 left-0 right-0 pb-safe-bottom"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 80%, transparent)' }}
                >
                  <div className="flex items-center justify-between px-8 py-6">
                    {/* Flip camera */}
                    <button
                      onClick={handleFlip}
                      disabled={phase === 'recording'}
                      className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center text-white active:scale-95 transition-all disabled:opacity-40"
                    >
                      <FlipHorizontal size={22} />
                    </button>

                    {/* Record / Stop button */}
                    {phase === 'preview' ? (
                      <button
                        onClick={startRecording}
                        className="w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                        style={{ background: 'radial-gradient(circle, #ef4444, #dc2626)' }}
                      >
                        <Video size={30} className="text-white" />
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="w-20 h-20 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse"
                        style={{ background: 'radial-gradient(circle, #ef4444, #b91c1c)' }}
                      >
                        <StopCircle size={30} className="text-white" />
                      </button>
                    )}

                    {/* Spacer */}
                    <div className="w-12 h-12" />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* PHASE: review — show recorded video */}
        {phase === 'review' && recordedUrl && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Video preview */}
            <div className="flex-1 relative bg-black min-h-0 overflow-hidden">
              <video
                ref={reviewVideoRef}
                src={recordedUrl}
                controls
                playsInline
                loop
                autoPlay
                className="absolute inset-0 w-full h-full object-contain"
              />
              {/* Duration badge */}
              <div
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-white font-bold text-[12px]"
                style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
              >
                {formatTime(elapsed)}
              </div>
            </div>

            {/* Review bottom panel */}
            <div
              className="flex-none px-5 pt-4 pb-safe-bottom"
              style={{ background: '#0a0f1a', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
            >
              {/* Victory text */}
              <div
                className="w-full rounded-2xl px-4 py-3.5 mb-4 flex items-center gap-3"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(34,197,94,0.15)' }}
                >
                  <CheckCircle2 size={18} className="text-green-400" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-bold text-[13px] leading-snug">
                    Publicar no mural de Novidades:
                  </span>
                  <span className="text-green-400 font-black text-[13px] leading-snug mt-0.5">
                    {isCommunity 
                      ? `"${myName.split(' ')[0] || 'Você'} publicou uma prova de ${challenge.exercicioNome}"`
                      : `"${myName.split(' ')[0] || 'Você'} superou ${rivalFirstName} no ${challenge.exercicioNome}"`}
                  </span>
                </div>
              </div>

              {uploadError && (
                <div
                  className="w-full rounded-xl px-4 py-3 mb-3 flex items-center gap-2"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
                  <span className="text-red-300 text-[12px] font-medium">{uploadError}</span>
                </div>
              )}

              <div className="flex gap-3">
                {/* Re-record */}
                <button
                  onClick={handleReRecord}
                  className="flex-none w-[52px] h-[52px] rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <RotateCcw size={20} className="text-slate-300" />
                </button>

                {/* Confirm publish */}
                <button
                  onClick={handleConfirmPublish}
                  className="flex-1 h-[52px] rounded-2xl flex items-center justify-center gap-2.5 font-black text-[13px] uppercase tracking-widest text-white active:scale-95 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    boxShadow: '0 4px 20px rgba(34,197,94,0.35)',
                  }}
                >
                  <CheckCircle2 size={17} />
                  Confirmar e Publicar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE: uploading */}
        {phase === 'uploading' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping scale-150" />
              <div
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <Loader2 size={36} className="text-green-400 animate-spin" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-white font-black text-[17px]">Publicando sua vitória...</span>
              <span className="text-slate-400 text-[13px] font-medium">
                Enviando vídeo e notificando o clube
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
