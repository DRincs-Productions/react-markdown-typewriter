import { useEffect, useRef, useState } from "react";
import { MarkdownTypewriter } from "react-markdown-typewriter";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

const DELAY = 30;

// Reported as causing a significant performance issue (~2700 chars, many headings/paragraphs).
// See https://github.com/DRincs-Productions/react-markdown-typewriter/issues - large real-world
// markdown documents (e.g. course/subject listings) keep thousands of per-character motion
// components alive simultaneously for the whole (very long) reveal sequence.
const LARGE_DOCUMENT = `## Lorem ipsum
### 📚 Mathematics & Statistics 101
Mathematics and Statistics 1.2 - Use mathematical methods to explore problems that relate to life in Aotearoa New Zealand or the Pacific
Level 1, Internal,
Credits: 5

Mathematics and Statistics 1.3 - Interpret and apply mathematical and statistical information in context
Level 1, External,
Credits: 5

Mathematics and Statistics 1.4 - Demonstrate mathematical reasoning
Level 1, External,
Credits: 5

### 📚 Science 101
Chemistry and Biology 1.2 - Demonstrate understanding of chemical reactions in context
Level 1, Internal,
Credits: 6

Chemistry and Biology 1.3 - Demonstrate understanding of genetic variation in relation to an identified characteristic
Level 1, External,
Credits: 5

Physics, Earth and Space Science 1.2 - Demonstrate understanding of a physical phenomenon through investigation
Level 1, Internal,
Credits: 5

### 📚 English 101
English 1.3 - Demonstrate understanding of specific aspects of studied text
Level 1, External,
Credits: 5

English 1.2 - Develop ideas in writing using stylistic and written conventions
Level 1, Internal,
Credits: 5

English 1.4 - Demonstrate understanding of significant aspects of unfamiliar texts
Level 1, External,
Credits: 5

### 📚 Spanish 101
Spanish 1.2 - Communicate in Spanish for a chosen purpose
Level 1, Internal,
Credits: 5

Spanish 1.3 - Demonstrate understanding of written Spanish related to everyday contexts
Level 1, External,
Credits: 5

Spanish 1.4 - Demonstrate understanding of spoken Spanish related to everyday contexts
Level 1, External,
Credits: 5

### 📚 Practical Art 101
Visual Arts 1.2 - Produce a significant resolved artwork appropriate to established art making conventions
Level 1, Internal,
Credits: 5

Visual Arts 1.3 - Explore Visual Arts processes and conventions to inform own art making
Level 1, External,
Credits: 5

Visual Arts 1.4 - Create a sustained body of related artworks in response to an art making proposition
Level 1, External,
Credits: 5

### 📚 Multi-Materials Technology 101
Materials and Processing Technology 1.1 - Develop a Materials and Processing Technology outcome in an authentic context
Level 1, Internal,
Credits: 6

Materials and Processing Technology 1.2 - Experiment with different materials to develop a Materials and Processing Technology outcome
Level 1, Internal,
Credits: 6

Materials and Processing Technology 1.3 - Demonstrate understanding of sustainable practices in the development of a Materials and Processing Technology design
Level 1, External,
Credits: 4

| **Total Credits** | **L1 Literacy Credits** | **UE Literacy Credits** | **Numeracy Credits** |
|---:|---:|---:|---:|
| **92** | **20** | **** | **15** |
`;

// Broad feature showcase covering most markdown constructs at once (headings, raw HTML with
// inline styling, bold/italic/strikethrough, links, code (inline + fenced), lists/task lists,
// a GFM table, and an image) - useful for eyeballing the reveal across many block types in one
// pass rather than one narrow case per feature.
const MARKDOWN_FEATURE_TEST = `# Markdown Test

Hello 🖐️, this is a test of the markdown parser. Pixi'VN does not manage markdown, but you can implement a markdown parser to display text with markdown syntax.

For example in React, you can use the library [react-markdown](https://www.npmjs.com/package/react-markdown).

## Colored Text

<span style="color:blue">some *blue* text</span>.

<span style="color:red">some *red* text</span>.

<span style="color:green">some *green* text</span>.

## Bold Text

**This is bold text.**

## Italic Text

*This is italic text.*

## Delete Text

~~This is deleted text.~~

## Link Test

[Link to Google](https://www.google.com)

## H2 Test

### H3 Test

#### H4 Test

## Code Test

\`Hello World\`

\`\`\`js
console.log("Hello World")
\`\`\`

## List Test

- Item 1

- Item 2

- [x] Item 3

## Table Test

| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |

## Image Test

![Image](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkw_mXXQ9FJ9HgmW_B9QMv-gvOmndUaEI9SA&s)
`;

