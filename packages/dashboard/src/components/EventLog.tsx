import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  Zap,
  CreditCard,
  CheckCircle,
  XCircle,
  Send,
  Package,
} from "lucide-react";
import type { FlowEvent } from "../hooks/useEventStream";

interface EventLogProps {
  events: FlowEvent[];
}

const EVENT_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Lock }
> = {
  query_received: { label: "QUERY RECV", color: "cipher", icon: Lock },
  query_decrypted: { label: "DECRYPTED", color: "decrypt", icon: Unlock },
  seller_processing: { label: "PROCESSING", color: "decrypt", icon: Zap },
  response_encrypted: { label: "RESP ENCRYPTED", color: "cipher", icon: Lock },
  payment_required: { label: "PAY REQUIRED", color: "payment", icon: CreditCard },
  payment_confirmed: { label: "PAY CONFIRMED", color: "payment", icon: CheckCircle },
  payment_failed: { label: "PAY FAILED", color: "danger", icon: XCircle },
  data_delivered: { label: "DELIVERED", color: "secure", icon: Package },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function summarizeData(data: Record<string, unknown>): string {
  const parts: string[] = [];
  if (data.sellerId) parts.push(`seller=${data.sellerId}`);
  if (data.sellerName) parts.push(`${data.sellerName}`);
  if (data.plaintextQuery)
    parts.push(`query="${String(data.plaintextQuery).slice(0, 40)}"`);
  if (data.encryptedQuery)
    parts.push(`cipher=${String(data.encryptedQuery).slice(0, 24)}...`);
  if (data.priceUsd) parts.push(`$${data.priceUsd}`);
  if (data.responseId) parts.push(`rid=${String(data.responseId).slice(0, 8)}`);
  if (data.biteTxHash) parts.push(`tx:${truncateHash(String(data.biteTxHash))}`);
  if (data.paymentTxHash) parts.push(`pay:${truncateHash(String(data.paymentTxHash))}`);
  if (data.reason) parts.push(String(data.reason).slice(0, 50));
  if (parts.length === 0) return JSON.stringify(data).slice(0, 60);
  return parts.join(" | ");
}

export function EventLog({ events }: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="bg-abyss border border-slate-light/20 rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-light/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider">
            Event Stream
          </span>
        </div>
        <span className="text-[10px] font-[family-name:var(--font-mono)] text-muted">
          {events.length} events
        </span>
      </div>

      {/* Log body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 min-h-0"
        style={{ maxHeight: "400px" }}
      >
        {events.length === 0 && (
          <div className="text-center py-8 text-muted/50 text-xs font-[family-name:var(--font-mono)]">
            Waiting for events...
            <br />
            <span className="text-[10px]">Send a query to see the flow</span>
          </div>
        )}
        <AnimatePresence initial={false}>
          {events.map((event) => {
            const config = EVENT_CONFIG[event.type] || {
              label: event.type,
              color: "muted",
              icon: Zap,
            };
            const Icon = config.icon;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 py-1.5 border-b border-slate-light/10 last:border-0"
              >
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-muted/60 shrink-0 pt-0.5 w-16">
                  {formatTime(event.timestamp)}
                </span>
                <div
                  className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider"
                  style={{
                    color: `var(--color-${config.color})`,
                    backgroundColor: `color-mix(in srgb, var(--color-${config.color}) 12%, transparent)`,
                  }}
                >
                  <Icon className="w-2.5 h-2.5" />
                  {config.label}
                </div>
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-slate-400 truncate min-w-0">
                  {summarizeData(event.data)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
