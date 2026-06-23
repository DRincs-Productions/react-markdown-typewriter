import { useState } from "react";
import { MarkdownTypewriter } from "react-markdown-typewriter";

const DELAY = 30;

const SPECIAL_CHARACTERS = {
    ".": { delay: 500 },
    ",": { delay: 200 },
    "!": { delay: 600 },
    "?": { delay: 600 },
    ":": { delay: 300 },
};

const cases = [
    {
        label: "Punctuation pauses",
        text: "Hello, world. How are you? I am fine! Let me tell you: it works.",
    },
    {
        label: "Ellipsis — pause only at end",
        text: "Wait... it is working! And this... is great.",
    },
    {
        label: "Spaced dots — pause after each",
        text: "Wait. Wait. Wait. Now!",
    },
    {
        label: "No special chars (baseline)",
        text: "Hello, world. How are you? I am fine! Let me tell you: it works.",
    },
    {
        label: "Markdown",
        text: "**Bold text**, _italic_. And `code`? Yes!",
    },
];

export default function App() {
    const [active, setActive] = useState(0);
    const [key, setKey] = useState(0);
    const [useSpecial, setUseSpecial] = useState(true);

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

            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
                <label style={{ fontSize: 13 }}>
                    <input
                        type="checkbox"
                        checked={useSpecial}
                        onChange={(e) => {
                            setUseSpecial(e.target.checked);
                            setKey((k) => k + 1);
                        }}
                        style={{ marginRight: 4 }}
                    />
                    specialCharacters enabled
                </label>
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
                    specialCharacters={useSpecial ? SPECIAL_CHARACTERS : undefined}
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
                {`delay=${DELAY}ms\nspecialCharacters=${useSpecial ? JSON.stringify(SPECIAL_CHARACTERS, null, 2) : "undefined"}`}
            </pre>
        </div>
    );
}
