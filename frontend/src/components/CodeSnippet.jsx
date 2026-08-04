import { useState } from 'react'
import toast from 'react-hot-toast'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('javascript', javascript)

const BASE = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export default function CodeSnippet({ modelId, apiKey }) {
  const [lang, setLang] = useState('python')

  const snippets = {
    python: `import requests

MODEL_ID = "${modelId}"
API_KEY  = "${apiKey || 'your_api_key_here'}"
BASE_URL = "${BASE}"

data = {
    "feature_1": 42,
    "feature_2": "value",
    # ... add your features here
}

response = requests.post(
    f"{BASE_URL}/predict/{MODEL_ID}",
    json={"data": data},
    headers={"X-API-Key": API_KEY}
)
print(response.json())
# → {"prediction": ..., "model_name": "...", "problem_type": "..."}`,

    bash: `curl -X POST "${BASE}/predict/${modelId}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'your_api_key_here'}" \\
  -d '{
    "data": {
      "feature_1": 42,
      "feature_2": "value"
    }
  }'`,

    javascript: `const MODEL_ID = "${modelId}";
const API_KEY  = "${apiKey || 'your_api_key_here'}";
const BASE_URL = "${BASE}";

const response = await fetch(
  \`\${BASE_URL}/predict/\${MODEL_ID}\`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    body: JSON.stringify({
      data: {
        feature_1: 42,
        feature_2: "value",
        // ... add your features
      },
    }),
  }
);
const result = await response.json();
console.log(result.prediction);`,
  }

  const copyCode = () => {
    navigator.clipboard.writeText(snippets[lang])
    toast.success('Copied to clipboard!')
  }

  return (
    <div>
      {/* Tab selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        {['python', 'bash', 'javascript'].map(l => (
          <button
            key={l}
            className={`btn btn-sm ${lang === l ? 'btn-outline' : 'btn-ghost'}`}
            onClick={() => setLang(l)}
          >
            {l === 'python' ? '🐍' : l === 'bash' ? '💻' : '🟨'} {l}
          </button>
        ))}
        <button className="btn btn-sm btn-ghost" onClick={copyCode} style={{ marginLeft: 'auto' }}>
          📋 Copy
        </button>
      </div>

      <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', fontSize: '0.82rem' }}>
        <SyntaxHighlighter
          language={lang}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1.25rem',
            background: '#0d0d16',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}
        >
          {snippets[lang]}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
