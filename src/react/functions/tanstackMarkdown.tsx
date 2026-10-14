import { entityDecoderExtension } from "@/core/entities";
import { htmlExtension } from "@/core/html";
import { toReactDocument } from "@/react/functions/htmlProps";
import { parseMarkdown } from "@tanstack/markdown/parser";
import { type MarkdownReactOptions, renderMarkdownReact } from "@tanstack/markdown/react";
import { type ComponentType, Fragment, type ReactNode, useMemo } from "react";

export type MarkdownComponentMap = Record<string, string | ComponentType<any> | undefined>;

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
    const { allowHtml, urlTransform, frontmatter, headingIds, references, footnotes } = options;
    const mergedExtensions = useMemo(
        () => [
            ...(extensions ?? []),
            entityDecoderExtension,
            // Raw HTML becomes real (animated) elements instead of being injected as a string.
            ...(allowHtml ? [htmlExtension] : []),
        ],
        [extensions, allowHtml],
    );
    // Parsing is the expensive part: only redo it when the text or a parse option changes, not on
    // every re-render of the (animating) parent.
    // biome-ignore lint/correctness/useExhaustiveDependencies: `options` is a new object every render; its parse-relevant fields are listed
    const document = useMemo(
        () =>
            toReactDocument(parseMarkdown(children, { ...options, extensions: mergedExtensions })),
        [
            children,
            mergedExtensions,
            allowHtml,
            urlTransform,
            frontmatter,
            headingIds,
            references,
            footnotes,
        ],
    );
    const blocks = renderMarkdownReact(document, {
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
