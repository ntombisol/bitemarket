import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Lock, Unlock, CheckCircle, AlertCircle, ExternalLink, Wallet, Type } from "lucide-react";
import type { SellerInfo, ParamField } from "../hooks/useRegistry";
import { usePayingFetch } from "../hooks/usePayingFetch";

const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org";
const BITE_EXPLORER = "https://base-sepolia-testnet-explorer.skalenodes.com:10032";

interface QueryPanelProps {
  sellers: SellerInfo[];
  selectedSellerId: string | null;
  onSelectSeller: (id: string) => void;
}

interface TxInfo {
  queryDecrypt?: string | null;
  responseDecrypt?: string | null;
  payment?: string | null;
}

interface QueryResult {
  responseId: string;
  sellerId: string;
  sellerName: string;
  encryptedQuery: string;
  encryptedResponse: string;
  priceUsd: string;
  decryptedData?: unknown;
  transactions?: TxInfo;
}

type QueryState = "idle" | "encrypting" | "processing" | "paying" | "decrypting" | "done" | "error";

const STATE_LABELS: Record<QueryState, string> = {
  idle: "Ready",
  encrypting: "Encrypting query with BITE...",
  processing: "Server processing...",
  paying: "Awaiting x402 payment...",
  decrypting: "Decrypting response...",
  done: "Complete",
  error: "Error",
};

