import type { HTMLMotionProps, Variants } from "motion/react";
import type { RefObject } from "react";
import type { HooksOptions, Options } from "react-markdown";

/**
 * Per-character animation overrides for a single special character.
 * Used in the `specialCharacters` prop.
 */
export interface SpecialCharacterOptions {
    /**
     * The delay in milliseconds to wait after this character appears before revealing the next one.
     * Overrides the global `delay` for this character.
     *
     * This delay is only applied when the character is **not** immediately followed by another
     * special character. Consecutive special characters are treated as a group and only the
     * last character's delay takes effect.
     *
     * @example
     * // "..." → pause only after the third dot
     * // ". . ." → pause after each dot (separated by spaces)
     */
    delay?: number;
    /**
     * Custom motion variants for this character.
     * Overrides `motionProps.characterVariants` for this specific character.
     *
     * @default The value of `motionProps.characterVariants`
     */
    characterVariants?: Variants;
}

interface TypewriterProps {
    /**
     * The delay in milliseconds between the appearance of one letter and the next.
     * @default 10
     */
    delay?: number;
    /**
     * Per-character animation overrides for special characters (e.g. punctuation).
     *
     * Each key must be a **single character**. The value is an {@link SpecialCharacterOptions}
     * object that can override both the inter-character `delay` and the `characterVariants`
     * for that specific character.
     *
     * ### Consecutive special characters
     * When two or more special characters appear directly next to each other (no other characters
     * between them) the extra `delay` is applied **only after the last one** in the sequence.
     * A character that appears between two special characters resets the sequence.
     *
     * @example
     * ```tsx
     * // Pause 300 ms after "." but not within "..." (pause only after the third dot).
     * // Pause 200 ms after "," and 400 ms after "?" or "!".
     * <MarkdownTypewriter
     *     specialCharacters={{
     *         ".": { delay: 300 },
     *         ",": { delay: 200 },
     *         "!": { delay: 400 },
     *         "?": { delay: 400 },
     *     }}
     * >
     *     Hello, world. How are you?
     * </MarkdownTypewriter>
     * ```
     */
    specialCharacters?: { [char: string]: SpecialCharacterOptions };
    /**
     * The props to pass to the [motion span](https://motion.dev/docs/react-motion-component).
     *
     * The `characterVariants` parameter has been added to be able to modify the animation of each individual letter
     */
    motionProps?: Omit<HTMLMotionProps<"span">, "variants"> & {
        /**
         * The motion variants for each individual letter.
         *
         * @default { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { opacity: { duration: 0 } } } }
         */
        characterVariants?: Variants;
        /**
         * A callback that is called when the animation of a letter is complete.
         * The callback is called with the reference to the letter.
         *
         * @example
         * ```tsx
         * import { useRef } from "react";
         *
         * export default function NarrationScreen() {
         *     const paragraphRef = useRef<HTMLDivElement>(null);
         *     const scrollToEnd = useCallback((ref: { current: HTMLSpanElement | null }) => {
         *         if (paragraphRef.current && ref.current) {
         *             let scrollTop = ref.current.offsetTop - paragraphRef.current.clientHeight / 2;
         *             paragraphRef.current.scrollTo({
         *                 top: scrollTop,
         *                 behavior: "auto",
         *             });
         *         }
         *     }, []);
         *     return (
         *         <div
         *             ref={paragraphRef}
         *             style={{
         *                 overflow: "auto",
         *                 height: "300px",
         *             }}
         *         >
         *             <MarkdownTypewriter
         *                 motionProps={{
         *                     onCharacterAnimationComplete: scrollToEnd,
         *                 }}
         *             >
         *                 Hello World
         *             </MarkdownTypewriter>
         *         </div>
         *     );
         * }
         * ```
         */
        onCharacterAnimationComplete?: (letterRef: RefObject<HTMLSpanElement | null>) => void;
    };
}
export default interface MarkdownTypewriterProps extends Options, TypewriterProps {}
export interface MarkdownTypewriterHooksProps extends HooksOptions, TypewriterProps {}
