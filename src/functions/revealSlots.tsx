import { type ReactNode, createContext, useContext, useRef } from "react";

/**
 * Coordinates cross-block reveal timing (e.g. heading -> paragraph -> next heading) for the
 * self-driven per-character reveal path (see TypewriterItem's plain-string branch).
 *
 * The whole document mounts in a single React commit, so every block's characters would
 * otherwise start their own timers from the same wall-clock instant. This context lets each
 * top-level block "claim" a slice of the shared timeline (in ms) via `useLayoutEffect` - which
 * fires in document order across siblings within one commit - so blocks still type out
 * sequentially instead of all bursting in parallel.
 *
 * `claim`/`release` must be called as a matched pair from the SAME effect (claim on mount,
 * release on cleanup) so that StrictMode's mount -> cleanup -> remount dance nets out correctly:
 * cleanups run in exact reverse order of their effects, so undoing a claim by subtracting the
 * same duration always restores the cursor to what it was before that block claimed a slice.
 */
interface RevealSlotAPI {
    claim: (durationMs: number) => number;
    release: (durationMs: number) => void;
}

const RevealSlotContext = createContext<RevealSlotAPI | null>(null);

export function RevealSlotProvider({ children }: { children: ReactNode }) {
    const cursorRef = useRef(0);
    const apiRef = useRef<RevealSlotAPI | null>(null);
    if (!apiRef.current) {
        apiRef.current = {
            claim: (durationMs: number) => {
                const start = cursorRef.current;
                cursorRef.current += durationMs;
                return start;
            },
            release: (durationMs: number) => {
                cursorRef.current -= durationMs;
            },
        };
    }
    return <RevealSlotContext.Provider value={apiRef.current}>{children}</RevealSlotContext.Provider>;
}

/** Returns `null` when rendered outside a `RevealSlotProvider` - callers should fall back to
 * treating the block as if it starts at t=0 (no cross-block coordination available). */
export function useRevealSlot(): RevealSlotAPI | null {
    return useContext(RevealSlotContext);
}