export function QueryPanel({ sellers, selectedSellerId, onSelectSeller }: QueryPanelProps) {
  const [query, setQuery] = useState("");
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const [useFreeText, setUseFreeText] = useState(false);
  const [state, setState] = useState<QueryState>("idle");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, address } = useAccount();
  const { payingFetch, isReady: walletReady } = usePayingFetch();
  const useWallet = isConnected && walletReady;

  const selectedSeller = sellers.find((s) => s.id === selectedSellerId);
  const hasParams = selectedSeller && Object.keys(selectedSeller.params || {}).length > 0;
  const isLoading = !["idle", "done", "error"].includes(state);

  // Reset param values when seller changes
  useEffect(() => {
    if (!selectedSeller?.params) { setParamValues({}); return; }
    const defaults: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(selectedSeller.params)) {
      if (field.default !== undefined) defaults[key] = field.default;
      else if (field.type === "string[]" && field.options) defaults[key] = [field.options[0]];
      else if (field.options) defaults[key] = field.options[0];
      else defaults[key] = "";
    }
    setParamValues(defaults);
  }, [selectedSellerId]);

  /** Build request body with either params or query */
  function buildRequestBody() {
    const body: Record<string, unknown> = { sellerId: selectedSellerId };
    if (!useFreeText && hasParams) {
      body.params = paramValues;
    } else {
      body.query = query.trim();
    }
    return body;
  }

  /** Server-side demo flow (no wallet needed) */
  async function handleDemoFlow() {
    setState("encrypting");
    await sleep(400);
    setState("processing");

    const res = await fetch("/query/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildRequestBody()),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 402) {
      setResult({
        responseId: data.responseId || "",
        sellerId: data.sellerId || selectedSellerId!,
        sellerName: "",
        encryptedQuery: data.encryptedQuery || "",
        encryptedResponse: data.encryptedResponse || "",
        priceUsd: data.priceUsd || "",
      });
      throw new Error(data.error || "Payment required — insufficient USDC or payment rejected");
    }

    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

    setState("paying");
    await sleep(300);
    setState("decrypting");
    await sleep(200);

    setResult({
      ...data,
      decryptedData: data.decryptedData,
      transactions: data.transactions,
    });
    setState("done");
  }

  /** Client-side wallet payment flow */
  async function handleWalletFlow() {
    if (!payingFetch) throw new Error("Wallet not ready");

    // 1. Prepare query (server encrypts + processes, but does NOT pay)
    setState("encrypting");
    await sleep(400);
    setState("processing");

    const prepRes = await fetch("/query/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildRequestBody(),
        buyerAddress: address,
      }),
    });

    const prepData = await prepRes.json().catch(() => ({}));
    if (!prepRes.ok) throw new Error(prepData.error || `Server error ${prepRes.status}`);

    setResult({
      responseId: prepData.responseId,
      sellerId: prepData.sellerId,
      sellerName: prepData.sellerName,
      encryptedQuery: prepData.encryptedQuery || "",
      encryptedResponse: prepData.encryptedResponse || "",
      priceUsd: prepData.priceUsd,
      transactions: prepData.transactions,
    });

    // 2. Client-side x402 payment via MetaMask
    setState("paying");
    const paymentUrl = `${window.location.origin}${prepData.paymentUrl}`;
    const payRes = await Promise.race([
      payingFetch(paymentUrl),
      sleep(60000).then(() => { throw new Error("Payment timed out after 60s. The facilitator may be slow — try again."); }),
    ]) as Response;

    if (!payRes.ok) {
      const errText = await payRes.text().catch(() => "Payment failed");
      throw new Error(`Payment failed (${payRes.status}): ${errText}`);
    }

    const payData = await payRes.json();

    // Extract payment tx hash from x402 response headers
    let paymentTxHash: string | null = null;
    const receiptHeader = payRes.headers.get("payment-response")
      || payRes.headers.get("x-payment-response");
    if (receiptHeader) {
      try {
        const decoded = atob(receiptHeader);
        const receipt = JSON.parse(decoded);
        paymentTxHash = receipt?.transaction || null;
      } catch {
        try {
          const receipt = JSON.parse(receiptHeader);
          paymentTxHash = receipt?.transaction || null;
        } catch { /* ignore */ }
      }
    }

    // 3. Decrypted
    setState("decrypting");
    await sleep(200);

    setResult({
      responseId: prepData.responseId,
      sellerId: prepData.sellerId,
      sellerName: prepData.sellerName,
      encryptedQuery: prepData.encryptedQuery || "",
      encryptedResponse: prepData.encryptedResponse || "",
      priceUsd: prepData.priceUsd,
      decryptedData: payData.data,
      transactions: {
        ...prepData.transactions,
        responseDecrypt: payData._meta?.biteTxHash || null,
        payment: paymentTxHash,
      },
    });
    setState("done");
  }

  const canSubmit = selectedSellerId && !isLoading && (
    useFreeText || !hasParams ? query.trim().length > 0 : true
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setResult(null);

    try {
      if (useWallet) {
        await handleWalletFlow();
      } else {
        await handleDemoFlow();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      // Provide user-friendly messages for common wallet errors
      if (msg.includes("User rejected") || msg.includes("user rejected")) {
        setError("Transaction rejected in wallet. Try again when ready.");
      } else if (msg.includes("insufficient funds") || msg.includes("exceeds the balance")) {
        setError("Insufficient USDC balance. Use the Faucet to get test tokens.");
      } else if (msg.includes("connector not connected") || msg.includes("Connector not connected")) {
        setError("Wallet disconnected. Please reconnect and try again.");
      } else {
        setError(msg);
      }
      setState("error");
    }
  }

  function handleReset() {
    setState("idle");
    setResult(null);
    setError(null);
    setQuery("");
  }

  return (
    <div className="bg-abyss border border-slate-light/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-light/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-cipher" />
          <span className="text-xs font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider">
            Query Terminal
          </span>
        </div>
        <StatusBadge state={state} />
      </div>

      {/* Mode indicator */}
      <div className={`px-4 py-1.5 border-b text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider flex items-center gap-1.5 ${
        useWallet
          ? "border-payment/20 bg-payment/5 text-payment"
          : "border-slate-light/10 bg-slate-deep/30 text-muted"
      }`}>
        {useWallet ? (
          <>
            <Wallet className="w-3 h-3" />
            Wallet Payment Mode — your wallet pays via x402
          </>
        ) : (
          <>
            <Send className="w-3 h-3" />
            Demo Mode — server pays automatically
          </>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {/* Seller select */}
        <div>
          <label className="text-[10px] font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider block mb-1.5">
            Data Provider
          </label>
          <select
            value={selectedSellerId || ""}
            onChange={(e) => onSelectSeller(e.target.value)}
            disabled={isLoading}
            className="w-full bg-slate-deep border border-slate-light/20 rounded px-3 py-2 text-sm text-slate-300 font-[family-name:var(--font-mono)] focus:outline-none focus:border-decrypt/40 transition-colors disabled:opacity-40"
          >
            <option value="">Select a seller...</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — ${s.priceUsd}
              </option>
            ))}
          </select>
        </div>

        {/* Param inputs or free-text query */}
        {hasParams && !useFreeText ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider">
                Parameters
              </label>
              <button
                type="button"
                onClick={() => setUseFreeText(true)}
                className="text-[10px] font-[family-name:var(--font-mono)] px-2 py-0.5 rounded border border-slate-light/20 text-muted hover:text-decrypt hover:border-decrypt/40 transition-colors flex items-center gap-1"
              >
                <Type className="w-3 h-3" /> Switch to free text
              </button>
            </div>
            <p className="text-[10px] text-muted/70 leading-relaxed">
              Choose what data you want from <span className="text-slate-300">{selectedSeller!.name}</span>. Your selections are encrypted before sending.
            </p>
            {Object.entries(selectedSeller!.params).map(([key, field]) => (
              <ParamInput
                key={key}
                name={key}
                field={field}
                value={paramValues[key]}
                onChange={(v) => setParamValues((prev) => ({ ...prev, [key]: v }))}
                disabled={isLoading}
              />
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider">
                Query (will be encrypted)
              </label>
              {hasParams && (
                <button
                  type="button"
                  onClick={() => setUseFreeText(false)}
                  className="text-[10px] font-[family-name:var(--font-mono)] px-2 py-0.5 rounded border border-slate-light/20 text-muted hover:text-decrypt hover:border-decrypt/40 transition-colors flex items-center gap-1"
                >
                  Switch to structured params
                </button>
              )}
            </div>
            {hasParams && (
              <p className="text-[10px] text-muted/70 mb-1.5 leading-relaxed">
                Type naturally — keywords like city names or token symbols will be detected automatically.
              </p>
            )}
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              placeholder={
                selectedSeller
                  ? `Ask ${selectedSeller.name} something...`
                  : "Select a seller first..."
              }
              rows={2}
              className="w-full bg-slate-deep border border-slate-light/20 rounded px-3 py-2 text-sm text-slate-300 font-[family-name:var(--font-mono)] placeholder:text-muted/30 focus:outline-none focus:border-decrypt/40 transition-colors resize-none disabled:opacity-40"
            />
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${
              useWallet
                ? "bg-payment/20 border border-payment/40 text-payment hover:bg-payment/30 hover:border-payment/60"
                : "bg-cipher/20 border border-cipher/40 text-cipher hover:bg-cipher/30 hover:border-cipher/60"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : useWallet ? (
              <Wallet className="w-3.5 h-3.5" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {isLoading
              ? STATE_LABELS[state]
              : useWallet
                ? "Pay & Query"
                : "Send Encrypted Query"}
          </button>
          {(state === "done" || state === "error") && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2.5 rounded font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider border border-slate-light/20 text-muted hover:border-slate-light/40 hover:text-slate-300 transition-all"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-danger/10 border border-danger/30 text-danger text-xs font-[family-name:var(--font-mono)]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && state === "done" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-light/20"
          >
            <div className="p-4 space-y-3">
              {/* Encrypted view */}
              <div
                className="rounded border p-3"
                style={{
                  borderColor: "var(--color-cipher)30",
                  backgroundColor: "color-mix(in srgb, var(--color-cipher) 3%, var(--color-abyss))",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3 h-3 text-cipher" />
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-cipher uppercase tracking-wider">
                    Encrypted Response
                  </span>
                </div>
                <p className="text-[10px] font-[family-name:var(--font-mono)] text-cipher/60 break-all leading-relaxed max-h-16 overflow-hidden">
                  {result.encryptedResponse?.slice(0, 200)}...
                </p>
              </div>

              {/* Decrypted view */}
              {result.decryptedData ? (
                <div
                  className="rounded border p-3"
                  style={{
                    borderColor: "var(--color-secure)30",
                    backgroundColor: "color-mix(in srgb, var(--color-secure) 3%, var(--color-abyss))",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Unlock className="w-3 h-3 text-secure" />
                    <span className="text-[10px] font-[family-name:var(--font-mono)] text-secure uppercase tracking-wider">
                      Decrypted Data
                    </span>
                  </div>
                  <pre className="text-[10px] font-[family-name:var(--font-mono)] text-secure/90 break-all leading-relaxed max-h-40 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(result.decryptedData, null, 2)}
                  </pre>
                </div>
              ) : null}

              {/* On-chain transactions */}
              {result.transactions && (
                <TransactionLinks txs={result.transactions} priceUsd={result.priceUsd} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ state }: { state: QueryState }) {
  const colorMap: Record<QueryState, string> = {
    idle: "muted",
    encrypting: "cipher",
    processing: "decrypt",
    paying: "payment",
    decrypting: "secure",
    done: "secure",
    error: "danger",
  };
  const color = colorMap[state];

  if (state === "idle") return null;

  return (
    <span
      className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{
        color: `var(--color-${color})`,
        backgroundColor: `color-mix(in srgb, var(--color-${color}) 15%, transparent)`,
      }}
    >
      {state === "done" ? (
        <span className="flex items-center gap-1">
          <CheckCircle className="w-2.5 h-2.5" /> Complete
        </span>
      ) : (
        STATE_LABELS[state]
      )}
    </span>
  );
}

function TransactionLinks({ txs, priceUsd }: { txs: TxInfo; priceUsd: string }) {
  const links: { label: string; chain: string; hash: string; explorer: string }[] = [];

  if (txs.queryDecrypt) {
    links.push({
      label: "Query Decrypt",
      chain: "BITE V2",
      hash: txs.queryDecrypt,
      explorer: `${BITE_EXPLORER}/tx/${txs.queryDecrypt}`,
    });
  }
  if (txs.responseDecrypt) {
    links.push({
      label: "Response Decrypt",
      chain: "BITE V2",
      hash: txs.responseDecrypt,
      explorer: `${BITE_EXPLORER}/tx/${txs.responseDecrypt}`,
    });
  }
  if (txs.payment) {
    links.push({
      label: `USDC Payment (${priceUsd})`,
      chain: "Base Sepolia",
      hash: txs.payment,
      explorer: `${BASE_SEPOLIA_EXPLORER}/tx/${txs.payment}`,
    });
  }

  if (links.length === 0) return null;

  return (
    <div className="rounded border border-slate-light/20 p-3 bg-slate-deep/30">
      <div className="flex items-center gap-1.5 mb-2">
        <ExternalLink className="w-3 h-3 text-payment" />
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-payment uppercase tracking-wider">
          On-Chain Transactions
        </span>
      </div>
      <div className="space-y-1.5">
        {links.map((link) => (
          <a
            key={link.hash}
            href={link.explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-muted shrink-0">
                {link.label}
              </span>
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-slate-500 truncate">
                {link.hash.slice(0, 10)}...{link.hash.slice(-8)}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-muted/60">
                {link.chain}
              </span>
              <ExternalLink className="w-2.5 h-2.5 text-muted/40 group-hover:text-payment transition-colors" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function ParamInput({
  name,
  field,
  value,
  onChange,
  disabled,
}: {
  name: string;
  field: ParamField;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const inputCls =
    "w-full bg-slate-deep border border-slate-light/20 rounded px-3 py-1.5 text-sm text-slate-300 font-[family-name:var(--font-mono)] focus:outline-none focus:border-decrypt/40 transition-colors disabled:opacity-40";

  if (field.type === "string[]" && field.options) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div>
        <label className="text-[10px] font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider block mb-1">
          {name} {field.required && <span className="text-danger">*</span>}
          {field.description && <span className="normal-case text-muted/60 ml-1">— {field.description}</span>}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange(
                    active
                      ? selected.filter((s) => s !== opt)
                      : [...selected, opt],
                  )
                }
                className={`px-2.5 py-1 rounded text-xs font-[family-name:var(--font-mono)] border transition-all disabled:opacity-40 ${
                  active
                    ? "border-decrypt/60 bg-decrypt/15 text-decrypt"
                    : "border-slate-light/20 bg-slate-deep text-muted hover:border-slate-light/40"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.options) {
    return (
      <div>
        <label className="text-[10px] font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider block mb-1">
          {name} {field.required && <span className="text-danger">*</span>}
          {field.description && <span className="normal-case text-muted/60 ml-1">— {field.description}</span>}
        </label>
        <select
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputCls}
        >
          {!field.required && <option value="">—</option>}
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        <label className="text-[10px] font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider block mb-1">
          {name} {field.required && <span className="text-danger">*</span>}
          {field.description && <span className="normal-case text-muted/60 ml-1">— {field.description}</span>}
        </label>
        <input
          type="number"
          value={(value as number) ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          disabled={disabled}
          className={inputCls}
        />
      </div>
    );
  }

  return (
    <div>
      <label className="text-[10px] font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider block mb-1">
        {name} {field.required && <span className="text-danger">*</span>}
        {field.description && <span className="normal-case text-muted/60 ml-1">— {field.description}</span>}
      </label>
      <input
        type="text"
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={field.default ? String(field.default) : ""}
        className={inputCls}
      />
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
