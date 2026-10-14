import type { InlineNode, MarkdownExtension } from "@tanstack/markdown";

const NAMED_ENTITIES: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    hellip: "…",
    mdash: "—",
    ndash: "–",
    lsquo: "‘",
    rsquo: "’",
    ldquo: "“",
    rdquo: "”",
    laquo: "«",
    raquo: "»",
    copy: "©",
    reg: "®",
    trade: "™",
    shy: "­",
    zwj: "‍",
    zwnj: "‌",
};

const ENTITY_REGEX = /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;

/** Decodes HTML character references (named, decimal and hexadecimal) in a string. */
export function decodeEntities(value: string): string {
    if (!value.includes("&")) return value;
    return value.replace(ENTITY_REGEX, (match, body: string) => {
        if (body[0] === "#") {
            const code =
                body[1] === "x" || body[1] === "X"
                    ? Number.parseInt(body.slice(2), 16)
                    : Number.parseInt(body.slice(1), 10);
            return Number.isFinite(code) && code > 0 && code <= 0x10ffff
                ? String.fromCodePoint(code)
                : match;
        }
        return NAMED_ENTITIES[body] ?? match;
    });
}

function decodeInlineEntities(nodes: InlineNode[]): InlineNode[] {
    return nodes.map((node) => {
        if (node.type === "text") {
            return { ...node, value: decodeEntities(node.value) };
        }
        if ("children" in node && Array.isArray(node.children)) {
            return { ...node, children: decodeInlineEntities(node.children) } as InlineNode;
        }
        return node;
    });
}

/**
 * TanStack Markdown leaves character references (`&nbsp;`, `&amp;`, `&#8230;`, ...) as literal
 * text, while react-markdown (CommonMark) decodes them. Decode them in text nodes so existing
 * content keeps rendering the same characters.
 */
export const entityDecoderExtension: MarkdownExtension = {
    name: "markdown-typewriter:decode-entities",
    transformInline: (nodes) => decodeInlineEntities(nodes),
};
