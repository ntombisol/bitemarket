import { motion } from "framer-motion";
import { Cloud, TrendingUp, BarChart3, Database } from "lucide-react";
import type { SellerInfo } from "../hooks/useRegistry";

interface SellerCatalogProps {
  sellers: SellerInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

const CATEGORY_ICONS: Record<string, typeof Cloud> = {
  weather: Cloud,
  crypto: TrendingUp,
  signals: BarChart3,
};

const CATEGORY_COLORS: Record<string, string> = {
  weather: "decrypt",
  crypto: "cipher",
  signals: "payment",
};

export function SellerCatalog({ sellers, selectedId, onSelect, loading }: SellerCatalogProps) {
  if (loading) {
    return (
      <div className="bg-abyss border border-slate-light/20 rounded-lg p-6">
        <div className="flex items-center justify-center gap-2 text-muted text-xs font-[family-name:var(--font-mono)]">
          <div className="w-3 h-3 rounded-full bg-muted/30 animate-pulse" />
          Loading sellers...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-abyss border border-slate-light/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-light/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider">
            Data Providers
          </span>
        </div>
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-muted">
          {sellers.length} available
        </span>
      </div>

      {/* Cards */}
      <div className="p-3 grid gap-2">
        {sellers.map((seller, idx) => {
          const Icon = CATEGORY_ICONS[seller.category] || Database;
          const color = CATEGORY_COLORS[seller.category] || "decrypt";
          const isSelected = seller.id === selectedId;

          return (
            <motion.button
              key={seller.id}
              onClick={() => onSelect(seller.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.3 }}
              className={`w-full text-left rounded-lg border p-3 transition-all duration-300 group ${
                isSelected
                  ? "border-opacity-60"
                  : "border-slate-light/15 hover:border-slate-light/30"
              }`}
              style={
                isSelected
                  ? {
                      borderColor: `var(--color-${color})`,
                      backgroundColor: `color-mix(in srgb, var(--color-${color}) 6%, var(--color-slate-deep))`,
                      boxShadow: `0 0 16px color-mix(in srgb, var(--color-${color}) 15%, transparent)`,
                    }
                  : { backgroundColor: "var(--color-slate-deep)" }
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--color-${color}) ${isSelected ? "15" : "8"}%, transparent)`,
                    borderColor: `var(--color-${color})`,
                  }}
                >
                  <Icon
                    className="w-4 h-4 transition-colors"
                    style={{ color: `var(--color-${color})` }}
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-[family-name:var(--font-mono)] text-slate-200 font-medium">
                      {seller.name}
                    </span>
                    <span
                      className="text-[10px] font-[family-name:var(--font-mono)] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        color: `var(--color-${color})`,
                        backgroundColor: `color-mix(in srgb, var(--color-${color}) 12%, transparent)`,
                      }}
                    >
                      ${seller.priceUsd}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed truncate">
                    {seller.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
