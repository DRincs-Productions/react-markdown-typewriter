import type {
    BlockNode,
    ComponentNode,
    InlineComponentNode,
    InlineNode,
    MarkdownDocument,
    MarkdownExtension,
    ParseOptions,
} from "@tanstack/markdown";
import { parseMarkdown } from "@tanstack/markdown/parser";

/**
 * Raw HTML support that keeps the typewriter animation.
 *
 * With `allowHtml`, TanStack Markdown keeps raw HTML as `inlineHtml`/`html` nodes holding the
 * markup as a string, and its React renderer injects them with `dangerouslySetInnerHTML` - so
 * nothing inside them could be typed out character by character. This extension rebuilds that
 * markup into `inlineComponent`/`component` nodes (real elements with their attributes and
 * markdown children), which the React renderer emits through the same tag -> component map as
 * every other element, so their text animates like the rest of the document and their
 * attributes (e.g. `style="color:blue"`) still apply.
 *
 * The rebuilt nodes keep plain HTML attributes in `properties`, so the result also works with
 * `@tanstack/markdown/html`'s `renderHtml` (as sanitized HTML). The React renderer converts them
 * into React props (`class` -> `className`, `style` string -> object) before rendering.
 *
 * Elements are built as React elements, never injected as HTML strings: `<script>`/`<style>`
 * and similar tags are dropped (with their content), as are `on*` event handler attributes and
 * `javascript:`/`vbscript:`/non-image `data:` URLs.
 */

interface OpenTagToken {
    type: "open";
    tag: string;
    attributes: Record<string, string>;
    selfClosing: boolean;
}
interface CloseTagToken {
    type: "close";
    tag: string;
}
interface TextToken {
    type: "text";
    value: string;
}
type HtmlToken = OpenTagToken | CloseTagToken | TextToken;

const VOID_TAGS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "source",
    "track",
    "wbr",
]);

/** Dropped together with everything between their opening and closing tag. */
const DROPPED_WITH_CONTENT_TAGS = new Set([
    "script",
    "style",
    "noscript",
    "template",
    "textarea",
    "title",
    "iframe",
    "object",
]);

/** Dropped on their own (their content, if any, is kept). */
const DROPPED_TAGS = new Set([
    "html",
    "head",
    "body",
    "base",
    "link",
    "meta",
    "frame",
    "frameset",
    "embed",
]);

const URL_ATTRIBUTES = new Set([
    "href",
    "src",
    "action",
    "formaction",
    "xlink:href",
    "poster",
    "cite",
]);

const ATTRIBUTE_REGEX = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const TAG_REGEX =
    /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/y;

function decodeAttribute(value: string): string {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&");
}

function isSafeUrl(value: string): boolean {
    // Strip whitespace/control characters browsers ignore inside a scheme (e.g. "java\tscript:").
    const normalized = value.replace(/[\u0000- ]/g, "").toLowerCase();
    if (normalized.startsWith("javascript:") || normalized.startsWith("vbscript:")) return false;
    if (normalized.startsWith("data:")) return normalized.startsWith("data:image/");
    return true;
}

function parseAttributes(source: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    for (const match of source.matchAll(ATTRIBUTE_REGEX)) {
        const name = match[1].toLowerCase();
        const value = decodeAttribute(match[2] ?? match[3] ?? match[4] ?? "");
        if (name.startsWith("on")) continue;
        if (URL_ATTRIBUTES.has(name) && !isSafeUrl(value)) continue;
        attributes[name] = value;
    }
    return attributes;
}

