import { useState, useEffect, useRef } from "react";
import { Lock, Unlock, Eye, EyeOff } from "lucide-react";
import type { FlowEvent } from "../hooks/useEventStream";

interface EncryptionDemoProps {
  events: FlowEvent[];
}

// Characters for cipher scramble animation
const CIPHER_CHARS = "0123456789abcdef";

function useScramble(target: string, active: boolean) {
  const [display, setDisplay] = useState(target);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!active || !target) {
      setDisplay(target);
      return;
    }

    let iteration = 0;
    const maxIterations = 12;

    function tick() {
      iteration++;
      if (iteration >= maxIterations) {
        setDisplay(target);
        return;
      }
      const scrambled = target
        .split("")
        .map((ch, i) => {
          if (i < (iteration / maxIterations) * target.length) return ch;
          return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
        })
        .join("");
      setDisplay(scrambled);
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, active]);

  return display;
}

export function EncryptionDemo({ events }: EncryptionDemoProps) {
  // Find the most recent encrypted query and decrypted query
  const recentEncrypted = [...events]
    .reverse()
    .find((e) => e.type === "query_received");
  const recentDecrypted = [...events]
    .reverse()
    .find((e) => e.type === "query_decrypted");
  const recentResponseEnc = [...events]
    .reverse()
    .find((e) => e.type === "response_encrypted");
  const recentDelivered = [...events]
    .reverse()
    .find((e) => e.type === "data_delivered");

  const encQuery = (recentEncrypted?.data?.encryptedQuery as string) || "";
  const plainQuery = (recentDecrypted?.data?.plaintextQuery as string) || "";
  const encResponse = (recentResponseEnc?.data?.encryptedResponse as string) || "";
  const plainResponse = recentDelivered?.data?.response
    ? JSON.stringify(recentDelivered.data.response, null, 2).slice(0, 200)
    : "";

  const scrambledCipher = useScramble(encQuery.slice(0, 120), !!encQuery);

  const hasData = encQuery || plainQuery;

  return (
    <div className="bg-abyss border border-slate-light/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-light/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider">
            Encryption Comparison
          </span>
        </div>
      </div>

      <div className="p-4">
        {!hasData ? (
          <div className="text-center py-6 text-muted/40 text-xs font-[family-name:var(--font-mono)]">
            Send a query to see encryption in action
          </div>
        ) : (
          <div className="space-y-3">
            {/* Query comparison */}
            <div>
              <p className="text-[10px] font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider mb-2">
                Query
              </p>
              <div className="grid grid-cols-2 gap-2">
                <CipherBlock
                  icon={EyeOff}
                  label="On-Chain / Observer View"
                  data={scrambledCipher || "Awaiting..."}
                  color="cipher"
                  isEncrypted
                />
                <CipherBlock
                  icon={Eye}
                  label="Authorized Party View"
                  data={plainQuery || "Awaiting decryption..."}
                  color="secure"
                  isEncrypted={false}
                />
              </div>
            </div>

            {/* Response comparison */}
            {(encResponse || plainResponse) && (
              <div>
                <p className="text-[10px] font-[family-name:var(--font-mono)] text-muted uppercase tracking-wider mb-2">
                  Response
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <CipherBlock
                    icon={EyeOff}
                    label="Encrypted Response"
                    data={encResponse ? encResponse.slice(0, 120) + "..." : "Awaiting..."}
                    color="cipher"
                    isEncrypted
                  />
                  <CipherBlock
                    icon={Eye}
                    label="Decrypted Data"
                    data={plainResponse || "Awaiting payment..."}
                    color="secure"
                    isEncrypted={false}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CipherBlock({
  icon: Icon,
  label,
  data,
  color,
  isEncrypted,
}: {
  icon: typeof Lock;
  label: string;
  data: string;
  color: string;
  isEncrypted: boolean;
}) {
  return (
    <div
      className="rounded border p-2.5"
      style={{
        borderColor: `var(--color-${color})25`,
        backgroundColor: `color-mix(in srgb, var(--color-${color}) 3%, var(--color-abyss))`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon
          className="w-3 h-3"
          style={{ color: `var(--color-${color})` }}
        />
        <span
          className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider"
          style={{ color: `var(--color-${color})` }}
        >
          {label}
        </span>
      </div>
      <div
        className={`text-[10px] font-[family-name:var(--font-mono)] leading-relaxed break-all max-h-20 overflow-hidden ${
          isEncrypted ? "opacity-70" : ""
        }`}
        style={{ color: `var(--color-${color})` }}
      >
        {isEncrypted ? (
          <span className="select-none">{data}</span>
        ) : (
          <span>{data}</span>
        )}
      </div>
    </div>
  );
}
