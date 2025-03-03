import { HTMLMotionProps, Variants } from "motion/react";
import { RefObject } from "react";
import { Options } from "react-markdown";

export default interface MarkdownTypewriterProps extends Omit<Options, "components"> {
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
    };
    /**
     * The reference to the element that will be scrolled when the text exceeds the height of the container.
     *
     * @example
     * ```tsx
     * import { useRef } from "react";
     * import MarkdownTypewriter from "../components/Typewriter";
     *
     * export default function NarrationScreen() {
     *     const paragraphRef = useRef<HTMLDivElement>(null);
     *     return (
     *         <div ref={paragraphRef}>
     *             <MarkdownTypewriter
     *                 scrollRef={paragraphRef}
     *             >
     *                 Hello World
     *             </MarkdownTypewriter>
     *         </div>
     *     );
     * }
     * ```
     */
    scrollRef?: RefObject<HTMLDivElement | null>;
}
