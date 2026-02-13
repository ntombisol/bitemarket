import { useState, useEffect } from "react";

export interface ParamField {
  type: "string" | "string[]" | "number";
  required?: boolean;
  default?: unknown;
  options?: string[];
  description?: string;
}

export interface SellerInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  priceUsd: string;
  params: Record<string, ParamField>;
  sampleResponse: unknown;
}

export function useRegistry() {
  const [sellers, setSellers] = useState<SellerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/registry")
      .then((r) => r.json())
      .then((data) => {
        setSellers(data.sellers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { sellers, loading };
}
