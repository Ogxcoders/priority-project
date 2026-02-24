/**
 * Custom Hooks — Production-Ready
 * 
 * - usePrefetch: Prefetch routes on hover/focus
 * - useDebouncedSave: Debounced field save for text inputs
 * - useOnlineStatus: Track online/offline state
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Prefetch a route on hover/focus for instant page transitions.
 * Returns props to spread on the element.
 */
export function usePrefetch(href: string) {
    const router = useRouter();
    const prefetched = useRef(false);

    const handlePrefetch = useCallback(() => {
        if (!prefetched.current) {
            router.prefetch(href);
            prefetched.current = true;
        }
    }, [href, router]);

    return {
        onMouseEnter: handlePrefetch,
        onFocus: handlePrefetch,
        onTouchStart: handlePrefetch,
    };
}

/**
 * Debounced save hook for text inputs.
 * Updates local state immediately, debounces the save call.
 */
export function useDebouncedSave(
    saveFn: (value: string) => Promise<void>,
    delay: number = 400
) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const latestValue = useRef<string>('');

    const debouncedSave = useCallback((value: string) => {
        latestValue.current = value;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            saveFn(latestValue.current).catch(console.error);
        }, delay);
    }, [saveFn, delay]);

    // Flush on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                // Fire the last pending save
                saveFn(latestValue.current).catch(console.error);
            }
        };
    }, [saveFn]);

    return debouncedSave;
}

/**
 * Track online/offline status reactively.
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

/**
 * Intersection Observer hook for lazy loading.
 */
export function useIntersectionObserver(
    options: IntersectionObserverInit = { threshold: 0.1 }
) {
    const ref = useRef<HTMLElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, options);

        observer.observe(element);
        return () => observer.disconnect();
    }, [options]);

    return { ref, isVisible };
}
