import { Shield, Wifi, WifiOff, BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { WalletButton } from "./WalletButton";
import { FaucetButton } from "./FaucetButton";

interface LayoutProps {
  children: ReactNode;
  isConnected: boolean;
  onShowDocs?: () => void;
  showingDocs?: boolean;
}

export function Layout({ children, isConnected, onShowDocs, showingDocs }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="relative border-b border-slate-light/30 bg-abyss/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-7 h-7 text-decrypt" strokeWidth={1.5} />
              <div className="absolute inset-0 animate-ping opacity-20">
                <Shield className="w-7 h-7 text-decrypt" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                <span className="text-decrypt">BITE</span>{" "}
                <span className="text-slate-300">Market</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-[family-name:var(--font-mono)]">
                Encrypted Data Marketplace for AI Agents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-[family-name:var(--font-mono)] text-muted">
              <span className="px-2 py-0.5 bg-slate-deep rounded border border-slate-light/20">
                Base Sepolia
              </span>
              <span className="px-2 py-0.5 bg-slate-deep rounded border border-secure/30 text-secure">
                BITE V2 Threshold
              </span>
            </div>
            {onShowDocs && (
              <button
                onClick={onShowDocs}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider transition-all ${
                  showingDocs
                    ? "border-decrypt/50 bg-decrypt/20 text-decrypt"
                    : "border-slate-light/20 bg-slate-deep text-muted hover:border-decrypt/30 hover:text-decrypt"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                API Docs
              </button>
            )}
            <FaucetButton />
            <WalletButton />
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-secure" />
                  <span className="text-xs text-secure font-[family-name:var(--font-mono)]">
                    LIVE
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-danger" />
                  <span className="text-xs text-danger font-[family-name:var(--font-mono)]">
                    OFFLINE
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Subtle gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-decrypt/40 to-transparent" />
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-4">
        {children}
      </main>

      {/* Footer accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-light/20 to-transparent" />
    </div>
  );
}