const SPECIAL_CHARACTERS: Record<string, { delay?: number; delayAfter?: number }> = {
    ".": { delayAfter: 400 },
    ",": { delayAfter: 150 },
    "!": { delayAfter: 500 },
    "?": { delayAfter: 500 },
    ":": { delayAfter: 250 },
};

const SPECIAL_CHARACTERS_MIXED: Record<string, { delay?: number; delayAfter?: number }> = {
    ".": { delayAfter: 400 },
    ",": { delayAfter: 200 },
    "!": { delayAfter: 600 },
    "?": { delayAfter: 500 },
    // Long pause BEFORE the colon — the colon itself appears with a dramatic beat
    ":": { delay: 500, delayAfter: 300 },
    // Pause before and after the em dash — used as a dramatic separator
    "—": { delay: 400, delayAfter: 400 },
};

const cases: {
    label: string;
    text: string;
    specialCharacters?: Record<string, { delay?: number; delayAfter?: number }>;
    accumulateConsecutiveDelays?: boolean;
}[] = [
    // ── baseline ────────────────────────────────────────────────────────────────
    {
        label: "Baseline (no specials)",
        text: "Hello, world. How are you? I am fine! Let me tell you: it works.",
    },
    // ── delayAfter ──────────────────────────────────────────────────────────────
    {
        label: "Punctuation pauses",
        text: "Hello, world. How are you? I am fine! Let me tell you: it works.",
        specialCharacters: SPECIAL_CHARACTERS,
    },
    {
        label: "Ellipsis — pause at end",
        text: 'Wait... it is working! And "this..." is great.',
        specialCharacters: SPECIAL_CHARACTERS,
    },
    {
        label: "Mixed ?!? — single pause",
        text: "Really?!? Wow... Are you sure?! Yes!",
        specialCharacters: SPECIAL_CHARACTERS,
    },
    {
        label: "Mixed ?! accumulate",
        text: "Wait... are you sure?! Yes! And this... too?!",
        specialCharacters: {
            ".": { delayAfter: 300 },
            "?": { delayAfter: 400 },
            "!": { delayAfter: 500 },
        },
        accumulateConsecutiveDelays: true,
    },
    // ── delay (before) ──────────────────────────────────────────────────────────
    {
        label: "delay before char",
        text: "One. Two. Three — go!",
        specialCharacters: {
            ".": { delayAfter: 300 },
            "—": { delay: 600, delayAfter: 400 },
            "!": { delayAfter: 500 },
        },
    },
    // ── markdown styles ─────────────────────────────────────────────────────────
    {
        label: "Bold & italic",
        text: "**Bold**, _italic_, and ~~strikethrough~~. Done!",
        specialCharacters: SPECIAL_CHARACTERS,
    },
    {
        label: "Inline code & links",
        text: "Call `doSomething()` and check the result. Is it `null`? Yes!",
        specialCharacters: SPECIAL_CHARACTERS,
    },
    {
        label: "Heading + paragraph",
        text: "## Hello world\n\nThis is a **typewriter** with _markdown_. Cool?",
        specialCharacters: SPECIAL_CHARACTERS,
    },
    {
        label: "delay + delayAfter + styled",
        text: "**Attenzione**: questo _messaggio_ è importante — leggilo *lentamente*, parola per parola. Capito?",
        specialCharacters: SPECIAL_CHARACTERS_MIXED,
    },
    // ── emoji ───────────────────────────────────────────────────────────────────
    {
        label: "Emoji only",
        text: "Hello 😊 world 🌍! How are you 🤔? Great 🎉!",
        specialCharacters: SPECIAL_CHARACTERS,
    },
    {
        label: "Multi-codepoint emoji",
        text: "Flags: 🇮🇹 🇺🇸 🇯🇵. Family: 👨‍👩‍👧‍👦. Skin tone: 👋🏽. Done!",
        specialCharacters: SPECIAL_CHARACTERS,
    },
    {
        label: "Emoji + markdown",
        text: "**Ciao** 👋, _benvenuto_ 🎉! Questo è `cool` 😎. Funziona?",
        specialCharacters: SPECIAL_CHARACTERS,
    },
    // ── edge cases ──────────────────────────────────────────────────────────────
    {
        label: "Only specials in a row",
        text: "Ready... set... go!!!",
        specialCharacters: { ".": { delayAfter: 200 }, "!": { delayAfter: 400 } },
    },
    {
        label: "Only specials — accumulate",
        text: "Ready... set... go!!!",
        specialCharacters: { ".": { delayAfter: 200 }, "!": { delayAfter: 400 } },
        accumulateConsecutiveDelays: true,
    },
    {
        label: "Unicode & accents",
        text: "Héllo wörld! Ñoño? Ünïcödé... works.",
        specialCharacters: SPECIAL_CHARACTERS,
    },
    // ── perf regression repro ───────────────────────────────────────────────────
    {
        label: "Perf: large document",
        text: LARGE_DOCUMENT,
    },
    {
        label: "Cross-block order (plain)",
        text: "AAAAAAAAAA\n\nBBBBBBBBBB",
    },
    {
        label: "Table only",
        text: "| A | B |\n|---|---|\n| **1** | 2 |",
    },
    // ── regression: self-driven/old-mechanism block adjacency ────────────────────
    // A plain-text block (heading or paragraph with no embedded formatting) reveals via the
    // self-driven scheduler and claims its own slice of the shared cross-block timeline. A
    // "mixed" block (containing **bold**/_italic_/a link/an image/inline code - anything that
    // gives it non-string children) reveals via the older ancestor-propagated `staggerChildren`
    // mechanism, which doesn't see self-driven blocks in its implicit sibling count - so whichever
    // direction these two mechanisms were adjacent in, the second block used to start revealing
    // immediately instead of waiting for the first to finish.
    //
    // Root cause: `CharacterSpan` unconditionally attached an `onAnimationComplete` handler (for
    // the "settle to a plain span" perf optimization) even to old-mechanism characters that rely
    // purely on INHERITING "hidden"/"visible" from an ancestor - and Framer Motion resolves such a
    // component immediately instead of waiting for the ancestor's future transition whenever ANY
    // onAnimationComplete handler is attached to a variants-only (no own initial/animate)
    // component. Fixed by only attaching that handler unconditionally for self-driven characters
    // (which have their own explicit initial/animate and aren't affected); old-mechanism
    // characters only get one if the caller actually asked for per-character notifications,
    // matching the pre-optimization behavior. `DelayedOldMechanismBlock` (which claims a slice of
    // the shared timeline and gates a mixed block's own reveal start on it, without delaying its
    // mount) then works correctly. A ~1-2 character boundary overlap can still occur when the
    // preceding block ends in a nested self-driven run (e.g. `**bold**`) longer than the fixed
    // "1 slot" estimate used to reserve time for it - a minor imprecision, not the full desync
    // these cases originally caught.
    {
        label: "Fixed: mixed → plain",
        text: "This is **bold** text here.\n\nPlain paragraph follows right after.",
    },
    {
        label: "Fixed: plain → link",
        text: "Plain paragraph goes here first.\n\n[A link](start) paragraph follows.",
    },
    {
        label: "Fixed: plain → image",
        text: "Plain paragraph goes here first.\n\n![alt](start) image paragraph follows.",
    },
    {
        label: "Fixed: plain → inline code",
        text: "Plain paragraph goes here first.\n\nCall `doSomething()` inline code follows.",
    },
    // A standalone embedded element with NO text of its own (e.g. an image alone in its own
    // paragraph, nothing else on the line) has nothing that could independently claim a slot on
    // the shared reveal timeline the way a self-driven string does - unlike "Fixed: plain →
    // image" above, where the image shares its paragraph with trailing text and so goes through
    // the array branch's existing DelayedOldMechanismBlock gate. A BARE image/link hit
    // TypewriterItem's final "single non-string, non-array child" fallback instead, which used to
    // skip gating entirely - inheriting "visible" straight from the document's top-level wrapper
    // and popping in almost immediately regardless of its position in the document. Fixed by
    // giving that fallback branch the same DelayedOldMechanismBlock gate (reserving one slot).
    {
        label: "Fixed: plain → solo image",
        text: "Heading paragraph first, lots of text so it takes a while to reveal fully before the image.\n\n![Image](start)",
    },
    {
        label: "OK: table ↔ plain",
        text: "| A | B |\n|---|---|\n| 1 | 2 |\n\nPlain paragraph after table here.",
    },
    // ── comprehensive feature showcase ────────────────────────────────────────────
    {
        label: "Full markdown feature test",
        text: MARKDOWN_FEATURE_TEST,
    },
];

