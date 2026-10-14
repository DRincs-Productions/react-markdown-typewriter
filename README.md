# Markdown Typewriter

This library renders Markdown with [@tanstack/markdown](https://www.npmjs.com/package/@tanstack/markdown) and reveals it with a typewriter animation. Like @tanstack/markdown, it has two entry points:

* `markdown-typewriter/react`: the `MarkdownTypewriter` React component, animated with [motion](https://www.npmjs.com/package/motion).
* `markdown-typewriter/core`: the framework-agnostic part (no React, no motion) — the @tanstack/markdown extensions it parses with and the typewriter timing rules — to build the same effect with any other framework or plain JavaScript. See [Core (without React)](#core-without-react).

> **Renamed:** this package was published as `react-markdown-typewriter` up to 2.0; it is now `markdown-typewriter`. Every release is still published under both names, but `react-markdown-typewriter` is deprecated: see [Migrating from 2.0](#migrating-from-20).

Live demo: <https://codesandbox.io/p/sandbox/react-markdown-typewriter-rgjf6t>

> The effect produced by this library closely resembles the streaming text animation used by AI chat interfaces such as **ChatGPT**, **Claude**, **Gemini**, and similar tools — where responses appear character by character as they are generated. If you are building an AI-powered chat UI or any application that streams text to the user, this library gives you that familiar, polished look with full Markdown support out of the box.

**Upgrading from 1.x?** Version 2 replaces react-markdown with @tanstack/markdown. See [Migrating from 1.x](#migrating-from-1x).

## Why?

This library was born during the development of my game engine [pixi-vn](https://www.npmjs.com/package/@drincs/pixi-vn). I needed a component that would display the current dialogue of a character with the "Typewriter" effect and I also wanted to give the developer the possibility to use Markdown to add style to the text.

For this reason I created this component that I later decided to make available on npm.

## Install

```bash
# React
npm install markdown-typewriter motion
# core only (no React)
npm install markdown-typewriter
```

`@tanstack/markdown` is installed automatically. The React entry point also needs `react`, `react-dom` (18 or newer) and `motion` (12.9 or newer), declared as optional peer dependencies (the core does not use them).

The package ships both ESM (`import`) and CommonJS (`require`) builds. `@tanstack/markdown` is published as ESM only, so the CommonJS build bundles it: `require("markdown-typewriter")` works even where `require()` cannot load ES modules.

## Use

This is a very simple example of how to use the component:

```tsx
import { MarkdownTypewriter } from "markdown-typewriter/react";

export default function NarrationScreen() {
    return (
        <div>
            <MarkdownTypewriter>Hello **World**</MarkdownTypewriter>
        </div>
    );
}
```

This is a more complex example:

```tsx
import { useCallback, useRef } from "react";
import { MarkdownTypewriter } from "markdown-typewriter/react";

export default function NarrationScreen() {
    const paragraphRef = useRef<HTMLDivElement>(null);
    const scrollToEnd = useCallback((ref: { current: HTMLSpanElement | null }) => {
        if (paragraphRef.current && ref.current) {
            const scrollTop = ref.current.offsetTop - paragraphRef.current.clientHeight / 2;
            paragraphRef.current.scrollTo({
                top: scrollTop,
                behavior: "auto",
            });
        }
    }, []);
    return (
        <div ref={paragraphRef}>
            <MarkdownTypewriter
                allowHtml
                delay={20}
                motionProps={{
                    onAnimationComplete: () => {
                        console.log("Typewriter finished");
                    },
                    characterVariants: {
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { opacity: { duration: 0 } } },
                    },
                    onCharacterAnimationComplete: scrollToEnd,
                }}
            >
                {'Hello <span style="color:blue">blue *World*</span>'}
            </MarkdownTypewriter>
        </div>
    );
}
```

## Markdown support

The Markdown syntax is the one supported by [@tanstack/markdown](https://github.com/TanStack/markdown): headings, paragraphs, emphasis, strong, links, images, inline code and fenced code blocks, lists, blockquotes and thematic breaks, plus the GFM features most commonly used — **tables**, **strikethrough**, **task lists** and **footnotes** — with no plugin to install.

HTML character references such as `&nbsp;`, `&amp;` or `&#8230;` are decoded, as in CommonMark.

Extra syntax is enabled with @tanstack/markdown [extensions](https://github.com/TanStack/markdown/blob/main/docs/guides/extensions.md), passed through the `extensions` prop. For example, GitHub-style alerts (`> [!NOTE]`):

```tsx
import { calloutsExtension } from "@tanstack/markdown/extensions/callouts";
import { MarkdownTypewriter } from "markdown-typewriter/react";

const extensions = [calloutsExtension()];

export default function Note() {
    return <MarkdownTypewriter extensions={extensions}>{"> [!NOTE]\n> Typed out too."}</MarkdownTypewriter>;
}
```

Keep the `extensions` array stable (define it outside the component or memoize it): the Markdown is parsed again whenever it changes.

## Raw HTML

Raw HTML is disabled by default (it is rendered as plain text). Enable it with `allowHtml`:

```tsx
<MarkdownTypewriter allowHtml>
    {'The sky is <span style="color:blue">deep **blue**</span> tonight.<br>A <b>new</b> line.'}
</MarkdownTypewriter>
```

Unlike `@tanstack/markdown`'s own `Markdown` component (which injects raw HTML with `dangerouslySetInnerHTML`), `MarkdownTypewriter` rebuilds the HTML into real React elements:

* the text inside HTML elements is **typed out like the rest of the document**, and Markdown inside them (`**bold**`, `*italic*`, links…) still works;
* attributes are kept: `style` (converted to a React style object), `class` (as `className`) and the others, so `<span style="color:blue">…</span>` is blue while it types;
* block elements wrapping Markdown work too (`<div class="note">`, blank line, Markdown, blank line, `</div>`);
* unsafe content is dropped: `<script>`, `<style>`, `<iframe>`, `<object>` and similar tags (with their content), `on*` event handler attributes, and `javascript:`/`vbscript:`/non-image `data:` URLs. The output is never injected as an HTML string.

Even so, only enable `allowHtml` for content you control (e.g. your game's script): `style` and other attributes are passed through.

## Custom components

Use `components` to replace the element rendered for an HTML tag (keyed by tag name, e.g. `a`, `img`, `p`):

```tsx
<MarkdownTypewriter
    components={{
        a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
                {children}
            </a>
        ),
    }}
>
    Read the [docs](https://example.com).
</MarkdownTypewriter>
```

A replaced element is no longer animated by the library: to keep its text typing out, render its children inside motion elements that use the same `hidden`/`visible` variants as the characters (see `motionProps.characterVariants`).

## Core (without React)

`markdown-typewriter/core` contains everything that does not depend on React, so the same Markdown dialect and the same timing rules can be used with any framework (or none):

* `typewriterExtensions({ allowHtml })`: the @tanstack/markdown extensions `MarkdownTypewriter` parses with — HTML character references decoding (`entityDecoderExtension`) and, with `allowHtml`, raw HTML rebuilt into sanitized elements (`htmlExtension`).
* `createTypewriterSchedule(text, { delay, specialCharacters, accumulateConsecutiveDelays })`: when each character (emoji kept whole) should appear, with the same rules as the React component.
* `splitCharacters(text)`, `decodeEntities(text)`, `tokenizeHtml(html)` and the `SpecialCharacterTiming` type.

```ts
import { renderHtml } from "@tanstack/markdown/html";
import { createTypewriterSchedule, typewriterExtensions } from "markdown-typewriter/core";

// Same Markdown dialect as the React component; raw HTML is sanitized (no <script>, no on* handlers).
const html = renderHtml('Hello <span style="color:blue">**blue**</span> world', {
    allowHtml: true,
    extensions: typewriterExtensions({ allowHtml: true }),
});

// Same timing rules as the React component.
const { characters, durationMs } = createTypewriterSchedule("Hello, world.", {
    delay: 30,
    specialCharacters: { ",": { delayAfter: 150 } },
});
for (const { char, at } of characters) {
    setTimeout(() => output.append(char), at);
}
```

## API

### props

* `children`: The Markdown text to render.
* `delay`: The delay in milliseconds between the appearance of one letter and the next. Default: `10`. (Optional)
* `animated`: When `false`, the text is rendered at once, without the typewriter animation, but with exactly the same Markdown parsing and rendering (raw HTML, entities, components…). Useful for text that has already been typed out (e.g. a dialogue history), so it looks the same as the animated text. Default: `true`. (Optional)
* `motionProps` (Optional):
  * The props to pass to the [motion span](https://motion.dev/docs/react-motion-component) wrapping the text, e.g. `onAnimationStart`.
  * `onAnimationComplete`: Called once the whole text has been revealed.
  * `characterVariants`: The motion variants for each individual letter. Default: `{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { opacity: { duration: 0 } } } }` (Optional).
  * `onCharacterAnimationComplete`: A callback that is called when the animation of a letter is complete. The callback is called with the reference to the letter. (Optional)
* `specialCharacters`: Per-character animation overrides, useful for adding pauses after punctuation. Each key must be a **single character**. (Optional)
* `accumulateConsecutiveDelays`: When `true`, any unbroken run of characters that each have a `delayAfter` configured is collapsed: all but the last are silenced, and the last fires with the **sum** of all delays in the run. Default: `false`. (Optional)
* `components`: Replace the element rendered for an HTML tag. (Optional)
* `allowHtml`: Render raw HTML as animated elements. Default: `false`. (Optional) See [Raw HTML](#raw-html).
* All the other [@tanstack/markdown render options](https://github.com/TanStack/markdown/blob/main/docs/reference/index.md) (Optional), e.g.:
  * `extensions`: @tanstack/markdown extensions (custom syntax, callouts…).
  * `urlTransform`: Rewrite or drop link/image URLs.
  * `headingIds`: Add `id`s to headings.
  * `frontmatter`, `references`, `footnotes`, `highlighter`, `codeLineNumbers`, `headingAnchors`.

### specialCharacters

`specialCharacters` is an object where each key is a single character and each value is a `SpecialCharacterOptions` object:

* `delay`: Overrides the global stagger delay for this character — controls how long the typewriter waits *before* this character appears. **No consecutive rule**: every occurrence gets its own override, even in `"..."`. (Optional)
* `delayAfter`: Inserts a pause *after* this character before the next one appears. **Consecutive rule applies**: for `"..."` only the last `.` triggers the pause; for `". . ."` each `.` triggers (a space breaks the sequence). (Optional)
* `characterVariants`: Custom motion variants for this specific character. Overrides `motionProps.characterVariants` for this character. (Optional)

#### `delay` vs `delayAfter`

| | `delay` | `delayAfter` |
| --- | --- | --- |
| Where the pause happens | Before this character appears | After this character, before the next |
| Consecutive rule | None — fires for every occurrence | Only fires when the next char is NOT the same special char |
| `"..."` | Each `.` gets its own delay | Only the last `.` triggers the pause |
| `". . ."` | Each `.` gets its own delay | Each `.` triggers (space breaks the sequence) |

The most common use case for punctuation pauses is `delayAfter`.

#### `accumulateConsecutiveDelays`

When `accumulateConsecutiveDelays={true}`, any unbroken run of characters that each have a `delayAfter` is treated as a single unit: all but the last are silenced, and the last fires with the **sum** of all delays in the run. A non-special character (or a React-element boundary) breaks the run.

| Text | `false` (default) | `true` |
| --- | --- | --- |
| `"..."` (`.delayAfter=300`) | last `.` → 300 ms | last `.` → 900 ms |
| `".!."` (`.`=300, `!`=500) | each fires its own | last `.` → 1 100 ms |
| `". . ."` | each `.` fires (space breaks) | each `.` fires (space breaks) |

#### Example

```tsx
import { MarkdownTypewriter } from "markdown-typewriter/react";

export default function NarrationScreen() {
    return (
        <div>
            <MarkdownTypewriter
                delay={20}
                specialCharacters={{
                    ".": { delayAfter: 400 },
                    ",": { delayAfter: 150 },
                    "!": { delayAfter: 500 },
                    "?": { delayAfter: 500 },
                    ":": { delayAfter: 250 },
                }}
            >
                Hello, world. How are you?
            </MarkdownTypewriter>
        </div>
    );
}
```

You can also override the animation for a specific character:

```tsx
<MarkdownTypewriter
    specialCharacters={{
        ".": {
            delayAfter: 400,
            characterVariants: {
                hidden: { opacity: 0, scale: 0.5 },
                visible: { opacity: 1, scale: 1, transition: { duration: 0.1 } },
            },
        },
    }}
>
    Hello world.
</MarkdownTypewriter>
```

## Migrating from 2.0

1. Replace the package: `npm uninstall react-markdown-typewriter && npm install markdown-typewriter`.
2. Import the component from the React entry point: `import { MarkdownTypewriter } from "markdown-typewriter/react";`.

Nothing else changes. Importing `MarkdownTypewriter` from the package root still works but is deprecated: the root also re-exports `markdown-typewriter/core`.

## Migrating from 1.x

Version 2 renders Markdown with [@tanstack/markdown](https://github.com/TanStack/markdown) instead of [react-markdown](https://github.com/remarkjs/react-markdown) (unified/remark/rehype). The typewriter props (`delay`, `motionProps`, `specialCharacters`, `accumulateConsecutiveDelays`) are unchanged; the Markdown props are now @tanstack/markdown's.

### Steps

1. Uninstall what is no longer needed and install the renamed package: `npm uninstall react-markdown-typewriter react-markdown remark-gfm rehype-raw` (keep react-markdown/remark-gfm/rehype-raw if something else in your app uses them), then `npm install markdown-typewriter`.
2. Replace `MarkdownTypewriterHooks`/`MarkdownTypewriterAsync` with `MarkdownTypewriter`, imported from `markdown-typewriter/react`.
3. Replace the react-markdown props:

| 1.x (react-markdown) | 2.x (@tanstack/markdown) |
| --- | --- |
| `remarkPlugins={[remarkGfm]}` | Nothing: tables, strikethrough, task lists and footnotes are built in. |
| `rehypePlugins={[rehypeRaw]}` | `allowHtml` |
| other `remarkPlugins`/`rehypePlugins` | `extensions` (@tanstack/markdown extensions), e.g. `calloutsExtension()` for `> [!NOTE]` alerts |
| `components={{ a: MyLink }}` | `components={{ a: MyLink }}` (same, keyed by tag name; components receive the element props, without react-markdown's `node`) |
| `urlTransform` | `urlTransform` (signature: `(url, kind, defaultUrl) => string \| null`) |
| `skipHtml` | Leave `allowHtml` off: raw HTML is shown as text. |
| `allowedElements`/`disallowedElements`/`unwrapDisallowed` | Map the tag to a component in `components` that renders what you want (or `() => null`). |
| `fallback` (`MarkdownTypewriterHooks`) | Not needed: rendering is synchronous. |

### Components

1.x had three components because react-markdown has three: `MarkdownTypewriter` (sync plugins), `MarkdownTypewriterHooks` (async plugins on the client) and `MarkdownTypewriterAsync` (async plugins on the server). @tanstack/markdown has a single synchronous `Markdown` component, so 2.x has a single `MarkdownTypewriter`, which works in all of those cases.

### Differences

**Rendering.** Every case in the [playground](./playground) (punctuation pauses, emoji, bold/italic/strikethrough, links, inline code, headings, lists, task lists, tables, images, raw HTML with colors, the full feature test) renders the same in both versions: same text, same height, same color/weight/style/decoration for every character, same reveal order and timing. The only difference found is invisible: react-markdown puts a newline text node between list items.

**Raw HTML.** It still types out and keeps its attributes, and it is now sanitized (`<script>`, `on*` handlers and `javascript:` URLs are dropped; rehype-raw kept them and relied on React to neutralize them).

**Syntax.** @tanstack/markdown targets blog/docs content and is intentionally not a complete CommonMark/GFM implementation. Not supported (they render as plain text):

* autolinks: `<https://example.com>`, and bare `www.example.com`/`https://example.com` (GFM autolink literals) — use `[text](https://example.com)`;
* hard line breaks with two trailing spaces — use `<br>` with `allowHtml`, or a new paragraph;
* GitHub alerts (`> [!NOTE]`) without `calloutsExtension()`.

**Performance.** Measured on the playground (Chrome, production build; medians):

| | 1.x | 2.x |
| --- | --- | --- |
| Playground bundle (React + motion + markdown + typewriter), gzip | 224.5 kB | 133.8 kB |
| Markdown parse + render only (2 700 chars, Node SSR) | 5.29 ms (react-markdown + gfm + raw) | 0.37 ms (@tanstack/markdown) |
| Typewriter SSR, 2 700-char document | 42.6 ms | 39.2 ms |
| Typewriter SSR, feature test (1 000 chars, raw HTML) | 23.0 ms | 13.0 ms |
| First character visible, 2 700-char document, 4× CPU slowdown | 1 300 ms | 956 ms |
| Main-thread blocking time on mount, same document, 4× CPU slowdown | 3 140 ms | 2 608 ms |
| First character visible, feature test, 4× CPU slowdown | 602 ms | 328 ms |
| Main-thread blocking time on mount, feature test, 4× CPU slowdown | 644 ms | 115 ms |

Parsing becomes negligible; what remains is mounting and animating one element per character, which is the same in both versions. Without CPU throttling, both versions mount these documents without long tasks (> 50 ms) on a desktop machine.
