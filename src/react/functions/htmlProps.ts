import type { BlockNode, InlineNode, MarkdownDocument } from "@tanstack/markdown";

/** HTML attribute names whose React prop name differs (beyond `on*`, which are dropped). */
const REACT_PROP_NAMES: Record<string, string> = {
    class: "className",
    for: "htmlFor",
    tabindex: "tabIndex",
    readonly: "readOnly",
    maxlength: "maxLength",
    colspan: "colSpan",
    rowspan: "rowSpan",
    cellpadding: "cellPadding",
    cellspacing: "cellSpacing",
    contenteditable: "contentEditable",
    crossorigin: "crossOrigin",
    datetime: "dateTime",
    srcset: "srcSet",
    usemap: "useMap",
    accesskey: "accessKey",
    autocomplete: "autoComplete",
    autoplay: "autoPlay",
    "accept-charset": "acceptCharset",
    "http-equiv": "httpEquiv",
};

function styleToObject(style: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const declaration of style.split(";")) {
        const colon = declaration.indexOf(":");
        if (colon === -1) continue;
        const property = declaration.slice(0, colon).trim();
        const value = declaration.slice(colon + 1).trim();
        if (!property || !value) continue;
        const key = property.startsWith("--")
            ? property
            : property.toLowerCase().replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
        result[key] = value;
    }
    return result;
}

/**
 * Converts HTML attributes into React props. The React renderer spreads a component node's
 * `properties` straight into `createElement` - also for tags without a component mapping - so
 * they must already be valid React props (a `style` string would make React throw).
 */
export function toReactProps(attributes: Record<string, string>): Record<string, string> {
    const props: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(attributes)) {
        if (name === "style") {
            props.style = styleToObject(value);
        } else {
            props[REACT_PROP_NAMES[name] ?? name] = value;
        }
    }
    // Typed as strings by TanStack's AST, but only ever read back by the React renderer.
    return props as Record<string, string>;
}

function convertInlines(nodes: InlineNode[]): InlineNode[] {
    return nodes.map((node) => {
        if (node.type === "inlineComponent") {
            return {
                ...node,
                properties: node.properties && toReactProps(node.properties),
                children: convertInlines(node.children),
            };
        }
        if ("children" in node && Array.isArray(node.children)) {
            return {
                ...node,
                children: convertInlines(node.children as InlineNode[]),
            } as InlineNode;
        }
        return node;
    });
}

function convertBlocks(blocks: BlockNode[]): BlockNode[] {
    return blocks.map((block): BlockNode => {
        switch (block.type) {
            case "component":
                return {
                    ...block,
                    properties: block.properties && toReactProps(block.properties),
                    children: convertBlocks(block.children),
                };
            case "heading":
            case "paragraph":
                return { ...block, children: convertInlines(block.children) };
            case "blockquote":
            case "callout":
                return { ...block, children: convertBlocks(block.children) };
            case "list":
                return {
                    ...block,
                    items: block.items.map((item) => ({
                        ...item,
                        children: convertBlocks(item.children),
                    })),
                };
            case "table":
                return {
                    ...block,
                    header: block.header.map((cell) => ({
                        ...cell,
                        children: convertInlines(cell.children),
                    })),
                    rows: block.rows.map((row) =>
                        row.map((cell) => ({ ...cell, children: convertInlines(cell.children) })),
                    ),
                };
            case "footnotes":
                return {
                    ...block,
                    items: block.items.map((item) => ({
                        ...item,
                        children: convertBlocks(item.children),
                    })),
                };
            default:
                return block;
        }
    });
}

/**
 * Converts the HTML attributes of every component node (e.g. the raw HTML elements rebuilt by
 * `htmlExtension`) into React props.
 */
export function toReactDocument(document: MarkdownDocument): MarkdownDocument {
    return { ...document, children: convertBlocks(document.children) };
}
