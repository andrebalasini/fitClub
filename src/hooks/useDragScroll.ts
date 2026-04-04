import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook that enables horizontal drag-to-scroll on desktop (click + drag).
 * Works seamlessly alongside native touch scroll on mobile.
 * Prevents click events from firing when dragging.
 * Prevents native image/element drag from interfering.
 *
 * Key improvements over naive implementations:
 * - mousemove/mouseup are listened on the DOCUMENT, not the container,
 *   so dragging works even when the pointer leaves the container boundary.
 * - selectstart is blocked on the DOCUMENT while dragging to prevent text
 *   selection from starting mid-gesture.
 * - user-select: none is applied to the <body> during the drag so that
 *   browser text-selection never activates, regardless of child elements.
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

    // Block text selection globally while dragging
    const blockSelection = useCallback((e: Event) => {
        if (isMouseDown.current) e.preventDefault();
    }, []);

    const stopDrag = useCallback(() => {
        const container = ref.current;
        isMouseDown.current = false;

        if (container) {
            container.style.cursor = 'grab';
        }

        // Re-enable text selection on body
        document.body.style.removeProperty('user-select');
        document.body.style.removeProperty('-webkit-user-select');
    }, []);

    const handleMouseDown = useCallback((event: MouseEvent) => {
        if (disabledRef.current) return;

        const container = ref.current;
        if (!container) return;

        // Only react to left click
        if (event.button !== 0) return;

        const target = event.target as HTMLElement;
        const isInput = target && ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'OPTION'].includes(target.tagName);
        if (!isInput && !target.isContentEditable) {
            // Prevent browser from initiating text selection or native element dragging
            // This is critical for stable mousemove dragging 
            event.preventDefault();
        }

        isMouseDown.current = true;
        hasDragged.current = false;
        startX.current = event.pageX;
        scrollLeftStart.current = container.scrollLeft;
        container.style.cursor = 'grabbing';

        // Kill text selection on the entire body for the duration of the drag
        document.body.style.userSelect = 'none';
        (document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = 'none';
    }, []);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (!isMouseDown.current) return;

        // If button was released outside the window, clean up
        if (event.buttons === 0) {
            stopDrag();
            return;
        }

        const container = ref.current;
        if (!container) return;

        const distance = Math.abs(event.pageX - startX.current);

        if (distance > 5) {
            hasDragged.current = true;
        }

        if (hasDragged.current) {
            const walkDistance = (event.pageX - startX.current) * 1.5;
            container.scrollLeft = scrollLeftStart.current - walkDistance;
        }
    }, [stopDrag]);

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

        // Container-level listeners
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('click', handleClick, true);
        container.addEventListener('dragstart', preventDragStart);

        // Document-level listeners — ensures drag works even when pointer
        // leaves the container, and text selection is always suppressed.
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('selectstart', blockSelection);

        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            container.removeEventListener('click', handleClick, true);
            container.removeEventListener('dragstart', preventDragStart);

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('selectstart', blockSelection);
        };
    }, [handleMouseDown, handleMouseMove, handleClick, stopDrag, preventDragStart, blockSelection]);

    return ref;
}
