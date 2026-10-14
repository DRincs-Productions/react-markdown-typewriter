import { MarkdownTypewriter as ReactMarkdownTypewriter } from "@/react";

export * from "@/core";
export type { MarkdownTypewriterProps, SpecialCharacterOptions } from "@/react";

/**
 * @deprecated Import it from `markdown-typewriter/react` instead. The package root also
 * re-exports the framework-agnostic `markdown-typewriter/core`; this export is kept for
 * compatibility with 2.0.
 */
export const MarkdownTypewriter = ReactMarkdownTypewriter;