/** Splits raw HTML into tags and text. Comments, doctypes and processing instructions are dropped. */
export function tokenizeHtml(html: string): HtmlToken[] {
    const tokens: HtmlToken[] = [];
    let index = 0;
    let text = "";
    const flushText = () => {
        if (text) tokens.push({ type: "text", value: text });
        text = "";
    };
    while (index < html.length) {
        const lt = html.indexOf("<", index);
        if (lt === -1) {
            text += html.slice(index);
            break;
        }
        text += html.slice(index, lt);
        if (html.startsWith("<!--", lt)) {
            const end = html.indexOf("-->", lt + 4);
            flushText();
            index = end === -1 ? html.length : end + 3;
            continue;
        }
        if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) {
            const end = html.indexOf(">", lt);
            flushText();
            index = end === -1 ? html.length : end + 1;
            continue;
        }
        TAG_REGEX.lastIndex = lt;
        const match = TAG_REGEX.exec(html);
        if (!match) {
            text += "<";
            index = lt + 1;
            continue;
        }
        flushText();
        const tag = match[1].toLowerCase();
        if (match[0][1] === "/") {
            tokens.push({ type: "close", tag });
        } else {
            tokens.push({
                type: "open",
                tag,
                attributes: parseAttributes(match[2]),
                selfClosing: match[3] === "/" || VOID_TAGS.has(tag),
            });
        }
        index = lt + match[0].length;
    }
    flushText();
    return tokens;
}

interface OpenElement<TChild> {
    tag: string;
    attributes: Record<string, string>;
    children: TChild[];
}

/**
 * Turns a flat run of nodes - where some nodes stand for HTML tags - into a tree, pairing each
 * opening tag with its closing tag. Unclosed elements are closed at the end of the run; a closing
 * tag without a matching opening tag is ignored.
 */
function buildTree<TNode, TChild>({
    nodes,
    tokensOf,
    textOf,
    convert,
    element,
}: {
    nodes: TNode[];
    /** Tag tokens for an HTML node, or `undefined` for any other node. */
    tokensOf: (node: TNode) => HtmlToken[] | undefined;
    /** Child nodes for the text between tags inside an HTML node. */
    textOf: (value: string) => TChild[];
    /** Non-HTML nodes, converted recursively. */
    convert: (node: TNode) => TChild;
    element: (tag: string, attributes: Record<string, string>, children: TChild[]) => TChild;
}): TChild[] {
    const root: TChild[] = [];
    const stack: OpenElement<TChild>[] = [];
    // Depth inside a tag dropped together with its content (e.g. <script>).
    let dropping: string | undefined;
    const current = () => (stack.length ? stack[stack.length - 1].children : root);
    const closeTop = () => {
        const top = stack.pop();
        if (top) current().push(element(top.tag, top.attributes, top.children));
    };

    for (const node of nodes) {
        const tokens = tokensOf(node);
        if (!tokens) {
            if (!dropping) current().push(convert(node));
            continue;
        }
        for (const token of tokens) {
            if (dropping) {
                if (token.type === "close" && token.tag === dropping) dropping = undefined;
                continue;
            }
            if (token.type === "text") {
                current().push(...textOf(token.value));
            } else if (token.type === "open") {
                if (DROPPED_WITH_CONTENT_TAGS.has(token.tag)) {
                    if (!token.selfClosing) dropping = token.tag;
                    continue;
                }
                if (DROPPED_TAGS.has(token.tag)) continue;
                if (token.selfClosing) {
                    current().push(element(token.tag, token.attributes, []));
                } else {
                    stack.push({ tag: token.tag, attributes: token.attributes, children: [] });
                }
            } else {
                const openIndex = stack.map((open) => open.tag).lastIndexOf(token.tag);
                if (openIndex === -1) continue;
                while (stack.length > openIndex) closeTop();
            }
        }
    }
    while (stack.length) closeTop();
    return root;
}

function inlineElement(
    tag: string,
    attributes: Record<string, string>,
    children: InlineNode[],
): InlineNode {
    const node: InlineComponentNode = {
        type: "inlineComponent",
        name: tag,
        tagName: tag,
        attributes: {},
        properties: attributes,
        children,
    };
    return node;
}

