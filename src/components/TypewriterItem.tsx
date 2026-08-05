import { useRevealSlot } from "@/functions/revealSlots";
import type { SpecialCharacterOptions } from "@/interfaces/MarkdownTypewriterProps";
import emojiRegex from "emoji-regex";
import { motion, type Variants } from "motion/react";
import {
    type Key,
    memo,
    type ReactElement,
    type RefObject,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";

// Created once at module level to avoid re-instantiating the regex on every call.
const EMOJI_REGEX = emojiRegex();

// Variants for invisible phantom spans used to consume stagger slots (extra pause).
const PHANTOM_VARIANTS: Variants = { hidden: { opacity: 0 }, visible: { opacity: 0 } };
const PHANTOM_STYLE = { display: "none" as const };

const PENDING_STYLE = { opacity: 0 };

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

/**
 * A single character's reveal, in one of three phases:
 *
 * - `pending` — not due yet. A plain (non-motion) invisible span: cheap, and still occupies
 *   its layout space so the surrounding block doesn't reflow as characters reveal.
 * - `active` — currently (or about to) transition from hidden to visible. A live motion
 *   component; this is the only phase that costs a real Framer Motion instance.
 * - `settled` — its reveal transition already finished and will never animate again, so it's
 *   demoted back to a plain span.
 *
 * When `active` is provided (boolean) the character is purely prop-driven: the block-level
 * scheduler (`SelfDrivenCharSpans`) flips it from `false` to `true` when its turn comes up,
 * via a single shared `requestAnimationFrame` loop rather than each character running its own
 * timer - batching every character due in the same frame into one update instead of many
 * separately-timed ones, which is what made the reveal feel uneven/stuttery (independent
 * `setTimeout`s aren't aligned to the browser's paint cycle the way a single rAF loop is).
 *
 * When `active` is omitted, it falls back to the original behavior: no `initial`/`animate` of
 * its own, inheriting "hidden"/"visible" from an animating ancestor via variant propagation +
 * the ancestor's `staggerChildren` (used by the mixed text+element array path, where a handful
 * of embedded images/links still rely on this).
 *
 * Mounting thousands of these as live motion components simultaneously (the old behavior for
 * every character, self-driven or not) is what made very large documents freeze the page for
 * over a minute — see the "pending" phase above for how that's avoided now.
 */
const CharacterSpan = memo(function CharacterSpan({
    char,
    className,
    characterVariants,
    onCharacterAnimationComplete,
    active,
}: {
    char: string;
    className?: string;
    characterVariants: Variants;
    onCharacterAnimationComplete?: (letterRef: RefObject<HTMLSpanElement | null>) => void;
    active?: boolean;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const [settled, setSettled] = useState(false);

    const onAnimationComplete = useMemo(() => {
        const notifyCaller = onCharacterAnimationComplete
            ? throttle(() => onCharacterAnimationComplete(ref), 10)
            : undefined;
        return () => {
            setSettled(true);
            notifyCaller?.();
        };
    }, [onCharacterAnimationComplete]);

    if (active === false) {
        return (
            <span ref={ref} className={className} style={PENDING_STYLE}>
                {char}
            </span>
        );
    }

    if (settled) {
        return (
            <span ref={ref} className={className}>
                {char}
            </span>
        );
    }

    return (
        <motion.span
            ref={ref}
            className={className}
            variants={characterVariants}
            initial={active !== undefined ? "hidden" : undefined}
            animate={active !== undefined ? "visible" : undefined}
            onAnimationComplete={onAnimationComplete}
        >
            {char}
        </motion.span>
    );
});

/**
 * Pre-computes the effective `delayAfter` for every character in `chars`.
 *
 * **Default mode** (`accumulate = false`):
 * Each special character fires its own `delayAfter` unless the immediately following
 * character is also a special character (consecutive-any rule). The optional
 * `nextCharFromSibling` handles the cross-sibling boundary for the last char.
 *
 * **Accumulate mode** (`accumulate = true`):
 * Any unbroken run of characters that each have a `delayAfter` configured is treated
 * as a single unit: all but the last are silenced, and the last fires with the sum of
 * all delays in the run. Non-special characters (or React-element boundaries) break
 * the run. Cross-sibling accumulation is not performed.
 */
function buildDelayAfterMap(
    chars: string[],
    nextCharFromSibling: string | undefined,
    specialCharacters: { [char: string]: SpecialCharacterOptions } | undefined,
    accumulate: boolean,
): (number | undefined)[] {
    if (!specialCharacters) return chars.map(() => undefined);

    if (accumulate) {
        const result = new Array<number | undefined>(chars.length).fill(undefined);
        let i = 0;
        while (i < chars.length) {
            const delay = specialCharacters[chars[i]]?.delayAfter;
            if (delay !== undefined) {
                let sum = delay;
                let j = i + 1;
                while (j < chars.length) {
                    const d = specialCharacters[chars[j]]?.delayAfter;
                    if (d === undefined) break;
                    sum += d;
                    j++;
                }
                result[j - 1] = sum;
                i = j;
            } else {
                i++;
            }
        }
        return result;
    }

    // Default: fire unless the immediately following char is also a special character.
    return chars.map((char, i) => {
        const delay = specialCharacters[char]?.delayAfter;
        if (delay === undefined) return undefined;
        const next = i < chars.length - 1 ? chars[i + 1] : nextCharFromSibling;
        return next !== undefined && specialCharacters[next]?.delayAfter !== undefined ? undefined : delay;
    });
}

/**
 * Builds the span(s) for a single character, including any phantom stagger-slot spans
 * needed to implement `delay` (before the character) or `delayAfter` (after the character).
 *
 * `delay` — overrides the stagger slot for this character. Phantoms are inserted BEFORE the
 * visible span so the character itself appears after a custom wait. No consecutive rule.
 *
 * `effectiveDelayAfter` — pre-computed by `buildDelayAfterMap`; inserts extra stagger slots
 * AFTER the visible span. `undefined` means no pause for this character.
 *
 * Guard: when `baseDelay === 0` all phantom logic is skipped (no animation, no phantoms).
 *
 * Used only by the mixed text+element array path (see `TypewriterItem` below) - the plain-string
 * path replaces this phantom-slot-counting scheme with `computeRevealSchedule` instead.
 */
function renderCharSpans(
    char: string,
    index: number,
    keyPrefix: string,
    effectiveDelayAfter: number | undefined,
    defaultCharacterVariants: Variants,
    onCharacterAnimationComplete:
        | ((letterRef: RefObject<HTMLSpanElement | null>) => void)
        | undefined,
    className: string | undefined,
    specialCharacters: { [char: string]: SpecialCharacterOptions } | undefined,
    baseDelay: number,
): ReactElement[] {
    const specialConfig = specialCharacters?.[char];

    // Use per-character variants when configured, otherwise fall back to the default.
    const charVariants = specialConfig?.characterVariants ?? defaultCharacterVariants;

    const spans: ReactElement[] = [];

    // `delay` — insert phantom stagger-slot spans BEFORE the character so it appears
    // after a custom wait. No consecutive rule: every occurrence gets its own override.
    if (baseDelay > 0 && specialConfig?.delay !== undefined) {
        const extraMs = specialConfig.delay - baseDelay;
        const phantomCount = Math.max(0, Math.round(extraMs / baseDelay));
        for (let p = 0; p < phantomCount; p++) {
            spans.push(
                <motion.span
                    key={`phantom-b-${keyPrefix}-${char}-${index}-${p}`}
                    variants={PHANTOM_VARIANTS}
                    aria-hidden={true}
                    style={PHANTOM_STYLE}
                />,
            );
        }
    }

    spans.push(
        <CharacterSpan
            key={`span-${keyPrefix}-${char}-${index}`}
            char={char}
            className={className}
            characterVariants={charVariants}
            onCharacterAnimationComplete={onCharacterAnimationComplete}
        />,
    );

    // `delayAfter` — insert phantom stagger-slot spans AFTER the character.
    // The effective value is pre-computed by buildDelayAfterMap.
    if (baseDelay > 0 && effectiveDelayAfter !== undefined) {
        const phantomCount = Math.max(
            0,
            Math.round((effectiveDelayAfter - baseDelay) / baseDelay),
        );
        for (let p = 0; p < phantomCount; p++) {
            spans.push(
                <motion.span
                    key={`phantom-a-${keyPrefix}-${index}-${p}`}
                    variants={PHANTOM_VARIANTS}
                    aria-hidden={true}
                    style={PHANTOM_STYLE}
                />,
            );
        }
    }

    return spans;
}

/**
 * Computes each character's absolute reveal offset (ms, relative to this block's own start),
 * given the same `delay`/`delayAfter`/`accumulateConsecutiveDelays` semantics that
 * `renderCharSpans`'s phantom-slot counting implements for the array path - but expressed
 * directly as a schedule instead of as extra sibling slots for Framer's `staggerChildren` to
 * count. This is what lets each character self-schedule via a plain timer instead of every
 * character needing to be a live, simultaneously-mounted motion component from the start.
 */
function computeRevealSchedule(
    chars: string[],
    delayAfterMap: (number | undefined)[],
    specialCharacters: { [char: string]: SpecialCharacterOptions } | undefined,
    baseDelay: number,
): number[] {
    const result = new Array<number>(chars.length);
    let slot = 0;
    for (let i = 0; i < chars.length; i++) {
        const specialConfig = specialCharacters?.[chars[i]];
        if (baseDelay > 0 && specialConfig?.delay !== undefined) {
            const extraMs = specialConfig.delay - baseDelay;
            slot += Math.max(0, Math.round(extraMs / baseDelay));
        }
        result[i] = slot * baseDelay;
        slot += 1;
        const effectiveDelayAfter = delayAfterMap[i];
        if (baseDelay > 0 && effectiveDelayAfter !== undefined) {
            slot += Math.max(0, Math.round((effectiveDelayAfter - baseDelay) / baseDelay));
        }
    }
    return result;
}

// Characters per chunk for `SelfDrivenCharSpans`'s rendering (see `CharacterChunk`). Large
// enough that the number of chunks (and so the per-frame memo-comparison overhead) stays small
// for huge documents, small enough that the one chunk actively revealing doesn't itself become
// an expensive re-render.
const CHUNK_SIZE = 50;

/**
 * Renders one fixed-size slice of a block's characters. Memoized so that, on every
 * `revealedCount` tick from the parent's rAF loop, only the ONE chunk whose `chunkRevealedCount`
 * actually changed (the chunk currently at the "reveal edge") re-renders its characters - chunks
 * that are already fully settled or not yet started see an unchanged `chunkRevealedCount` and
 * bail out via `memo` instead of re-creating their (unchanging) character elements.
 *
 * Without this, `SelfDrivenCharSpans` re-creates all N character elements on every tick
 * regardless of how many actually changed, which is what caused the very large document case to
 * still show dropped frames even after the rAF batching fix - O(N) work per frame instead of
 * O(chunk size).
 */
const CharacterChunk = memo(function CharacterChunk({
    chars,
    startIndex,
    chunkRevealedCount,
    keyPrefix,
    characterVariants,
    onCharacterAnimationComplete,
    className,
    specialCharacters,
}: {
    chars: string[];
    startIndex: number;
    chunkRevealedCount: number;
    keyPrefix: string;
    characterVariants: Variants;
    onCharacterAnimationComplete?: (letterRef: RefObject<HTMLSpanElement | null>) => void;
    className?: string;
    specialCharacters?: { [char: string]: SpecialCharacterOptions };
}) {
    return (
        <>
            {chars.map((char, i) => (
                <CharacterSpan
                    key={`span-${keyPrefix}-${char}-${startIndex + i}`}
                    char={char}
                    className={className}
                    characterVariants={specialCharacters?.[char]?.characterVariants ?? characterVariants}
                    onCharacterAnimationComplete={onCharacterAnimationComplete}
                    active={i < chunkRevealedCount}
                />
            ))}
        </>
    );
});

/**
 * Renders the plain-string case's characters using the self-driven reveal schedule, claiming
 * this block's slice of the shared cross-block timeline (see `@/functions/revealSlots`) so
 * sibling blocks (e.g. a heading followed by a paragraph) still type out sequentially instead
 * of every block bursting in parallel from the same mount instant.
 *
 * A single `requestAnimationFrame` loop drives every character's reveal instead of each one
 * running its own independent `setTimeout`: on each frame it advances `revealedCount` past every
 * character whose scheduled time has arrived and (if that moved at all) issues ONE state update
 * covering all of them. This ties reveals to the browser's own paint cycle and collapses however
 * many characters come due in the same frame into a single React commit, instead of many
 * separately-timed timers firing at arbitrary, uncoordinated moments - which is what made the
 * reveal feel stuttery despite each individual update being cheap.
 */
function SelfDrivenCharSpans({
    chars,
    delayAfterMap,
    keyPrefix,
    characterVariants,
    onCharacterAnimationComplete,
    className,
    specialCharacters,
    baseDelay,
}: {
    chars: string[];
    delayAfterMap: (number | undefined)[];
    keyPrefix: string;
    characterVariants: Variants;
    onCharacterAnimationComplete?: (letterRef: RefObject<HTMLSpanElement | null>) => void;
    className?: string;
    specialCharacters?: { [char: string]: SpecialCharacterOptions };
    baseDelay: number;
}) {
    const revealSlot = useRevealSlot();
    const localSchedule = useMemo(
        () => computeRevealSchedule(chars, delayAfterMap, specialCharacters, baseDelay),
        [chars, delayAfterMap, specialCharacters, baseDelay],
    );
    const totalDurationMs = (localSchedule.at(-1) ?? 0) + baseDelay;
    const [revealedCount, setRevealedCount] = useState(0);

    // Sliced once (stable references) so unchanged chunks keep the SAME `chars` prop identity
    // across renders - re-slicing on every revealedCount tick would give every chunk a new
    // array reference each time and defeat `CharacterChunk`'s memoization entirely.
    const chunks = useMemo(() => {
        const result: { startIndex: number; chars: string[] }[] = [];
        for (let start = 0; start < chars.length; start += CHUNK_SIZE) {
            result.push({ startIndex: start, chars: chars.slice(start, start + CHUNK_SIZE) });
        }
        return result;
    }, [chars]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: claim + rAF loop must start exactly once per mount
    useLayoutEffect(() => {
        const start = revealSlot ? revealSlot.claim(totalDurationMs) : 0;
        const mountTime = performance.now();
        let revealed = 0;
        let rafId: number;

        function tick() {
            const elapsed = performance.now() - mountTime;
            let next = revealed;
            while (next < chars.length && start + localSchedule[next] <= elapsed) {
                next++;
            }
            if (next !== revealed) {
                revealed = next;
                setRevealedCount(revealed);
            }
            if (revealed < chars.length) {
                rafId = requestAnimationFrame(tick);
            }
        }
        rafId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafId);
            revealSlot?.release(totalDurationMs);
        };
    }, []);

    return (
        <>
            {chunks.map((chunk) => (
                <CharacterChunk
                    key={`chunk-${keyPrefix}-${chunk.startIndex}`}
                    chars={chunk.chars}
                    startIndex={chunk.startIndex}
                    chunkRevealedCount={Math.min(Math.max(revealedCount - chunk.startIndex, 0), chunk.chars.length)}
                    keyPrefix={keyPrefix}
                    characterVariants={characterVariants}
                    onCharacterAnimationComplete={onCharacterAnimationComplete}
                    className={className}
                    specialCharacters={specialCharacters}
                />
            ))}
        </>
    );
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
    accumulateConsecutiveDelays = false,
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
    /** @see MarkdownTypewriterProps.accumulateConsecutiveDelays */
    accumulateConsecutiveDelays?: boolean;
}) {
    if (typeof children === "string") {
        const chars = splitStringToCharactersAndEmoji(children);
        const delayAfterMap = buildDelayAfterMap(chars, undefined, specialCharacters, accumulateConsecutiveDelays);
        return dadElement(
            <SelfDrivenCharSpans
                key={String(key ?? "")}
                chars={chars}
                delayAfterMap={delayAfterMap}
                keyPrefix={String(key ?? "")}
                characterVariants={characterVariants}
                onCharacterAnimationComplete={onCharacterAnimationComplete}
                className={className}
                specialCharacters={specialCharacters}
                baseDelay={delay}
            />,
            true,
        );
    } else if (Array.isArray(children)) {
        const childArray = children as unknown[];
        const list = childArray.map((child, childIdx) => {
            if (typeof child === "string") {
                const chars = splitStringToCharactersAndEmoji(child);
                // In default mode, pass the first char of the next string sibling so the
                // consecutive-same rule works across sibling boundaries.
                // In accumulate mode, cross-sibling accumulation is not performed.
                let nextCharFromSibling: string | undefined;
                if (!accumulateConsecutiveDelays) {
                    const nextSibling = childArray[childIdx + 1];
                    if (typeof nextSibling === "string") {
                        const sibChars = splitStringToCharactersAndEmoji(nextSibling);
                        nextCharFromSibling = sibChars[0];
                    }
                }
                const delayAfterMap = buildDelayAfterMap(chars, nextCharFromSibling, specialCharacters, accumulateConsecutiveDelays);
                return chars.flatMap((char, i) =>
                    renderCharSpans(
                        char,
                        i,
                        `${key}-${childIdx}`,
                        delayAfterMap[i],
                        characterVariants,
                        onCharacterAnimationComplete,
                        className,
                        specialCharacters,
                        delay,
                    ),
                );
            }
            return child as ReactElement;
        });
        return dadElement(list as ReactElement[], false);
    }
    return dadElement(children as ReactElement, true);
}
