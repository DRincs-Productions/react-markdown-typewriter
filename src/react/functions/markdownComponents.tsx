import TypewriterItem from "@/react/components/TypewriterItem";
import type { SpecialCharacterOptions } from "@/react/interfaces/MarkdownTypewriterProps";
import htmlTags from "html-tags";
import {
    type ForwardRefComponent,
    type HTMLMotionProps,
    motion,
    type Variants,
} from "motion/react";
import type { MarkdownComponentMap } from "@/react/functions/tanstackMarkdown";
import type { ClassAttributes, ElementType, HTMLAttributes, RefObject } from "react";

export default function markdownComponents({
    characterVariants,
    onCharacterAnimationComplete,
    delay,
    specialCharacters,
    accumulateConsecutiveDelays,
}: {
    characterVariants: Variants;
    onCharacterAnimationComplete?: (letterRef: RefObject<HTMLSpanElement | null>) => void;
    delay: number;
    specialCharacters?: { [char: string]: SpecialCharacterOptions };
    accumulateConsecutiveDelays?: boolean;
}): MarkdownComponentMap {
    const res: MarkdownComponentMap = {};
    const sentenceVariants = {
        hidden: characterVariants.hidden,
        visible: {
            ...characterVariants.visible,
            opacity: 1,
            transition: { staggerChildren: delay / 1000 },
        },
    };
    htmlTags.forEach((tag) => {
        try {
            const MotionComponent: ForwardRefComponent<HTMLHeadingElement, HTMLMotionProps<any>> = (
                motion as any
            )[tag];
            if (MotionComponent) {
                const fn: ElementType<
                    ClassAttributes<HTMLHeadingElement> &
                        HTMLAttributes<HTMLHeadingElement> & { node?: unknown }
                > = (props) => {
                    const { children, id, className } = props;
                    const { node, ...componentProps } = props;
                    switch (tag) {
                        case "table":
                        case "input":
                        case "hr":
                        case "img":
                            return (
                                <MotionComponent
                                    {...componentProps}
                                    key={`${tag}-${id}`}
                                    variants={className ? undefined : sentenceVariants}
                                    onAnimationComplete={onCharacterAnimationComplete}
                                >
                                    {children}
                                </MotionComponent>
                            );
                        // Void elements: no children allowed, nothing to type out.
                        case "br":
                        case "wbr":
                            return <MotionComponent {...componentProps} key={`${tag}-${id}`} />;
                        case "tr":
                            return (
                                <MotionComponent {...componentProps}>{children}</MotionComponent>
                            );
                        case "th":
                        case "td":
                            return (
                                <TypewriterItem
                                    key={id}
                                    characterVariants={characterVariants}
                                    onCharacterAnimationComplete={onCharacterAnimationComplete}
                                    specialCharacters={specialCharacters}
                                    accumulateConsecutiveDelays={accumulateConsecutiveDelays}
                                    delay={delay}
                                    dadElement={(children) => (
                                        <MotionComponent {...componentProps} key={`${tag}-${id}`}>
                                            {children}
                                        </MotionComponent>
                                    )}
                                >
                                    {children}
                                </TypewriterItem>
                            );
                        case "p":
                            return (
                                <TypewriterItem
                                    key={id}
                                    characterVariants={characterVariants}
                                    onCharacterAnimationComplete={onCharacterAnimationComplete}
                                    specialCharacters={specialCharacters}
                                    accumulateConsecutiveDelays={accumulateConsecutiveDelays}
                                    delay={delay}
                                    dadElement={(children) => {
                                        if (Array.isArray(children)) {
                                            children.push(
                                                <motion.span
                                                    key={`span-${id}-newline`}
                                                    style={{
                                                        display: "block",
                                                        height: 0,
                                                        width: 0,
                                                    }}
                                                />,
                                            );
                                            return children;
                                        }
                                        return children;
                                    }}
                                >
                                    {children}
                                </TypewriterItem>
                            );
                        case "span":
                            return (
                                <TypewriterItem
                                    key={id}
                                    characterVariants={characterVariants}
                                    onCharacterAnimationComplete={onCharacterAnimationComplete}
                                    specialCharacters={specialCharacters}
                                    accumulateConsecutiveDelays={accumulateConsecutiveDelays}
                                    delay={delay}
                                    // Always keep the span itself (not just its content), so its
                                    // attributes - e.g. the `style` of a raw HTML
                                    // `<span style="color:blue">` - still apply.
                                    dadElement={(children) => (
                                        <MotionComponent {...componentProps} key={`${tag}-${id}`}>
                                            {children}
                                        </MotionComponent>
                                    )}
                                >
                                    {children}
                                </TypewriterItem>
                            );
                        default:
                            return (
                                <TypewriterItem
                                    key={id}
                                    characterVariants={characterVariants}
                                    onCharacterAnimationComplete={onCharacterAnimationComplete}
                                    specialCharacters={specialCharacters}
                                    accumulateConsecutiveDelays={accumulateConsecutiveDelays}
                                    delay={delay}
                                    // thead/tbody/tfoot are pure structural containers (their
                                    // direct children must be <tr>, nothing else fits validly) -
                                    // gating a lone <tr> would insert a <span> where only a <tr>
                                    // is allowed, corrupting the table. They render no text of
                                    // their own, so skipping the gate here doesn't reintroduce any
                                    // visible premature reveal - each cell is already gated
                                    // independently by the td/th case's own TypewriterItem call.
                                    disableSoloElementGate={
                                        tag === "thead" || tag === "tbody" || tag === "tfoot"
                                    }
                                    dadElement={(children, isString) => {
                                        return (
                                            <MotionComponent
                                                {...componentProps}
                                                key={`${tag}-${id}`}
                                                variants={
                                                    isString || className
                                                        ? undefined
                                                        : sentenceVariants
                                                }
                                            >
                                                {children}
                                            </MotionComponent>
                                        );
                                    }}
                                >
                                    {children}
                                </TypewriterItem>
                            );
                    }
                };
                (res as any)[tag] = fn;
            }
        } catch (_) {}
    });
    return res;
}
