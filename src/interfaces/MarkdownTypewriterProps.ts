import type { HTMLMotionProps, Variants } from "motion/react";
import type { RefObject } from "react";
import type { HooksOptions, Options } from "react-markdown";

/**
 * Per-character animation overrides for a single special character.
 * Used in the `specialCharacters` prop.
 *
 * ### `delay` vs `delayAfter`
 *
 * - **`delay`** overrides how long the typewriter waits *before* this character appears
 *   (i.e. it replaces the global stagger delay for this specific character).
 *   No consecutive rule: every occurrence gets its own override, even in `"..."`.
 *
 * - **`delayAfter`** inserts a pause *after* this character before the next one appears.
 *   Consecutive rule applies: for `"..."` only the **last** `.` triggers the pause;
 *   for `". . ."` each `.` triggers its own pause because a space separates them.
 *
 * @example
 * // Pause 400 ms after each sentence-ending "." but not within "..."
 * // (the pause fires only after the third dot in "...").
 * const specialChars = {
 *     ".": { delayAfter: 400 },
 *     ",": { delayAfter: 150 },
 *     "!": { delayAfter: 500 },
 *     "?": { delayAfter: 500 },
 * };
 */
export interface SpecialCharacterOptions {
    /**
     * Overrides the global stagger delay for THIS character — i.e. how long the typewriter
     * waits before this character appears.
     *
     * **No consecutive rule**: every occurrence gets its own override, even in `"..."`.
     */
    delay?: number;
    /**
     * Inserts a pause *after* this character before the next one appears.
     *
     * **Consecutive rule applies**: in `"..."` only the LAST `.` triggers; in `"?!?"` only the last `?`
     * triggers; in `". . ."` each `.` triggers (a space breaks the sequence).
     */
    delayAfter?: number;
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
     * Each key must be a **single character**. The value is a {@link SpecialCharacterOptions}
     * object with three optional fields:
     *
     * - **`delay`** — overrides how long the typewriter waits *before* this character appears.
     *   No consecutive rule: every occurrence gets its own override, including in `"..."`.
     * - **`delayAfter`** — inserts a pause *after* this character before the next one appears.
     *   Consecutive rule: in `"..."` only the **last** `.` triggers; in `"?!?"` only the last `?` triggers;
     *   in `". . ."` each `.` triggers (a space breaks the sequence).
     * - **`characterVariants`** — custom framer-motion variants for this character.
     *
     * @example
     * ```tsx
     * // Pause after punctuation; "..." pauses once (after the third dot);
     * // "?!?" pauses once (after the last "?").
     * <MarkdownTypewriter
     *     specialCharacters={{
     *         ".": { delayAfter: 400 },
     *         ",": { delayAfter: 150 },
     *         "!": { delayAfter: 500 },
     *         "?": { delayAfter: 500 },
     *     }}
     * >
     *     Hello, world. How are you?! Really?!? Wow...
     * </MarkdownTypewriter>
     * ```
     */
    specialCharacters?: { [char: string]: SpecialCharacterOptions };
    /**
     * When `true`, consecutive special characters (any combination) accumulate their
     * `delayAfter` values: the **last** character in the run fires with the sum of all
     * delays in that run; all preceding ones are silenced.
     *
     * A "run" is any unbroken sequence of characters that each have a `delayAfter`
     * configured. A non-special character (or a React element boundary) breaks the run.
     *
     * | Text | `false` (default) | `true` |
     * |------|-------------------|--------|
     * | `"..."` (`.delayAfter=400`) | last `.` → 400 ms | last `.` → 1 200 ms |
     * | `".!."` (`.`=400, `!`=500) | last `.` → 400 ms | last `.` → 1 300 ms |
     * | `". . ."` | each `.` fires (space breaks) | each `.` fires (space breaks) |
     *
     * @default false
     */
    accumulateConsecutiveDelays?: boolean;
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
