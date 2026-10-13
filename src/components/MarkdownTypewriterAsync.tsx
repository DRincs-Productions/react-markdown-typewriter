import { RevealSlotProvider } from "@/functions/revealSlots";
import { MarkdownRenderer } from "@/functions/tanstackMarkdown";
import useTypewriterHook from "@/functions/typewriterHook";
import type { MarkdownTypewriterProps } from "@/interfaces";
import { motion } from "motion/react";
import { useMemo } from "react";

export default async function MarkdownTypewriterAsync(props: MarkdownTypewriterProps) {
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

    if (delay <= 0) {
        console.warn(
            "MarkdownTypewriterAsync: delay <= 0 is not supported. Use a positive value. If you do not want animation, use the standard @tanstack/markdown Markdown component instead.",
        );
    }

    if (!text) {
        return <span />;
    }

    return (
        <RevealSlotProvider key={key}>
            <motion.span
                variants={sentenceVariants}
                initial="hidden"
                animate={"visible"}
                {...restMotionProps}
            >
                <MarkdownRenderer {...rest} components={mergedComponents}>
                    {text}
                </MarkdownRenderer>
            </motion.span>
        </RevealSlotProvider>
    );
}
