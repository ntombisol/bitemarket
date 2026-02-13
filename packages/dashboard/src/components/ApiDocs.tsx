import { ArrowLeft, Terminal, Zap, CreditCard, Database, Droplets, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";

interface ApiDocsProps {
  onBack: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded bg-slate-light/20 hover:bg-slate-light/40 transition-colors text-muted hover:text-slate-300"
      title="Copy to clipboard"
    >
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-secure" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="relative rounded-lg border border-slate-light/20 bg-void overflow-hidden">
      {label && (
        <div className="px-3 py-1.5 border-b border-slate-light/15 bg-slate-deep/50">
          <span className="text-[10px] font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider">{label}</span>
        </div>
      )}
      <CopyButton text={code} />
      <pre className="p-4 pr-12 text-[11px] font-[family-name:var(--font-mono)] text-slate-300 leading-relaxed overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function Endpoint({ method, path, description, children }: {
  method: "GET" | "POST";
  path: string;
  description: string;
  children: React.ReactNode;
}) {
  const methodColor = method === "GET" ? "text-secure" : "text-cipher";
  const methodBg = method === "GET" ? "bg-secure/15" : "bg-cipher/15";

  return (
    <div className="rounded-lg border border-slate-light/20 bg-abyss overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-light/15 flex items-center gap-3">
        <span className={`${methodColor} ${methodBg} px-2 py-0.5 rounded text-xs font-[family-name:var(--font-mono)] font-semibold`}>
          {method}
        </span>
        <code className="text-sm font-[family-name:var(--font-mono)] text-decrypt">{path}</code>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-slate-400 mb-3">{description}</p>
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color = "decrypt" }: {
  icon: typeof Terminal;
  title: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `color-mix(in srgb, var(--color-${color}) 12%, transparent)` }}
      >
        <Icon className="w-4 h-4" style={{ color: `var(--color-${color})` }} />
      </div>
      <h2 className="text-lg font-[family-name:var(--font-display)] font-semibold text-slate-200">
        {title}
      </h2>
    </div>
  );
}

const AGENT_EXAMPLE = `import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
const client = new x402Client();
client.register("eip155:84532", new ExactEvmScheme(account));
const payFetch = wrapFetchWithPayment(fetch, client);

// 1. Browse sellers (each has a params schema)
const { sellers } = await fetch("${location.origin}/registry")
  .then(r => r.json());
console.log(sellers[0].params); // { city: { type: "string", options: [...] } }

// 2. Submit structured params (server encrypts with BITE)
const { paymentUrl } = await fetch("${location.origin}/query/prepare", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sellerId: "crypto-prices",
    params: { tokens: ["BTC", "ETH"], currency: "USD" }
  }),
}).then(r => r.json());

// 3. Pay & get data (x402 handles USDC payment automatically)
const { data } = await payFetch("${location.origin}" + paymentUrl)
  .then(r => r.json());
console.log(data);`;

const CURL_EXAMPLE = `# 1. List available data sellers (each includes params schema)
curl ${location.origin}/registry

# 2a. Submit structured params (recommended for agents)
curl -X POST ${location.origin}/query/prepare \\
  -H "Content-Type: application/json" \\
  -d '{"sellerId": "weather-global", "params": {"city": "San Francisco"}}'

# 2b. Or use free-text query (params extracted automatically)
curl -X POST ${location.origin}/query/prepare \\
  -H "Content-Type: application/json" \\
  -d '{"sellerId": "weather-global", "query": "Weather in Tokyo?"}'

# 3. Pay & get data (requires x402 payment header)
# Use @x402/fetch or construct the EIP-712 payment manually`;

const FAUCET_EXAMPLE = `# Get test USDC sent to your wallet
curl -X POST ${location.origin}/faucet \\
  -H "Content-Type: application/json" \\
  -d '{"address": "0xYOUR_WALLET_ADDRESS"}'`;

