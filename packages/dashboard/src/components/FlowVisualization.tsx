import { motion, AnimatePresence } from "framer-motion";
import { User, ShieldCheck, Store, Lock, Unlock, ArrowRight, Zap } from "lucide-react";
import type { FlowEvent } from "../hooks/useEventStream";

interface FlowVisualizationProps {
  events: FlowEvent[];
  latestEvent: FlowEvent | null;
}

const STEPS = [
  { key: "query_received", label: "Query Encrypted", icon: Lock, color: "cipher" },
  { key: "query_decrypted", label: "Query Decrypted", icon: Unlock, color: "decrypt" },
  { key: "seller_processing", label: "Processing", icon: Zap, color: "decrypt" },
  { key: "response_encrypted", label: "Response Encrypted", icon: Lock, color: "cipher" },
  { key: "payment_required", label: "Payment Required", icon: Zap, color: "payment" },
  { key: "payment_confirmed", label: "Payment Confirmed", icon: Zap, color: "payment" },
  { key: "data_delivered", label: "Data Delivered", icon: Unlock, color: "secure" },
] as const;

function getActiveStepIndex(latestEvent: FlowEvent | null): number {
  if (!latestEvent) return -1;
  return STEPS.findIndex((s) => s.key === latestEvent.type);
}

function getColorClass(color: string, type: "text" | "bg" | "border") {
  const map: Record<string, Record<string, string>> = {
    cipher: { text: "text-cipher", bg: "bg-cipher", border: "border-cipher/40" },
    decrypt: { text: "text-decrypt", bg: "bg-decrypt", border: "border-decrypt/40" },
    secure: { text: "text-secure", bg: "bg-secure", border: "border-secure/40" },
    payment: { text: "text-payment", bg: "bg-payment", border: "border-payment/40" },
  };
  return map[color]?.[type] || "";
}

