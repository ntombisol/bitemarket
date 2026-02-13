import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { baseSepolia } from "wagmi/chains";
import { Wallet, LogOut, AlertTriangle } from "lucide-react";

export function WalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const wrongChain = isConnected && chain?.id !== baseSepolia.id;

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        disabled={isConnecting}
        className="flex items-center gap-2 px-3 py-1.5 rounded border border-payment/40 bg-payment/10 text-payment text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider hover:bg-payment/20 hover:border-payment/60 transition-all disabled:opacity-40"
      >
        <Wallet className="w-3.5 h-3.5" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (wrongChain) {
    return (
      <button
        onClick={() => switchChain({ chainId: baseSepolia.id })}
        className="flex items-center gap-2 px-3 py-1.5 rounded border border-danger/40 bg-danger/10 text-danger text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider hover:bg-danger/20 transition-all"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Switch to Base Sepolia
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-payment/10 border border-payment/30">
        <div className="w-1.5 h-1.5 rounded-full bg-payment animate-pulse" />
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-payment">
          {address!.slice(0, 6)}...{address!.slice(-4)}
        </span>
      </div>
      <button
        onClick={() => disconnect()}
        className="p-1.5 rounded border border-slate-light/20 text-muted hover:text-danger hover:border-danger/40 transition-all"
        title="Disconnect"
      >
        <LogOut className="w-3 h-3" />
      </button>
    </div>
  );
}
