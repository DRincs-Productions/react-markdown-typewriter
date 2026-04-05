import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { MarkdownHooks } from "react-markdown";
import typewriterHook from "../functions/typewriterHook";
import { MarkdownTypewriterHooksProps } from "../interfaces/MarkdownTypewriterProps";

export default function MarkdownTypewriterHooks(props: MarkdownTypewriterHooksProps) {
    const { delay = 10, children: text, motionProps = {}, components: externalComponents, ...rest } = props;
    const { characterVariants, onCharacterAnimationComplete, ...restMotionProps } = motionProps;
    const { sentenceVariants, components } = typewriterHook({
        delay,
        characterVariants,
        onCharacterAnimationComplete,
    });
    const [animated, set] = useState<"hidden" | "visible">("hidden");

    const mergedComponents = useMemo(
        () => ({
            ...components,
            ...(externalComponents || {}),
        }),
        [components, externalComponents]
    );

    const key = useMemo(() => `typewriter-${typeof text === "string" ? text.slice(0, 32) : ""}`, [text]);

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
        <motion.span key={key} variants={sentenceVariants} initial='hidden' animate={animated} {...restMotionProps}>
            <MarkdownHooks {...rest} components={mergedComponents}>
                {text}
            </MarkdownHooks>
        </motion.span>
    );
}