export function ApiDocs({ onBack }: ApiDocsProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-[family-name:var(--font-mono)] text-muted hover:text-decrypt transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-[family-name:var(--font-display)] font-bold">
          <span className="text-decrypt">Buy Private Data</span>{" "}
          <span className="text-slate-300">with Your AI Agent</span>
        </h1>
        <p className="text-sm text-muted max-w-lg mx-auto leading-relaxed">
          3 endpoints. No SDK required. Your query is encrypted with{" "}
          <span className="text-cipher">SKALE BITE</span> threshold encryption.
          Payment via <span className="text-payment">x402</span> USDC micropayments on Base Sepolia.
        </p>
      </div>

      {/* Quick start steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { step: "1", label: "Discover", desc: "GET /registry", color: "decrypt", icon: Database },
          { step: "2", label: "Query with Params", desc: "POST /query/prepare", color: "cipher", icon: Terminal },
          { step: "3", label: "Pay & Get", desc: "GET /data/:id", color: "payment", icon: CreditCard },
        ].map((s) => (
          <div
            key={s.step}
            className="rounded-lg border p-4 text-center"
            style={{
              borderColor: `var(--color-${s.color})30`,
              backgroundColor: `color-mix(in srgb, var(--color-${s.color}) 4%, var(--color-abyss))`,
            }}
          >
            <s.icon className="w-5 h-5 mx-auto mb-2" style={{ color: `var(--color-${s.color})` }} />
            <div className="text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider mb-1" style={{ color: `var(--color-${s.color})` }}>
              Step {s.step}: {s.label}
            </div>
            <code className="text-[11px] font-[family-name:var(--font-mono)] text-slate-400">{s.desc}</code>
          </div>
        ))}
      </div>

      {/* Agent example */}
      <div>
        <SectionHeader icon={Zap} title="Minimal Agent Example" color="secure" />
        <p className="text-sm text-muted mb-3">
          Install 3 packages: <code className="text-decrypt text-xs">@x402/fetch @x402/evm viem</code> — then copy this:
        </p>
        <CodeBlock code={AGENT_EXAMPLE} label="TypeScript / JavaScript" />
      </div>

      {/* cURL example */}
      <div>
        <SectionHeader icon={Terminal} title="Quick Test with cURL" color="decrypt" />
        <CodeBlock code={CURL_EXAMPLE} label="Shell" />
      </div>

      {/* Params schema reference */}
      <div>
        <SectionHeader icon={Database} title="Params Schema" color="decrypt" />
        <p className="text-sm text-muted mb-3">
          Every seller in <code className="text-decrypt text-xs">/registry</code> includes a <code className="text-decrypt text-xs">params</code> object
          describing what structured data it accepts. Agents should read this schema to build requests programmatically.
        </p>
        <div className="rounded-lg border border-slate-light/20 bg-abyss overflow-hidden">
          <div className="px-4 py-3 space-y-3 text-sm">
            <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2 font-[family-name:var(--font-mono)] text-xs">
              <span className="text-decrypt font-semibold">type</span>
              <span className="text-slate-400"><code className="text-slate-300">"string"</code>, <code className="text-slate-300">"string[]"</code>, or <code className="text-slate-300">"number"</code> — the expected value type</span>

              <span className="text-decrypt font-semibold">required</span>
              <span className="text-slate-400"><code className="text-slate-300">true</code> if the field must be provided. Optional fields use <code className="text-slate-300">default</code> if omitted</span>

              <span className="text-decrypt font-semibold">options</span>
              <span className="text-slate-400">Array of valid values, e.g. <code className="text-slate-300">["BTC","ETH","SOL"]</code>. Send one of these (or multiple for <code className="text-slate-300">string[]</code>)</span>

              <span className="text-decrypt font-semibold">default</span>
              <span className="text-slate-400">Fallback value used when the field is not provided</span>

              <span className="text-decrypt font-semibold">description</span>
              <span className="text-slate-400">Human-readable explanation of what the field controls</span>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoint reference */}
      <div>
        <SectionHeader icon={Database} title="Endpoint Reference" color="cipher" />
        <div className="space-y-4">
          <Endpoint method="GET" path="/registry" description="List all available data sellers, their prices, and accepted parameters.">
            <CodeBlock
              code={`// Response
{
  "sellers": [
    {
      "id": "weather-global",
      "name": "Global Weather Intelligence",
      "description": "Real-time weather data...",
      "category": "weather",
      "priceUsd": "$0.001",
      "params": {
        "city": {
          "type": "string",
          "required": true,
          "options": ["San Francisco", "New York", "Tokyo", "London"],
          "description": "City name for weather data"
        }
      }
    }
  ]
}`}
              label="Response"
            />
          </Endpoint>

          <Endpoint method="POST" path="/query/prepare" description="Submit structured params or a free-text query. The server encrypts it with BITE and processes it. Returns a payment URL for x402.">
            <div className="space-y-3">
              <div className="rounded border border-decrypt/20 bg-decrypt/5 px-3 py-2 text-xs text-decrypt font-[family-name:var(--font-mono)]">
                Agents should send <strong>params</strong> (structured) instead of <strong>query</strong> (free-text).
                Read the seller's params schema from <code>/registry</code> to know exactly what to send.
                Free-text query is supported as a fallback but may produce ambiguous results.
              </div>
              <CodeBlock
                code={`// Request body — structured params (recommended for agents)
{
  "sellerId": "crypto-prices",
  "params": { "tokens": ["BTC", "ETH"], "currency": "USD" }
}

// OR free-text query (params extracted automatically)
{
  "sellerId": "weather-global",
  "query": "What's the weather in San Francisco?"
}`}
                label="Request"
              />
              <CodeBlock
                code={`// Response
{
  "responseId": "a1b2c3d4-...",
  "sellerId": "weather-global",
  "sellerName": "Global Weather Intelligence",
  "priceUsd": "$0.001",
  "paymentUrl": "/data/weather-global?responseId=a1b2c3d4-...",
  "encryptedQuery": "0xf902...",
  "encryptedResponse": "0xf903...",
  "transactions": {
    "queryDecrypt": "0xba7d..."
  }
}`}
                label="Response"
              />
            </div>
          </Endpoint>

          <Endpoint method="GET" path="/data/:sellerId?responseId=..." description="Fetch decrypted data. This endpoint is x402-gated — it returns 402 with payment requirements. Use @x402/fetch to handle payment automatically.">
            <div className="space-y-3">
              <div className="rounded border border-payment/20 bg-payment/5 px-3 py-2 text-xs text-payment font-[family-name:var(--font-mono)]">
                x402 flow: 402 response → your wallet signs EIP-712 → facilitator settles USDC on-chain → data returned
              </div>
              <CodeBlock
                code={`// Response (after payment)
{
  "data": {
    "city": "San Francisco",
    "temperature": 62.3,
    "conditions": "Partly cloudy",
    "humidity": 58,
    "wind": "12 mph NW"
  },
  "_meta": {
    "sellerId": "weather-global",
    "responseId": "a1b2c3d4-...",
    "decrypted": true,
    "biteTxHash": "0xc4e5..."
  }
}`}
                label="Response"
              />
            </div>
          </Endpoint>

          <Endpoint method="POST" path="/faucet" description="Get test USDC on Base Sepolia. Rate limited: 1 request per address per 10 minutes.">
            <div className="space-y-3">
              <CodeBlock code={FAUCET_EXAMPLE} label="Request" />
              <CodeBlock
                code={`// Response
{
  "success": true,
  "usdcAmount": "0.01",
  "ethAmount": "0.0001",
  "usdcTxHash": "0x1234...",
  "remainingDrips": 195
}`}
                label="Response"
              />
            </div>
          </Endpoint>
        </div>
      </div>

      {/* Network info */}
      <div>
        <SectionHeader icon={Droplets} title="Network Info" color="payment" />
        <div className="rounded-lg border border-slate-light/20 bg-abyss p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-[family-name:var(--font-mono)]">
            <div>
              <span className="text-muted text-xs uppercase tracking-wider">Chain</span>
              <p className="text-slate-300">Base Sepolia (84532)</p>
            </div>
            <div>
              <span className="text-muted text-xs uppercase tracking-wider">Payment</span>
              <p className="text-slate-300">USDC micropayments via x402</p>
            </div>
            <div>
              <span className="text-muted text-xs uppercase tracking-wider">USDC Contract</span>
              <p className="text-slate-400 text-xs break-all">0x036CbD53842c5426634e7929541eC2318f3dCF7e</p>
            </div>
            <div>
              <span className="text-muted text-xs uppercase tracking-wider">Facilitator</span>
              <p className="text-slate-400 text-xs">https://x402.org/facilitator</p>
            </div>
            <div>
              <span className="text-muted text-xs uppercase tracking-wider">Encryption</span>
              <p className="text-slate-300">SKALE BITE V2 (AES-256-GCM threshold)</p>
            </div>
            <div>
              <span className="text-muted text-xs uppercase tracking-wider">Need test USDC?</span>
              <p className="text-slate-300">POST /faucet or use the Faucet button</p>
            </div>
          </div>
        </div>
      </div>

      {/* Back to dashboard */}
      <div className="text-center pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-lg font-[family-name:var(--font-mono)] text-sm uppercase tracking-wider border border-decrypt/30 bg-decrypt/10 text-decrypt hover:bg-decrypt/20 hover:border-decrypt/50 transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
