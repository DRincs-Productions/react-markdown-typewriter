import useTypewriterHook from "@/functions/typewriterHook";
import type { MarkdownTypewriterProps } from "@/interfaces";
import { motion } from "motion/react";
import { useMemo } from "react";
import Markdown from "react-markdown";

export default function MarkdownTypewriter(props: MarkdownTypewriterProps) {
    const {
        delay = 10,
        children: text,
        motionProps = {},
        components: externalComponents,
        specialCharacters,
        ...rest
    } = props;
    const { characterVariants, onCharacterAnimationComplete, ...restMotionProps } = motionProps;
    const { sentenceVariants, components } = useTypewriterHook({
        delay,
        characterVariants,
        onCharacterAnimationComplete,
        specialCharacters,
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
            "MarkdownTypewriter: delay <= 0 is not supported. Use a positive value. If you do not want animation, use the standard react-markdown Markdown component instead.",
        );
    }

    return (
        <motion.span
            key={key}
            variants={sentenceVariants}
            initial="hidden"
            animate="visible"
            {...restMotionProps}
        >
            <Markdown {...rest} components={mergedComponents}>
                {text}
            </Markdown>
        </motion.span>
    );
}
