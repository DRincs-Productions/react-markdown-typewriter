import TypewriterItem from "@/components/TypewriterItem";
import type { SpecialCharacterOptions } from "@/interfaces/MarkdownTypewriterProps";
import htmlTags from "html-tags";
import {
    type ForwardRefComponent,
    type HTMLMotionProps,
    motion,
    type Variants,
} from "motion/react";
import type { ClassAttributes, ElementType, HTMLAttributes, RefObject } from "react";
import type { Components, ExtraProps } from "react-markdown";

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
}): Components {
    const res: Components = {};
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
                        HTMLAttributes<HTMLHeadingElement> &
                        ExtraProps
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
                        case "tr":
                        case "th":
                        case "td":
                            return (
                                <MotionComponent {...componentProps}>{children}</MotionComponent>
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
                                    dadElement={(children) => {
                                        if (Array.isArray(children)) {
                                            return (
                                                <MotionComponent
                                                    {...componentProps}
                                                    key={`${tag}-${id}`}
                                                >
                                                    {children}
                                                </MotionComponent>
                                            );
                                        }
                                        return children;
                                    }}
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
