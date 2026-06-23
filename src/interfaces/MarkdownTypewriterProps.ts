import type { HTMLMotionProps, Variants } from "motion/react";
import type { RefObject } from "react";
import type { HooksOptions, Options } from "react-markdown";

interface TypewriterProps {
    /**
     * The delay in milliseconds between the appearance of one letter and the next.
     * @default 10
     */
    delay?: number;
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
