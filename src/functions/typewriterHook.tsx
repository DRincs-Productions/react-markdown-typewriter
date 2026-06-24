import markdownComponents from "@/functions/markdownComponents";
import type { MarkdownTypewriterProps, SpecialCharacterOptions } from "@/interfaces";
import type { Variants } from "motion/react";
import { type RefObject, useMemo } from "react";

const DEFAULT_CHARACTER_VARIANTS: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { opacity: { duration: 0 } } },
};

export default function useTypewriterHook(props: {
    delay?: MarkdownTypewriterProps["delay"];
    onCharacterAnimationComplete?: (letterRef: RefObject<HTMLSpanElement | null>) => void;
    characterVariants?: Variants;
    specialCharacters?: { [char: string]: SpecialCharacterOptions };
    accumulateConsecutiveDelays?: boolean;
}): { sentenceVariants: Variants; components: ReturnType<typeof markdownComponents> } {
    const {
        delay = 10,
        characterVariants: letterVariantsProp = DEFAULT_CHARACTER_VARIANTS,
        onCharacterAnimationComplete,
        specialCharacters,
        accumulateConsecutiveDelays,
    } = props;
    const sentenceVariants = useMemo<Variants>(
        () => ({
            hidden: {},
            visible: { opacity: 1, transition: { staggerChildren: delay / 1000 } },
        }),
        [delay],
    );
    const characterVariants = useMemo<Variants>(() => letterVariantsProp, [letterVariantsProp]);
    const components = useMemo(
        () =>
            markdownComponents({
                characterVariants,
                onCharacterAnimationComplete,
                delay,
                specialCharacters,
                accumulateConsecutiveDelays,
            }),
        [delay, characterVariants, onCharacterAnimationComplete, specialCharacters, accumulateConsecutiveDelays],
    );

    return {
        sentenceVariants,
        components,
    };
}
