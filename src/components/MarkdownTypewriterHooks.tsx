import useTypewriterHook from "@/functions/typewriterHook";
import type { MarkdownTypewriterHooksProps } from "@/interfaces";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { MarkdownHooks } from "react-markdown";

export default function MarkdownTypewriterHooks(props: MarkdownTypewriterHooksProps) {
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
    const [animated, set] = useState<"hidden" | "visible">("hidden");

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
        const timeoutId = setTimeout(() => {
            set("visible");
        }, 10);
        return () => {
            clearTimeout(timeoutId);
            set("hidden");
        };
    }, [text]);

    return (
        <motion.span
            key={key}
            variants={sentenceVariants}
            initial="hidden"
            animate={animated}
            {...restMotionProps}
        >
            <MarkdownHooks {...rest} components={mergedComponents}>
                {text}
            </MarkdownHooks>
        </motion.span>
    );
}
