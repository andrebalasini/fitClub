import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook that enables horizontal drag-to-scroll on desktop (click + drag).
 * Works seamlessly alongside native touch scroll on mobile.
 * Prevents click events from firing when dragging.
 * Prevents native image/element drag from interfering.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>(options?: { disabled?: boolean }) {
    const ref = useRef<T>(null);
    const disabledRef = useRef(options?.disabled || false);
    const isMouseDown = useRef(false);
    const hasDragged = useRef(false);
    const startX = useRef(0);
    const scrollLeftStart = useRef(0);

    useEffect(() => {
        disabledRef.current = options?.disabled || false;
        
        const container = ref.current;
        if (container) {
            container.style.cursor = disabledRef.current ? 'auto' : 'grab';
        }
    }, [options?.disabled]);

    const resetDragState = useCallback(() => {
        const container = ref.current;
        isMouseDown.current = false;
        if (container) {
            container.style.cursor = 'grab';
            container.style.removeProperty('user-select');
        }
    }, []);

    const handleMouseDown = useCallback((event: MouseEvent) => {
        if (disabledRef.current) return;
        
        const container = ref.current;
        if (!container) return;

        // Prevent native drag on images and other elements
        event.preventDefault();

        isMouseDown.current = true;
        hasDragged.current = false;
        startX.current = event.pageX;
        scrollLeftStart.current = container.scrollLeft;
        container.style.cursor = 'grabbing';
        container.style.userSelect = 'none';
    }, []);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!isMouseDown.current) return;

        // Safety: if the button was released outside, reset state
        if (event.buttons === 0) {
            resetDragState();
            return;
        }

        const container = ref.current;
        if (!container) return;

        const distance = Math.abs(event.pageX - startX.current);

        if (distance > 5) {
            hasDragged.current = true;
            event.preventDefault();
        }

        if (hasDragged.current) {
            const walkDistance = (event.pageX - startX.current) * 1.5;
            container.scrollLeft = scrollLeftStart.current - walkDistance;
        }
    }, [resetDragState]);

    // Prevent click on children when a drag just happened
    const handleClick = useCallback((event: MouseEvent) => {
        if (hasDragged.current) {
            event.preventDefault();
            event.stopPropagation();
            hasDragged.current = false;
        }
    }, []);

    // Prevent native drag (images, links, etc.)
    const preventDragStart = useCallback((event: Event) => {
        event.preventDefault();
    }, []);

    useEffect(() => {
        const container = ref.current;
        if (!container) return;

        container.style.cursor = 'grab';

        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('click', handleClick, true);
        container.addEventListener('dragstart', preventDragStart);
        container.addEventListener('selectstart', preventDragStart);

        // Listen on document so mouseup is always caught, even outside the container
        document.addEventListener('mouseup', resetDragState);

        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('click', handleClick, true);
            container.removeEventListener('dragstart', preventDragStart);
            container.removeEventListener('selectstart', preventDragStart);
            document.removeEventListener('mouseup', resetDragState);
        };
    }, [handleMouseDown, handleMouseMove, handleClick, resetDragState, preventDragStart]);

    return ref;
}