export function FlowVisualization({ events, latestEvent }: FlowVisualizationProps) {
  const activeIdx = getActiveStepIndex(latestEvent);
  const isActive = activeIdx >= 0;

  // Find the most recent "transaction" events for display
  const recentEncrypted = [...events]
    .reverse()
    .find((e) => e.type === "query_received");
  const recentDecrypted = [...events]
    .reverse()
    .find((e) => e.type === "query_decrypted");

  return (
    <div className="bg-abyss border border-slate-light/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-light/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? "bg-secure animate-pulse" : "bg-muted"}`} />
          <span className="text-xs font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider">
            Flow Monitor
          </span>
        </div>
        {isActive && (
          <span className="text-[10px] font-[family-name:var(--font-mono)] text-secure">
            ACTIVE
          </span>
        )}
      </div>

      {/* Actor diagram */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          {/* Buyer */}
          <ActorNode
            icon={User}
            label="Buyer Agent"
            sublabel="Encrypted query"
            active={activeIdx >= 0 && activeIdx <= 1}
            color="decrypt"
          />

          {/* Arrow */}
          <div className="flex-1 mx-3 relative h-8 flex items-center">
            <div className="w-full h-px bg-slate-light/30" />
            <AnimatePresence>
              {activeIdx >= 0 && activeIdx < 3 && (
                <motion.div
                  key="packet-right"
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cipher shadow-[0_0_12px_rgba(249,115,22,0.6)]"
                  initial={{ left: "0%", opacity: 0 }}
                  animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              )}
            </AnimatePresence>
            <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
          </div>

          {/* Ciphermarket */}
          <ActorNode
            icon={ShieldCheck}
            label="Ciphermarket"
            sublabel="Encrypt & Route"
            active={activeIdx >= 2 && activeIdx <= 4}
            color="cipher"
          />

          {/* Arrow */}
          <div className="flex-1 mx-3 relative h-8 flex items-center">
            <div className="w-full h-px bg-slate-light/30" />
            <AnimatePresence>
              {activeIdx >= 2 && activeIdx < 5 && (
                <motion.div
                  key="packet-right-2"
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-cipher shadow-[0_0_12px_rgba(249,115,22,0.6)]"
                  initial={{ left: "0%", opacity: 0 }}
                  animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              )}
            </AnimatePresence>
            <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
          </div>

          {/* Seller */}
          <ActorNode
            icon={Store}
            label="Seller"
            sublabel="Data provider"
            active={activeIdx >= 2 && activeIdx <= 3}
            color="secure"
          />
        </div>
      </div>

      {/* Step pipeline */}
      <div className="px-4 py-4">
        <div className="flex gap-1">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = activeIdx >= idx;
            const isCurrent = activeIdx === idx;

            return (
              <motion.div
                key={step.key}
                className={`flex-1 px-1.5 py-2 rounded text-center relative overflow-hidden transition-all duration-300 ${
                  isCurrent
                    ? `bg-slate-deep border ${getColorClass(step.color, "border")}`
                    : isCompleted
                      ? "bg-slate-deep/60"
                      : "bg-slate-deep/20"
                }`}
                animate={isCurrent ? { scale: [1, 1.02, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Icon
                  className={`w-3.5 h-3.5 mx-auto mb-1 ${
                    isCompleted ? getColorClass(step.color, "text") : "text-muted/40"
                  }`}
                />
                <div
                  className={`text-[10px] font-[family-name:var(--font-mono)] leading-tight ${
                    isCompleted ? "text-slate-300" : "text-muted/30"
                  }`}
                >
                  {step.label}
                </div>
                {isCurrent && (
                  <motion.div
                    className={`absolute bottom-0 left-0 right-0 h-0.5 ${getColorClass(step.color, "bg")}`}
                    layoutId="step-indicator"
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Data preview */}
      {(recentEncrypted || recentDecrypted) && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            <DataPreview
              label="On-Chain View"
              sublabel="What observers see"
              data={
                (recentEncrypted?.data?.encryptedQuery as string) ||
                "No data yet"
              }
              color="cipher"
            />
            <DataPreview
              label="Buyer View"
              sublabel="After decryption"
              data={
                (recentDecrypted?.data?.plaintextQuery as string) ||
                "Awaiting decryption..."
              }
              color="secure"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ActorNode({
  icon: Icon,
  label,
  sublabel,
  active,
  color,
}: {
  icon: typeof User;
  label: string;
  sublabel: string;
  active: boolean;
  color: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${
        active ? "opacity-100" : "opacity-40"
      }`}
    >
      <div
        className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-all duration-500 ${
          active
            ? `border-${color}/40 bg-${color}/10`
            : "border-slate-light/20 bg-slate-deep/50"
        }`}
        style={
          active
            ? {
                boxShadow: `0 0 20px var(--color-${color})20, 0 0 4px var(--color-${color})40`,
                borderColor: `var(--color-${color})`,
                backgroundColor: `color-mix(in srgb, var(--color-${color}) 10%, transparent)`,
              }
            : undefined
        }
      >
        <Icon
          className="w-5 h-5"
          style={{ color: active ? `var(--color-${color})` : undefined }}
          strokeWidth={1.5}
        />
      </div>
      <span className="text-[10px] font-[family-name:var(--font-mono)] text-slate-400 whitespace-nowrap">
        {label}
      </span>
      <span className="text-[10px] text-muted whitespace-nowrap">{sublabel}</span>
    </div>
  );
}

function DataPreview({
  label,
  sublabel,
  data,
  color,
}: {
  label: string;
  sublabel: string;
  data: string;
  color: string;
}) {
  const isCipher = color === "cipher";
  return (
    <div
      className={`rounded border p-2.5 transition-all`}
      style={{
        borderColor: `var(--color-${color})30`,
        backgroundColor: `color-mix(in srgb, var(--color-${color}) 3%, var(--color-abyss))`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {isCipher ? (
          <Lock className="w-3 h-3" style={{ color: `var(--color-${color})` }} />
        ) : (
          <Unlock className="w-3 h-3" style={{ color: `var(--color-${color})` }} />
        )}
        <span
          className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider"
          style={{ color: `var(--color-${color})` }}
        >
          {label}
        </span>
      </div>
      <p className="text-[10px] text-muted mb-1.5">{sublabel}</p>
      <div className="font-[family-name:var(--font-mono)] text-[10px] leading-relaxed break-all max-h-12 overflow-hidden opacity-80">
        {isCipher ? (
          <span className="text-cipher/70">{data}</span>
        ) : (
          <span className="text-secure">{data}</span>
        )}
      </div>
    </div>
  );
}
