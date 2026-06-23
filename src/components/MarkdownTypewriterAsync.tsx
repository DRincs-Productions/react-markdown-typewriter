import useTypewriterHook from "@/functions/typewriterHook";
import type { MarkdownTypewriterProps } from "@/interfaces";
import { motion } from "motion/react";
import { useMemo } from "react";
import { MarkdownAsync } from "react-markdown";

export default async function MarkdownTypewriterAsync(props: MarkdownTypewriterProps) {
    const {
        delay = 10,
        children: text,
        motionProps = {},
        components: externalComponents,
        ...rest
    } = props;
    const { characterVariants, onCharacterAnimationComplete, ...restMotionProps } = motionProps;
    const { sentenceVariants, components } = useTypewriterHook({
        delay,
        characterVariants,
        onCharacterAnimationComplete,
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

    const markdown = await MarkdownAsync({
        ...rest,
        components: mergedComponents,
        children: text,
    });

    return (
        <motion.span
            key={key}
            variants={sentenceVariants}
            initial="hidden"
            animate={"visible"}
            {...restMotionProps}
        >
            {markdown}
        </motion.span>
    );
}
