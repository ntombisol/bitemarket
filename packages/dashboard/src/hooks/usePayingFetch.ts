import { useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { NETWORK } from "../lib/wagmi";

/**
 * Bridges wagmi WalletClient → x402 ClientEvmSigner → wrapFetchWithPayment.
 *
 * Returns a `payingFetch` that behaves like `fetch` but automatically
 * handles 402 Payment Required by prompting MetaMask for EIP-712 signature.
 */
export function usePayingFetch() {
  const { isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const payingFetch = useMemo(() => {
    if (!isConnected || !walletClient) return null;

    // Adapt wagmi WalletClient to x402's ClientEvmSigner interface
    const signer = {
      address: walletClient.account.address,
      signTypedData: (msg: {
        domain: Record<string, unknown>;
        types: Record<string, unknown>;
        primaryType: string;
        message: Record<string, unknown>;
      }) =>
        walletClient.signTypedData({
          account: walletClient.account,
          domain: msg.domain as any,
          types: msg.types as any,
          primaryType: msg.primaryType,
          message: msg.message,
        }),
    };

    const client = new x402Client();
    client.register(NETWORK, new ExactEvmScheme(signer as any));
    return wrapFetchWithPayment(fetch, client);
  }, [isConnected, walletClient]);

  return { payingFetch, isReady: !!payingFetch };
}
