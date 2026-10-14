/**
 * Framework-agnostic part of markdown-typewriter: @tanstack/markdown extensions and the
 * typewriter timing rules. It imports neither React nor motion.
 */
import { entityDecoderExtension } from "@/core/entities";
import { htmlExtension } from "@/core/html";
import type { MarkdownExtension } from "@tanstack/markdown";

export {
    createTypewriterSchedule,
    type SpecialCharacterTiming,
    splitStringToCharactersAndEmoji as splitCharacters,
    type TypewriterSchedule,
    type TypewriterScheduleOptions,
} from "@/core/characters";
export { decodeEntities, entityDecoderExtension } from "@/core/entities";
export { htmlExtension, tokenizeHtml } from "@/core/html";

/**
 * The @tanstack/markdown extensions `MarkdownTypewriter` parses with, for using the same Markdown
 * dialect elsewhere (e.g. `renderHtml(text, { allowHtml: true, extensions: typewriterExtensions({ allowHtml: true }) })`).
 *
 * - `entityDecoderExtension` - decodes `&nbsp;`, `&amp;`, `&#8230;`...
 * - `htmlExtension` (only with `allowHtml`) - rebuilds raw HTML into sanitized elements.
 */
export function typewriterExtensions({
    allowHtml = false,
}: {
    allowHtml?: boolean;
} = {}): MarkdownExtension[] {
    return allowHtml ? [entityDecoderExtension, htmlExtension] : [entityDecoderExtension];
}
