import { useState, useRef, useCallback, type ReactNode } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

interface SwipeableCardProps {
    children: ReactNode;
    onDelete: () => Promise<void>;
}

const SWIPE_THRESHOLD = 70;
const DELETE_ZONE_WIDTH = 80;

export function SwipeableCard({ children, onDelete }: SwipeableCardProps) {
    const [offsetX, setOffsetX] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isDraggingState, setIsDraggingState] = useState(false);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const currentOffset = useRef(0); // Offset at the start of the drag
    const currentOffsetValue = useRef(0); // Live offset value
    const containerRef = useRef<HTMLDivElement>(null);

    const startDrag = useCallback((clientX: number) => {
        isDragging.current = true;
        setIsDraggingState(true);
        startX.current = clientX;
        currentOffset.current = isRevealed ? -DELETE_ZONE_WIDTH : 0;
        currentOffsetValue.current = currentOffset.current;
    }, [isRevealed]);

    const moveDrag = useCallback((clientX: number) => {
        if (!isDragging.current) return;

        const diff = clientX - startX.current;
        const newOffset = currentOffset.current + diff;

        // Clamp: can't go right past 0, or left past delete zone
        const clamped = Math.max(-DELETE_ZONE_WIDTH - 20, Math.min(0, newOffset));
        currentOffsetValue.current = clamped;
        setOffsetX(clamped);
    }, []);

    const endDrag = useCallback(() => {
        if (!isDragging.current) return;
        isDragging.current = false;
        setIsDraggingState(false);

        if (currentOffsetValue.current < -SWIPE_THRESHOLD) {
            currentOffsetValue.current = -DELETE_ZONE_WIDTH;
            setOffsetX(-DELETE_ZONE_WIDTH);
            setIsRevealed(true);
        } else {
            currentOffsetValue.current = 0;
            setOffsetX(0);
            setIsRevealed(false);
        }
    }, []);

    // Mouse events
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only trigger on left click
        if (e.button !== 0) return;
        
        startDrag(e.clientX);

        const handleMouseMove = (ev: MouseEvent) => moveDrag(ev.clientX);
        const handleMouseUp = () => {
            endDrag();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [startDrag, moveDrag, endDrag]);

    // Touch events
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startDrag(e.touches[0].clientX);
    }, [startDrag]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        moveDrag(e.touches[0].clientX);
    }, [moveDrag]);

    const handleTouchEnd = useCallback(() => {
        endDrag();
    }, [endDrag]);

    const handleDelete = async () => {
        setIsDeleting(true);
        await onDelete();
    };

    const handleCloseSwipe = useCallback(() => {
        setOffsetX(0);
        setIsRevealed(false);
    }, []);

    return (
        <div ref={containerRef} className="relative overflow-hidden rounded-xl">
            {/* Delete zone behind the card */}
            <div className="absolute inset-0 flex items-center justify-end bg-red-500/90 rounded-xl">
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-20 h-full flex items-center justify-center transition-all active:scale-90"
                >
                    {isDeleting ? (
                        <Loader2 size={22} className="text-white animate-spin" />
                    ) : (
                        <Trash2 size={22} className="text-white" />
                    )}
                </button>
            </div>

            {/* Swipeable card content */}
            <div
                className="relative z-10 select-none"
                style={{
                    transform: `translateX(${offsetX}px)`,
                    transition: isDraggingState ? 'none' : 'transform 250ms ease-out',
                }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={isRevealed ? handleCloseSwipe : undefined}
            >
                {children}
            </div>
        </div>
    );
}
