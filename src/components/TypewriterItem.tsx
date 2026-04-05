import emojiRegex from "emoji-regex";
import { motion, Variants } from "motion/react";
import { Key, ReactElement, RefObject, useMemo, useRef } from "react";

// Created once at module level to avoid re-instantiating the regex on every call.
const EMOJI_REGEX = emojiRegex();

function throttle(func: (...args: any[]) => void, limit: number) {
    let lastCall = 0;
    return (...args: any[]) => {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            func(...args);
        }
    };
}

/**
 * Splits a string into an array of characters, preserving emojis as single elements.
 *
 * For example:
 *
 * - "Hello" -> ["H", "e", "l", "l", "o"]
 * - "Hello 😊" -> ["H", "e", "l", "l", "o", " ", "😊"]
 * @param str The input string to split.
 * @returns An array of characters and emojis.
 */
function splitStringToCharactersAndEmoji(str: string): string[] {
    const result: string[] = [];
    let lastIndex = 0;

    str.replace(EMOJI_REGEX, (match, offset) => {
        if (offset > lastIndex) {
            result.push(...str.slice(lastIndex, offset).split(""));
        }
        result.push(match);
        lastIndex = offset + match.length;
        return match;
    });

    if (lastIndex < str.length) {
        result.push(...str.slice(lastIndex).split(""));
    }

    return result;
}

function CharacterSpan({
    char,
    className,
    characterVariants,
    onCharacterAnimationComplete,
}: {
    char: string;
    className?: string;
    characterVariants: Variants;
    onCharacterAnimationComplete?: (letterRef: RefObject<HTMLSpanElement | null>) => void;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const onAnimationComplete = useMemo(
        () => (onCharacterAnimationComplete ? throttle(() => onCharacterAnimationComplete(ref), 10) : undefined),
        [onCharacterAnimationComplete]
    );

    return (
        <motion.span ref={ref} className={className} variants={characterVariants} onAnimationComplete={onAnimationComplete}>
            {char}
        </motion.span>
    );
}

export default function TypewriterItem({
    children,
    className,
    characterVariants,
    dadElement,
    onCharacterAnimationComplete,
    key,
}: {
    children: any;
    className?: string;
    characterVariants: Variants;
    dadElement: (children: ReactElement | ReactElement[], isString?: boolean) => ReactElement | ReactElement[];
    onCharacterAnimationComplete?: (letterRef: RefObject<HTMLSpanElement | null>) => void;
    key?: Key | null | undefined;
}) {
    if (typeof children === "string") {
        const spanList = splitStringToCharactersAndEmoji(children).map((char, i) => (
            <CharacterSpan
                key={`span-${key}-${char}-${i}`}
                char={char}
                className={className}
                characterVariants={characterVariants}
                onCharacterAnimationComplete={onCharacterAnimationComplete}
            />
        ));
        return dadElement(spanList, true);
    } else if (Array.isArray(children)) {
        const list = children.map((child) => {
            if (typeof child === "string") {
                return splitStringToCharactersAndEmoji(child).map((char, i) => (
                    <CharacterSpan
                        key={`span-${key}-${char}-${i}`}
                        char={char}
                        className={className}
                        characterVariants={characterVariants}
                        onCharacterAnimationComplete={onCharacterAnimationComplete}
                    />
                ));
            }
            return child;
        });
        return dadElement(list);
    }
    return dadElement(children, true);
}
