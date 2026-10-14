import { cancelFrame, frame } from "motion/react";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import { createRevealSlotApi, type RevealSlotAPI } from "@/core/timeline";

export { scheduleRevealComplete } from "@/core/timeline";

const RevealSlotContext = createContext<RevealSlotAPI | null>(null);

/**
 * Creates the claim/release/peek API backing a `RevealSlotProvider`. Exposed as its own hook so a
 * top-level component (e.g. `MarkdownTypewriter`) can hold the SAME api object it hands to
 * the provider, and read `peek()` itself once every block has mounted - rather than only being
 * able to reach it as a context *consumer*, which its own subtree's Provider element can never
 * make it one of.
 *
 * Pass the same `key` the caller already uses to force-remount its `RevealSlotProvider` on new
 * text (e.g. `MarkdownTypewriter`'s own `key`). Without it, the returned api - and so its
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
 * Calls `callback` (meant to flip a gate from "hidden" to "visible") from Motion's own frame loop,
 * after its `update` step, and returns a cancel function.
 *
 * A gate mounted with `animate="hidden"` makes Motion re-assert each variant child's (already
 * hidden) value with a deferred `frame.update(() => value.set(0))`. If the gate flipped to
 * "visible" straight away (e.g. synchronously in a layout effect) and the main thread was then
 * busy - e.g. committing a long paragraph - the first characters' short stagger delays elapsed
 * and their "visible" animations finished BEFORE that frame ran, so the stale re-assert set them
 * back to 0 for good, leaving a hole at the start of the revealed text. Flipping in `postRender`
 * guarantees any such re-assert has already run.
 */
export function revealAfterMotionFrame(callback: () => void): () => void {
    let cancelled = false;
    const process = () => {
        if (!cancelled) callback();
    };
    frame.postRender(process);
    return () => {
        cancelled = true;
        cancelFrame(process);
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
