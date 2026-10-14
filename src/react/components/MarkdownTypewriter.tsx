import {
    RevealSlotProvider,
    scheduleRevealComplete,
    useRevealSlotApi,
} from "@/react/functions/revealSlots";
import { MarkdownRenderer } from "@/react/functions/tanstackMarkdown";
import useTypewriterHook from "@/react/functions/typewriterHook";
import type { MarkdownTypewriterProps } from "@/react/interfaces";
import { motion } from "motion/react";
import { useEffect, useMemo } from "react";

export default function MarkdownTypewriter(props: MarkdownTypewriterProps) {
    const {
        delay = 10,
        children: text,
        motionProps = {},
        components: externalComponents,
        specialCharacters,
        accumulateConsecutiveDelays,
        animated = true,
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

    // Schedules the caller's onAnimationComplete off the reveal-slot timeline instead of Framer's
    // onAnimationComplete on the wrapper span below: the wrapper's own "visible" variant doesn't
    // animate any real property - it only configures timing for descendants - so Framer considers
    // it complete almost instantly, regardless of staggerChildren, well before the text/images/
    // links have actually been revealed. The markdown tree mounts synchronously, so by the time
    // this passive effect runs - strictly after every descendant's own mount-time useLayoutEffect
    // in the same commit - the reveal-slot cursor already reflects the whole document's predicted
    // total duration.
    useEffect(() => {
        if (!animated || !userOnAnimationComplete) return;
        return scheduleRevealComplete(revealSlotApi.peek(), () =>
            userOnAnimationComplete("visible"),
        );
    }, [animated, userOnAnimationComplete, revealSlotApi]);

    if (!animated) {
        // Same parsing and rendering (Markdown dialect, raw HTML, entities, block separators) as the
        // animated text, without any animation - e.g. for text that has already been typed out.
        return text ? (
            <MarkdownRenderer {...rest} components={externalComponents}>
                {text}
            </MarkdownRenderer>
        ) : null;
    }

    if (delay <= 0) {
        console.warn(
            "MarkdownTypewriter: delay <= 0 is not supported. Use a positive value. If you do not want animation, set `animated={false}` instead.",
        );
    }

    if (!text) {
        return <span />;
    }

    return (
        <RevealSlotProvider key={key} api={revealSlotApi}>
            <motion.span
                variants={sentenceVariants}
                initial="hidden"
                animate="visible"
                {...restMotionProps}
            >
                <MarkdownRenderer {...rest} components={mergedComponents}>
                    {text}
                </MarkdownRenderer>
            </motion.span>
        </RevealSlotProvider>
    );
}