export default function App() {
    const [active, setActive] = useState(0);
    const [key, setKey] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [stats, setStats] = useState({ live: 0, settled: 0 });

    const current = cases[active];

    useEffect(() => {
        const id = setInterval(() => {
            const node = containerRef.current;
            if (!node) return;
            const spans = node.querySelectorAll("span");
            let live = 0;
            let settled = 0;
            spans.forEach((span) => {
                if (span.hasAttribute("style")) {
                    live++;
                } else {
                    settled++;
                }
            });
            setStats({ live, settled });
        }, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div
            style={{
                fontFamily: "system-ui, sans-serif",
                maxWidth: 640,
                margin: "40px auto",
                padding: "0 20px",
            }}
        >
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>react-markdown-typewriter playground</h1>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {cases.map((c, i) => (
                    <button
                        key={c.label}
                        type="button"
                        onClick={() => {
                            setActive(i);
                            setKey((k) => k + 1);
                        }}
                        style={{
                            padding: "4px 10px",
                            borderRadius: 4,
                            border: "1px solid #ccc",
                            background: active === i ? "#333" : "#fff",
                            color: active === i ? "#fff" : "#333",
                            cursor: "pointer",
                            fontSize: 13,
                        }}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button
                    type="button"
                    onClick={() => setKey((k) => k + 1)}
                    style={{
                        padding: "4px 10px",
                        borderRadius: 4,
                        border: "1px solid #ccc",
                        cursor: "pointer",
                        fontSize: 13,
                    }}
                >
                    ↺ Replay
                </button>
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 13, color: "#666" }}>
                <span>live motion spans: {stats.live}</span>
                <span>settled (static) spans: {stats.settled}</span>
            </div>

            <div
                ref={containerRef}
                style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 8,
                    padding: 20,
                    minHeight: 80,
                    background: "#fafafa",
                    fontSize: 18,
                    lineHeight: 1.6,
                }}
            >
                <MarkdownTypewriter
                    key={key}
                    delay={DELAY}
                    specialCharacters={current.specialCharacters}
                    accumulateConsecutiveDelays={current.accumulateConsecutiveDelays}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                >
                    {current.text}
                </MarkdownTypewriter>
            </div>

            <pre
                style={{
                    marginTop: 16,
                    fontSize: 12,
                    color: "#666",
                    background: "#f0f0f0",
                    padding: 12,
                    borderRadius: 6,
                    overflow: "auto",
                }}
            >
                {`delay=${DELAY}ms\naccumulateConsecutiveDelays=${current.accumulateConsecutiveDelays ?? false}\nspecialCharacters=${JSON.stringify(current.specialCharacters ?? null, null, 2)}`}
            </pre>
        </div>
    );
}
