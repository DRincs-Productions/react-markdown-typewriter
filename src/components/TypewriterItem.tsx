import type { SpecialCharacterOptions } from "@/interfaces/MarkdownTypewriterProps";
import emojiRegex from "emoji-regex";
import { motion, type Variants } from "motion/react";
import { type Key, type ReactElement, type RefObject, useMemo, useRef } from "react";

// Created once at module level to avoid re-instantiating the regex on every call.
const EMOJI_REGEX = emojiRegex();

// Variants for invisible phantom spans used to consume stagger slots (extra pause).
const PHANTOM_VARIANTS: Variants = { hidden: { opacity: 0 }, visible: { opacity: 0 } };
const PHANTOM_STYLE = { display: "none" as const };

function throttle(func: (...args: unknown[]) => void, limit: number) {
    let lastCall = 0;
    return (...args: unknown[]) => {
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
        () =>
            onCharacterAnimationComplete
                ? throttle(() => onCharacterAnimationComplete(ref), 10)
                : undefined,
        [onCharacterAnimationComplete],
    );

    return (
        <motion.span
            ref={ref}
            className={className}
            variants={characterVariants}
            onAnimationComplete={onAnimationComplete}
        >
            {char}
        </motion.span>
    );
}

/**
 * Builds the span(s) for a single character.
 *
 * When the character is a special character whose delay should apply (i.e. it is not
 * immediately followed by another special character), invisible phantom `motion.span`
 * elements are appended after it. These phantoms consume stagger slots in the parent
 * `staggerChildren` orchestration, effectively creating the extra pause before the next
 * visible character appears.
 */
function renderCharSpans(
    char: string,
    index: number,
    keyPrefix: string,
    nextChar: string | undefined,
    defaultCharacterVariants: Variants,
    onCharacterAnimationComplete: ((letterRef: RefObject<HTMLSpanElement | null>) => void) | undefined,
    className: string | undefined,
    specialCharacters: { [char: string]: SpecialCharacterOptions } | undefined,
    baseDelay: number,
): ReactElement[] {
    const specialConfig = specialCharacters?.[char];
    const nextIsSpecial = nextChar !== undefined && specialCharacters?.[nextChar] !== undefined;

    // Use per-character variants when configured, otherwise fall back to the default.
    const charVariants = specialConfig?.characterVariants ?? defaultCharacterVariants;

    const spans: ReactElement[] = [
        <CharacterSpan
            key={`span-${keyPrefix}-${char}-${index}`}
            char={char}
            className={className}
            characterVariants={charVariants}
            onCharacterAnimationComplete={onCharacterAnimationComplete}
        />,
    ];

    // Insert phantom stagger-slot spans to simulate a longer pause after a special character.
    // Phantoms are only added when:
    //   • this character has a configured delay, AND
    //   • it is not directly followed by another special character
    //     (consecutive special chars only pause after the last one in the sequence).
    if (specialConfig?.delay !== undefined && !nextIsSpecial) {
        const extraMs = specialConfig.delay - baseDelay;
        const phantomCount = Math.max(0, Math.round(extraMs / baseDelay));
        for (let p = 0; p < phantomCount; p++) {
            spans.push(
                <motion.span
                    key={`phantom-${keyPrefix}-${char}-${index}-${p}`}
                    variants={PHANTOM_VARIANTS}
                    aria-hidden={true}
                    style={PHANTOM_STYLE}
                />,
            );
        }
    }

    return spans;
}

export default function TypewriterItem({
    children,
    className,
    characterVariants,
    dadElement,
    onCharacterAnimationComplete,
    key,
    specialCharacters,
    delay = 10,
}: {
    children: unknown;
    className?: string;
    characterVariants: Variants;
    dadElement: (
        children: ReactElement | ReactElement[],
        isString?: boolean,
    ) => ReactElement | ReactElement[];
    onCharacterAnimationComplete?: (letterRef: RefObject<HTMLSpanElement | null>) => void;
    key?: Key | null | undefined;
    /** @see MarkdownTypewriterProps.specialCharacters */
    specialCharacters?: { [char: string]: SpecialCharacterOptions };
    /** Base delay in ms — needed to compute phantom span counts. */
    delay?: number;
}) {
    if (typeof children === "string") {
        const chars = splitStringToCharactersAndEmoji(children);
        const spanList = chars.flatMap((char, i) =>
            renderCharSpans(
                char,
                i,
                String(key ?? ""),
                chars[i + 1],
                characterVariants,
                onCharacterAnimationComplete,
                className,
                specialCharacters,
                delay,
            ),
        );
        return dadElement(spanList, true);
    } else if (Array.isArray(children)) {
        const childArray = children as unknown[];
        const list = childArray.map((child, childIdx) => {
            if (typeof child === "string") {
                const chars = splitStringToCharactersAndEmoji(child);
                return chars.flatMap((char, i) => {
                    let nextChar: string | undefined;
                    if (i < chars.length - 1) {
                        nextChar = chars[i + 1];
                    } else {
                        // Last char of this string — check the immediate next sibling to detect
                        // consecutive special characters across sibling boundaries.
                        // A React element between strings acts as a boundary (nextChar stays undefined).
                        const nextSibling = childArray[childIdx + 1];
                        if (typeof nextSibling === "string") {
                            const sibChars = splitStringToCharactersAndEmoji(nextSibling);
                            nextChar = sibChars[0];
                        }
                    }
                    return renderCharSpans(
                        char,
                        i,
                        `${key}-${childIdx}`,
                        nextChar,
                        characterVariants,
                        onCharacterAnimationComplete,
                        className,
                        specialCharacters,
                        delay,
                    );
                });
            }
            return child as ReactElement;
        });
        return dadElement(list as ReactElement[], false);
    }
    return dadElement(children as ReactElement, true);
}
