import { useState, useEffect } from "react";

export interface SellerInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  priceUsd: string;
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
