import { RevealSlotProvider } from "@/functions/revealSlots";
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
    const { characterVariants, onCharacterAnimationComplete, ...restMotionProps } = motionProps;
    const { sentenceVariants, components } = useTypewriterHook({
        delay,
        characterVariants,
        onCharacterAnimationComplete,
        specialCharacters,
        accumulateConsecutiveDelays,
    });
    const [animated, set] = useState<"hidden" | "visible">("hidden");
    const containerRef = useRef<HTMLSpanElement>(null);

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

    // biome-ignore lint/correctness/useExhaustiveDependencies: text change triggers animation reset
    useEffect(() => {
        const node = containerRef.current;
        if (!node) {
            return;
        }

        // MarkdownHooks mounts its tree asynchronously (it runs the unified processor in its
        // own effect), so we can't flip to "visible" on a fixed timer - a slow environment
        // (e.g. a cold/contended webview) can resolve that later than any fixed delay, which
        // races the children mounting after we've already animated to "visible" and makes them
        // pop in instantly instead of animating. Watch the DOM directly and reveal only once
        // the real content has actually mounted.
        if (node.childNodes.length > 0) {
            set("visible");
            return () => set("hidden");
        }

        const observer = new MutationObserver(() => {
            observer.disconnect();
            set("visible");
        });
        observer.observe(node, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            set("hidden");
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
        <RevealSlotProvider key={key}>
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
