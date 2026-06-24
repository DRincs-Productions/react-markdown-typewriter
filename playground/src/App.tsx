import { useState } from "react";
import { MarkdownTypewriter } from "react-markdown-typewriter";

const DELAY = 30;

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
        specialCharacters: { ".": { delayAfter: 300 }, "?": { delayAfter: 400 }, "!": { delayAfter: 500 } },
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
];

export default function App() {
    const [active, setActive] = useState(0);
    const [key, setKey] = useState(0);

    const current = cases[active];

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

            <div
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
