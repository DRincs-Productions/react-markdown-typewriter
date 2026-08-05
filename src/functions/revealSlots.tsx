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

/**
 * Signals that a `TypewriterItem` invocation is nested inside a mixed text+element paragraph
 * (e.g. plain text with an embedded `**bold**`/`_italic_`/`~~strikethrough~~` run or an image/
 * link) rather than being a standalone block of its own.
 *
 * A mixed paragraph's own direct text still reveals via the older ancestor-propagated
 * `staggerChildren` mechanism (see `TypewriterItem`'s array branch) rather than the self-driven
 * per-block scheduler, because some of its children (arbitrary embedded elements like images or
 * links) can't be given an explicit reveal time without cloning them. A nested inline element
 * such as `**bold**` has a plain string as ITS OWN `children`, though, so without this signal it
 * would independently qualify for - and use - the self-driven scheduler while its surrounding
 * plain-text siblings are still on the old ancestor-propagated clock: two decoupled timelines in
 * the same paragraph, which is exactly what made bold/italic/strikethrough runs reveal out of
 * sync with the rest of the sentence. Setting this to `true` around a mixed paragraph's output
 * makes every nested `TypewriterItem` call (however deep) fall back to the same old mechanism,
 * keeping the whole paragraph on one consistent clock.
 */
const AncestorPropagationContext = createContext(false);

export function AncestorPropagationProvider({ children }: { children: ReactNode }) {
    return (
        <AncestorPropagationContext.Provider value={true}>{children}</AncestorPropagationContext.Provider>
    );
}

export function useAncestorPropagation(): boolean {
    return useContext(AncestorPropagationContext);
}
