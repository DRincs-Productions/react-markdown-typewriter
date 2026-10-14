import emojiRegex from "emoji-regex";

/**
 * Timing overrides for a single special character (e.g. punctuation), independent of any
 * rendering framework. See the React `SpecialCharacterOptions`, which adds per-character
 * animation variants on top of these.
 */
export interface SpecialCharacterTiming {
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
}

// Created once at module level to avoid re-instantiating the regex on every call.
const EMOJI_REGEX = emojiRegex();

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
export function splitStringToCharactersAndEmoji(str: string): string[] {
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
export function buildDelayAfterMap(
    chars: string[],
    nextCharFromSibling: string | undefined,
    specialCharacters: { [char: string]: SpecialCharacterTiming } | undefined,
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
        return next !== undefined && specialCharacters[next]?.delayAfter !== undefined
            ? undefined
            : delay;
    });
}

/**
 * Computes each character's absolute reveal offset (ms, relative to this block's own start),
 * given the same `delay`/`delayAfter`/`accumulateConsecutiveDelays` semantics that
 * `renderCharSpans`'s phantom-slot counting implements for the array path - but expressed
 * directly as a schedule instead of as extra sibling slots for Framer's `staggerChildren` to
 * count. This is what lets each character self-schedule via a plain timer instead of every
 * character needing to be a live, simultaneously-mounted motion component from the start.
 */
export function computeRevealSchedule(
    chars: string[],
    delayAfterMap: (number | undefined)[],
    specialCharacters: { [char: string]: SpecialCharacterTiming } | undefined,
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

/** Options shared by the slot-counting helpers (`countStringSlots` and the React estimators). */
export interface SlotOptions {
    specialCharacters: { [char: string]: SpecialCharacterTiming } | undefined;
    accumulate: boolean;
    baseDelay: number;
}

/**
 * Counts the stagger slots a run of characters occupies in the old (phantom-span) mechanism:
 * one per visible character plus every phantom `renderCharSpans` inserts for `delay`/`delayAfter`.
 * Ignoring the phantoms made punctuation-heavy mixed paragraphs reserve far less time than they
 * actually take, so the predicted end of the reveal (and the caller's `onAnimationComplete`)
 * fired while the text was still typing.
 */
export function countStringSlots(
    str: string,
    nextCharFromSibling: string | undefined,
    { specialCharacters, accumulate, baseDelay }: SlotOptions,
): number {
    const chars = splitStringToCharactersAndEmoji(str);
    if (!specialCharacters || baseDelay <= 0) return chars.length;
    const delayAfterMap = buildDelayAfterMap(
        chars,
        nextCharFromSibling,
        specialCharacters,
        accumulate,
    );
    let slots = 0;
    for (let i = 0; i < chars.length; i++) {
        const specialConfig = specialCharacters[chars[i]];
        if (specialConfig?.delay !== undefined) {
            slots += Math.max(0, Math.round((specialConfig.delay - baseDelay) / baseDelay));
        }
        slots += 1;
        const effectiveDelayAfter = delayAfterMap[i];
        if (effectiveDelayAfter !== undefined) {
            slots += Math.max(0, Math.round((effectiveDelayAfter - baseDelay) / baseDelay));
        }
    }
    return slots;
}

export interface TypewriterScheduleOptions {
    /**
     * The delay in milliseconds between the appearance of one character and the next.
     * @default 10
     */
    delay?: number;
    /** Per-character timing overrides (e.g. a pause after punctuation). */
    specialCharacters?: { [char: string]: SpecialCharacterTiming };
    /**
     * Sum the `delayAfter` of consecutive special characters into a single pause after the last one.
     * @default false
     */
    accumulateConsecutiveDelays?: boolean;
}

export interface TypewriterSchedule {
    /** Every character (emoji kept whole) with the time, in ms from the start, it should appear at. */
    characters: { char: string; at: number }[];
    /** When the last character has appeared, in ms from the start. */
    durationMs: number;
}

/**
 * Computes when each character of a plain string should appear, with the same rules
 * (`delay`, `specialCharacters`, `accumulateConsecutiveDelays`) as the React component - for
 * driving a typewriter effect without React.
 *
 * @example
 * const { characters } = createTypewriterSchedule("Hello, world.", {
 *     delay: 30,
 *     specialCharacters: { ",": { delayAfter: 150 } },
 * });
 * for (const { char, at } of characters) setTimeout(() => output.append(char), at);
 */
export function createTypewriterSchedule(
    text: string,
    {
        delay = 10,
        specialCharacters,
        accumulateConsecutiveDelays = false,
    }: TypewriterScheduleOptions = {},
): TypewriterSchedule {
    const chars = splitStringToCharactersAndEmoji(text);
    const delayAfterMap = buildDelayAfterMap(
        chars,
        undefined,
        specialCharacters,
        accumulateConsecutiveDelays,
    );
    const times = computeRevealSchedule(chars, delayAfterMap, specialCharacters, delay);
    return {
        characters: chars.map((char, index) => ({ char, at: times[index] })),
        durationMs: chars.length ? times[times.length - 1] + delay : 0,
    };
}
