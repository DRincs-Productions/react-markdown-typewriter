import { useRevealSlotApi, RevealSlotProvider } from "@/functions/revealSlots";
import useTypewriterHook from "@/functions/typewriterHook";
import type { MarkdownTypewriterHooksProps } from "@/interfaces";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MarkdownHooks } from "react-markdown";

export default function MarkdownTypewriterHooks(props: MarkdownTypewriterHooksProps) {
    const {
        delay = 10,
        children: text,
        motionProps = {},
        components: externalComponents,
        specialCharacters,
        accumulateConsecutiveDelays,
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
    const [animated, set] = useState<"hidden" | "visible">("hidden");
    const containerRef = useRef<HTMLSpanElement>(null);
    const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            set("visible");
            if (userOnAnimationComplete) {
                const totalMs = revealSlotApi.peek();
                completionTimeoutRef.current = setTimeout(
                    () => userOnAnimationComplete("visible"),
                    totalMs,
                );
            }
        }

        // MarkdownHooks mounts its tree asynchronously (it runs the unified processor in its
        // own effect), so we can't flip to "visible" on a fixed timer - a slow environment
        // (e.g. a cold/contended webview) can resolve that later than any fixed delay, which
        // races the children mounting after we've already animated to "visible" and makes them
        // pop in instantly instead of animating. Watch the DOM directly and reveal only once
        // the real content has actually mounted.
        if (node.childNodes.length > 0) {
            reveal();
            return () => {
                set("hidden");
                if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
            };
        }

        const observer = new MutationObserver(() => {
            observer.disconnect();
            reveal();
        });
        observer.observe(node, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            set("hidden");
            if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
        };
    }, [text]);

    if (delay <= 0) {
        console.warn(
            "MarkdownTypewriterHooks: delay <= 0 is not supported. Use a positive value. If you do not want animation, use the standard react-markdown MarkdownHooks component instead.",
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
                <MarkdownHooks {...rest} components={mergedComponents}>
                    {text}
                </MarkdownHooks>
            </motion.span>
        </RevealSlotProvider>
    );
}
