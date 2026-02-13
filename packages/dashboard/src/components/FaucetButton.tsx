import { useState } from "react";
import { useAccount } from "wagmi";
import { Droplets, Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

type FaucetState = "idle" | "requesting" | "success" | "error" | "cooldown";

export function FaucetButton() {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<FaucetState>("idle");
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isConnected) return null;

  async function handleDrip() {
    if (!address || state === "requesting") return;
    setState("requesting");
    setMessage("");
    setTxHash(null);

    try {
      const res = await fetch("/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setState("cooldown");
          setMessage(data.error || "Rate limited");
        } else {
          setState("error");
          setMessage(data.error || `Faucet error ${res.status}`);
        }
        setTimeout(() => { setState("idle"); setMessage(""); }, 8000);
        return;
      }

      setState("success");
      setMessage(`${data.usdcAmount} USDC + ${data.ethAmount} ETH`);
      setTxHash(data.usdcTxHash || null);
      setTimeout(() => { setState("idle"); setMessage(""); setTxHash(null); }, 15000);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Faucet error");
      setTimeout(() => { setState("idle"); setMessage(""); }, 5000);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleDrip}
        disabled={state === "requesting" || state === "success"}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-decrypt/30 bg-decrypt/10 text-decrypt text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider hover:bg-decrypt/20 hover:border-decrypt/50 transition-all disabled:opacity-40"
      >
        {state === "requesting" ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : state === "success" ? (
          <CheckCircle className="w-3 h-3" />
        ) : state === "error" || state === "cooldown" ? (
          <AlertCircle className="w-3 h-3" />
        ) : (
          <Droplets className="w-3 h-3" />
        )}
        {state === "requesting"
          ? "Sending..."
          : state === "success"
            ? "Sent!"
            : state === "cooldown"
              ? "Wait"
              : "Faucet"}
      </button>
      {message && (
        <span
          className={`text-[10px] font-[family-name:var(--font-mono)] max-w-[160px] truncate ${
            state === "error" || state === "cooldown" ? "text-danger" : "text-decrypt"
          }`}
        >
          {message}
        </span>
      )}
      {txHash && (
        <a
          href={`https://sepolia.basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted/50 hover:text-decrypt transition-colors"
        >
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      )}
    </div>
  );
}
