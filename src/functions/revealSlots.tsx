import { type ReactNode, createContext, useContext, useMemo } from "react";

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
    /** Current cursor value (ms) - the predicted end time of every block claimed so far. Once
     * every top-level block has claimed its slice within the same commit, this is the whole
     * document's predicted total reveal duration (see `useRevealSlotApi`'s doc comment). */
    peek: () => number;
}

const RevealSlotContext = createContext<RevealSlotAPI | null>(null);

function createRevealSlotApi(): RevealSlotAPI {
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
 * Creates the claim/release/peek API backing a `RevealSlotProvider`. Exposed as its own hook so a
 * top-level component (e.g. `MarkdownTypewriterHooks`) can hold the SAME api object it hands to
 * the provider, and read `peek()` itself once every block has mounted - rather than only being
 * able to reach it as a context *consumer*, which its own subtree's Provider element can never
 * make it one of.
 *
 * Pass the same `key` the caller already uses to force-remount its `RevealSlotProvider` on new
 * text (e.g. `MarkdownTypewriterHooks`'s own `key`). Without it, the returned api - and so its
 * cursor - would live for the component's whole lifetime instead of resetting per text, since
 * (unlike the provider itself) this hook's owner doesn't remount when only its `children` prop
 * changes.
 */
export function useRevealSlotApi(key?: string): RevealSlotAPI {
    // biome-ignore lint/correctness/useExhaustiveDependencies: key is the reset trigger, not a value read inside the factory
    return useMemo(() => createRevealSlotApi(), [key]);
}

export function RevealSlotProvider({
    children,
    api: externalApi,
}: {
    children: ReactNode;
    /** Reuse a caller-owned api (see `useRevealSlotApi`) instead of creating a new one. */
    api?: RevealSlotAPI;
}) {
    const ownApi = useRevealSlotApi();
    return (
        <RevealSlotContext.Provider value={externalApi ?? ownApi}>
            {children}
        </RevealSlotContext.Provider>
    );
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
        <AncestorPropagationContext.Provider value={true}>
            {children}
        </AncestorPropagationContext.Provider>
    );
}

export function useAncestorPropagation(): boolean {
    return useContext(AncestorPropagationContext);
}
