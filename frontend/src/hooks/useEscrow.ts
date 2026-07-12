import useSWR from "swr";
import { getEscrow } from "../lib/stellar/client";

export function useEscrow(vaultId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    vaultId === null ? null : ["escrow", vaultId],
    () => getEscrow(vaultId as number),
    { refreshInterval: 4000, revalidateOnFocus: false },
  );

  return { escrow: data ?? null, error, isLoading, refresh: mutate };
}
