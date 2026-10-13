import {
    RevealSlotProvider,
    revealAfterMotionFrame,
    scheduleRevealComplete,
    useRevealSlotApi,
} from "@/functions/revealSlots";
import { MarkdownRenderer } from "@/functions/tanstackMarkdown";
import useTypewriterHook from "@/functions/typewriterHook";
import type { MarkdownTypewriterHooksProps } from "@/interfaces";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

export default function MarkdownTypewriterHooks(props: MarkdownTypewriterHooksProps) {
    const {
        delay = 10,
        children: text,
        motionProps = {},
        components: externalComponents,
        specialCharacters,
        accumulateConsecutiveDelays,
        // TanStack Markdown renders synchronously: there is no loading state to show it for.
        fallback: _fallback,
        ...rest
    } = props;
    const {
        characterVariants,
        onCharacterAnimationComplete,
        onAnimationComplete: userOnAnimationComplete,
        ...restMotionProps
    } = motionProps;
    const { sentenceVariants, components } = useTypewriterHook({
        delay,
        characterVariants,
        onCharacterAnimationComplete,
        specialCharacters,
        accumulateConsecutiveDelays,
    });
    const containerRef = useRef<HTMLSpanElement>(null);
    const cancelCompletionRef = useRef<(() => void) | null>(null);

    const mergedComponents = useMemo(
        () => ({
            ...components,
            ...(externalComponents || {}),
        }),
        [components, externalComponents],
    );

    const key = useMemo(
        () => `typewriter-${typeof text === "string" ? text.slice(0, 32) : ""}`,
        [text],
    );
    const revealSlotApi = useRevealSlotApi(key);

    // Tied to `key` so that new text never mounts with the previous text's "visible" (which would
    // start revealing it before its content had even mounted). See `revealAfterMotionFrame` for
    // why the flip to "visible" waits for Motion's frame loop.
    const [revealedKey, setRevealedKey] = useState<string | null>(null);
    const animated = revealedKey === key ? "visible" : "hidden";
    const cancelRevealRef = useRef<(() => void) | null>(null);

    // biome-ignore lint/correctness/useExhaustiveDependencies: text change triggers animation reset
    useEffect(() => {
        const node = containerRef.current;
        if (!node) {
            return;
        }

        // Fires once the children behind this wrapper have actually mounted (and so already ran
        // their own claim-time useLayoutEffects - see SelfDrivenCharSpans/DelayedOldMechanismBlock),
        // which is why it's safe to peek() the reveal-slot timeline here: schedules the CALLER's
        // onAnimationComplete off a plain timer matching the real predicted total reveal duration,
        // instead of relying on Framer's onAnimationComplete on this wrapper span. That fires almost
        // instantly regardless of staggerChildren, because the wrapper's own "visible" variant
        // doesn't animate any real property of its own - it only configures timing for descendants -
        // so Framer considers the wrapper's own transition "complete" right away (confirmed via
        // isolated testing), which fired the caller's callback far too early (e.g. an app treating it
        // as "typewriter reveal finished" would act on that immediately, well before the text/images/
        // links actually finished revealing).
        function reveal() {
            cancelRevealRef.current = revealAfterMotionFrame(() => setRevealedKey(key));
            if (userOnAnimationComplete) {
                cancelCompletionRef.current = scheduleRevealComplete(revealSlotApi.peek(), () =>
                    userOnAnimationComplete("visible"),
                );
            }
        }

        // TanStack Markdown renders synchronously, so by now the whole tree has mounted (unlike
        // react-markdown's MarkdownHooks, which resolved it in its own effect and needed a
        // MutationObserver to wait for the content).
        reveal();
        return () => {
            cancelRevealRef.current?.();
            setRevealedKey(null);
            cancelCompletionRef.current?.();
        };
    }, [text]);

    if (delay <= 0) {
        console.warn(
            "MarkdownTypewriterHooks: delay <= 0 is not supported. Use a positive value. If you do not want animation, use the standard @tanstack/markdown Markdown component instead.",
        );
    }

    if (!text) {
        return <span />;
    }

    return (
        <RevealSlotProvider key={key} api={revealSlotApi}>
            <motion.span
                ref={containerRef}
                variants={sentenceVariants}
                initial="hidden"
                animate={animated}
                {...restMotionProps}
            >
                <MarkdownRenderer {...rest} components={mergedComponents}>
                    {text}
                </MarkdownRenderer>
            </motion.span>
        </RevealSlotProvider>
    );
}
