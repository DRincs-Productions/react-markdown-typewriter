/**
 * Coordinates cross-block reveal timing (e.g. heading -> paragraph -> next heading) for the
 * self-driven per-character reveal path (see the React TypewriterItem's plain-string branch).
 *
 * The whole document mounts in a single React commit, so every block's characters would
 * otherwise start their own timers from the same wall-clock instant. A slot api (shared through a React context) lets each
 * top-level block "claim" a slice of the shared timeline (in ms) via `useLayoutEffect` - which
 * fires in document order across siblings within one commit - so blocks still type out
 * sequentially instead of all bursting in parallel.
 *
 * `claim`/`release` must be called as a matched pair from the SAME effect (claim on mount,
 * release on cleanup) so that StrictMode's mount -> cleanup -> remount dance nets out correctly:
 * cleanups run in exact reverse order of their effects, so undoing a claim by subtracting the
 * same duration always restores the cursor to what it was before that block claimed a slice.
 */
export interface RevealSlotAPI {
    claim: (durationMs: number) => number;
    release: (durationMs: number) => void;
    /** Current cursor value (ms) - the predicted end time of every block claimed so far. Once
     * every top-level block has claimed its slice within the same commit, this is the whole
     * document's predicted total reveal duration (see `useRevealSlotApi`'s doc comment). */
    peek: () => number;
}

/** Creates an empty reveal timeline: blocks `claim` consecutive slices of it, in document order. */
export function createRevealSlotApi(): RevealSlotAPI {
    let cursor = 0;
    return {
        claim: (durationMs: number) => {
            const start = cursor;
            cursor += durationMs;
            return start;
        },
        release: (durationMs: number) => {
            cursor -= durationMs;
        },
        peek: () => cursor,
    };
}

/**
 * Calls `callback` once a reveal predicted to last `totalMs` has actually been painted, and
 * returns a cancel function.
 *
 * `totalMs` is when the last character becomes DUE, but it only shows up on the next frame of
 * `SelfDrivenCharSpans`'s rAF loop, and Framer applies its "visible" state a frame after that
 * commit. With a short `delay` (smaller than a frame) a bare timer therefore fired while the last
 * 1-3 characters were still hidden, so an app reacting to it (e.g. swapping the animated text for
 * its static copy) made them pop in. Waiting two more animation frames after the timer covers both.
 */
export function scheduleRevealComplete(totalMs: number, callback: () => void): () => void {
    let rafId: number | undefined;
    const timeoutId = setTimeout(() => {
        rafId = requestAnimationFrame(() => {
            rafId = requestAnimationFrame(callback);
        });
    }, totalMs);
    return () => {
        clearTimeout(timeoutId);
        if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
}