function transformInlines(nodes: InlineNode[]): InlineNode[] {
    return buildTree<InlineNode, InlineNode>({
        nodes,
        tokensOf: (node) => (node.type === "inlineHtml" ? tokenizeHtml(node.value) : undefined),
        textOf: (value) => [{ type: "text", value }],
        convert: (node) =>
            "children" in node && Array.isArray(node.children)
                ? ({
                      ...node,
                      children: transformInlines(node.children as InlineNode[]),
                  } as InlineNode)
                : node,
        element: inlineElement,
    });
}

/**
 * A block-level `html` node is raw markup TanStack didn't parse at all - e.g. a line starting
 * with `<span style="color:blue">some *blue* text</span>.`. Re-parse it as a paragraph (a
 * leading zero-width space keeps the parser from recognizing it as an HTML block again), so the
 * markdown inside it is parsed and its tags come back as `inlineHtml` nodes.
 */
function reparseHtmlBlock(value: string, options: ParseOptions): BlockNode[] {
    const marker = "​";
    const document = parseMarkdown(marker + value, {
        ...options,
        allowHtml: true,
        extensions: (options.extensions ?? []).filter((extension) => extension !== htmlExtension),
    });
    const [first] = document.children;
    if (first?.type === "paragraph") {
        const [firstInline] = first.children;
        if (firstInline?.type === "text" && firstInline.value.startsWith(marker)) {
            const value = firstInline.value.slice(marker.length);
            if (value) first.children[0] = { ...firstInline, value };
            else first.children.shift();
        }
    }
    return document.children;
}

function isSingleTag(tokens: HtmlToken[], type: "open" | "close"): boolean {
    const significant = tokens.filter(
        (token) => token.type !== "text" || token.value.trim() !== "",
    );
    return (
        significant.length === 1 &&
        significant[0].type === type &&
        !(type === "open" && (significant[0] as OpenTagToken).selfClosing)
    );
}

function transformBlocks(blocks: BlockNode[], options: ParseOptions): BlockNode[] {
    // A lone opening/closing tag block (e.g. "<div class="note">", markdown, then "</div>") is
    // paired with its counterpart around the blocks between them. Any other html block is re-parsed
    // as inline content.
    const expanded: BlockNode[] = [];
    for (const block of blocks) {
        if (block.type === "html") {
            const tokens = tokenizeHtml(block.value);
            if (isSingleTag(tokens, "open") || isSingleTag(tokens, "close")) {
                expanded.push(block);
            } else {
                expanded.push(...reparseHtmlBlock(block.value, options));
            }
        } else {
            expanded.push(block);
        }
    }
    return buildTree<BlockNode, BlockNode>({
        nodes: expanded,
        tokensOf: (node) => (node.type === "html" ? tokenizeHtml(node.value) : undefined),
        textOf: (value) =>
            value.trim()
                ? [{ type: "paragraph", children: [{ type: "text", value: value.trim() }] }]
                : [],
        convert: (node) => transformBlock(node, options),
        element: (tag, attributes, children) => {
            const node: ComponentNode = {
                type: "component",
                name: tag,
                tagName: tag,
                attributes: {},
                properties: attributes,
                children,
            };
            return node;
        },
    });
}

function transformBlock(block: BlockNode, options: ParseOptions): BlockNode {
    switch (block.type) {
        case "heading":
        case "paragraph":
            return { ...block, children: transformInlines(block.children) };
        case "blockquote":
        case "callout":
        case "component":
            return { ...block, children: transformBlocks(block.children, options) };
        case "list":
            return {
                ...block,
                items: block.items.map((item) => ({
                    ...item,
                    children: transformBlocks(item.children, options),
                })),
            };
        case "table":
            return {
                ...block,
                header: block.header.map((cell) => ({
                    ...cell,
                    children: transformInlines(cell.children),
                })),
                rows: block.rows.map((row) =>
                    row.map((cell) => ({ ...cell, children: transformInlines(cell.children) })),
                ),
            };
        default:
            return block;
    }
}

export const htmlExtension: MarkdownExtension = {
    name: "react-markdown-typewriter:html",
    transformDocument(document: MarkdownDocument, { options }) {
        return { ...document, children: transformBlocks(document.children, options) };
    },
};
