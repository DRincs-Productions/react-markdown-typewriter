# React Markdown Typewriter

This library provides 2 new component, `MarkdownTypewriter` and `MarkdownTypewriterAsync`, that combines the Markdown component of [react-markdown](https://www.npmjs.com/package/react-markdown) with the animation of typewriter. The animation was created entirely with [motion](https://www.npmjs.com/package/motion).

Live demo: <https://codesandbox.io/p/sandbox/react-markdown-typewriter-rgjf6t>

> The effect produced by this library closely resembles the streaming text animation used by AI chat interfaces such as **ChatGPT**, **Claude**, **Gemini**, and similar tools — where responses appear character by character as they are generated. If you are building an AI-powered chat UI or any application that streams text to the user, this library gives you that familiar, polished look with full Markdown support out of the box.

## Why?

This library was born during the development of my game engine [pixi-vn](https://www.npmjs.com/package/@drincs/pixi-vn). I needed a component that would display the current dialogue of a character with the "Typewriter" effect and I also wanted to give the developer the possibility to use Markdown to add style to the text.

For this reason I created this component that I later decided to make available on npm.

## Install

This package is ESM only. In Node.js (version 12.20+, 14.14+, or 16.0+), install with npm:

```bash
npm install react-markdown react-markdown-typewriter
```

## Use

The component accepts all the props of the `react-markdown` component and adds some additional props to manage the typewriter effect.

This is a very simple example of how to use the component:

```tsx
import { MarkdownTypewriter } from "react-markdown-typewriter";

export default function NarrationScreen() {
    return (
        <div>
            <MarkdownTypewriter>Hello World</MarkdownTypewriter>
        </div>
    );
}
```

This is a more complex example:

```tsx
import { useRef } from "react";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { MarkdownTypewriter } from "react-markdown-typewriter";

export default function NarrationScreen() {
    const paragraphRef = useRef<HTMLDivElement>(null);
    const scrollToEnd = useCallback((ref: { current: HTMLSpanElement | null }) => {
        if (paragraphRef.current && ref.current) {
            let scrollTop = ref.current.offsetTop - paragraphRef.current.clientHeight / 2;
            paragraphRef.current.scrollTo({
                top: scrollTop,
                behavior: "auto",
            });
        }
    }, []);
    return (
        <div ref={paragraphRef}>
            <MarkdownTypewriter
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
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
                Hello World
            </MarkdownTypewriter>
        </div>
    );
}
```

## MarkdownTypewriterAsync

Component to render markdown with support for async plugins
through async/await.

Components returning promises are supported on the server.
For async support on the client,
see [`MarkdownTypewriterHooks`](#markdowntypewriterhooks)

## MarkdownTypewriterHooks

Component to render markdown with support for async plugins through hooks.

This uses `useEffect` and `useState` hooks.
Hooks run on the client and do not immediately render something.
For async support on the server,
see [`MarkdownTypewriterAsync`](#markdowntypewriterasync)

## API

### props

In addition to the `react-markdown` component props, the component accepts the following props:

* `delay`: The delay in milliseconds between the appearance of one letter and the next. Default: `10`. (Optional)
* `motionProps` (Optional):
  * The props to pass to the [motion span](https://motion.dev/docs/react-motion-component).
  * `characterVariants`: The motion variants for each individual letter. Default: `{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { opacity: { duration: 0 } } } }` (Optional).
  * `onCharacterAnimationComplete`: A callback that is called when the animation of a letter is complete. The callback is called with the reference to the letter. (Optional)
* `specialCharacters`: Per-character animation overrides, useful for adding pauses after punctuation. Each key must be a **single character**. (Optional)
* `accumulateConsecutiveDelays`: When `true`, any unbroken run of characters that each have a `delayAfter` configured is collapsed: all but the last are silenced, and the last fires with the **sum** of all delays in the run. Default: `false`. (Optional)

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
import { MarkdownTypewriter } from "react-markdown-typewriter";

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
