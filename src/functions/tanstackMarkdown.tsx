import type { InlineNode, MarkdownExtension } from "@tanstack/markdown";
import { type MarkdownReactOptions, renderMarkdownReact } from "@tanstack/markdown/react";
import { type ComponentType, Fragment, type ReactNode, useMemo } from "react";

export type MarkdownComponentMap = Record<string, string | ComponentType<any> | undefined>;

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

function decodeEntities(value: string): string {
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
const entityDecoderExtension: MarkdownExtension = {
    name: "react-markdown-typewriter:decode-entities",
    transformInline: (nodes) => decodeInlineEntities(nodes),
};

/**
 * TanStack's React renderer always passes inline content to a component as an array (even a
 * single text node becomes `["text"]`), while react-markdown passes a lone string as a string.
 * `TypewriterItem` relies on that distinction (plain string -> self-driven per-character reveal,
 * array -> mixed text+element block), so flatten nested arrays, merge adjacent strings and
 * unwrap single children to get the same shape react-markdown produces.
 */
function normalizeChildren(children: ReactNode): ReactNode {
    if (!Array.isArray(children)) return children;
    const result: ReactNode[] = [];
    const push = (child: ReactNode) => {
        if (Array.isArray(child)) {
            child.forEach(push);
            return;
        }
        if (
            child === null ||
            child === undefined ||
            child === false ||
            child === true ||
            child === ""
        ) {
            return;
        }
        if (typeof child === "number") child = String(child);
        const last = result[result.length - 1];
        if (typeof child === "string" && typeof last === "string") {
            result[result.length - 1] = last + child;
            return;
        }
        result.push(child);
    };
    children.forEach(push);
    if (result.length === 0) return undefined;
    if (result.length === 1) return result[0];
    return result;
}

function wrapComponents(components: MarkdownComponentMap): MarkdownComponentMap {
    const wrapped: MarkdownComponentMap = {};
    for (const [tag, Component] of Object.entries(components)) {
        if (!Component || typeof Component === "string") {
            wrapped[tag] = Component;
            continue;
        }
        const Wrapped = (props: { children?: ReactNode }) => (
            <Component {...props}>{normalizeChildren(props.children)}</Component>
        );
        Wrapped.displayName = `Normalized(${tag})`;
        wrapped[tag] = Wrapped;
    }
    return wrapped;
}

export interface MarkdownRendererOptions extends Omit<MarkdownReactOptions, "components"> {
    components?: MarkdownComponentMap;
}

/**
 * Renders `text` with TanStack Markdown, adapting its output to the shape the typewriter
 * components expect (see `normalizeChildren`/`entityDecoderExtension`).
 */
export function MarkdownRenderer({
    children,
    components,
    extensions,
    ...options
}: MarkdownRendererOptions & { children: string }) {
    const wrappedComponents = useMemo(
        () => (components ? wrapComponents(components) : undefined),
        [components],
    );
    const mergedExtensions = useMemo(
        () => [...(extensions ?? []), entityDecoderExtension],
        [extensions],
    );
    const blocks = renderMarkdownReact(children, {
        ...options,
        extensions: mergedExtensions,
        components: wrappedComponents,
    });
    // react-markdown separates top-level blocks with a "\n" text node (rendered as a space),
    // TanStack Markdown doesn't: without it consecutive paragraphs would run together.
    return (
        <>
            {Array.isArray(blocks)
                ? blocks.map((block, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: blocks are positional
                      <Fragment key={index}>
                          {index > 0 && "\n"}
                          {block}
                      </Fragment>
                  ))
                : blocks}
        </>
    );
}
