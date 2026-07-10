import useSWR from "swr";
import { getVault } from "../handlers/soroban";

export function useVault(vaultId: number | null) {
  const { data, error, isLoading, mutate } = useSWR(
    vaultId === null ? null : ["vault", vaultId],
    () => getVault(vaultId as number),
    { refreshInterval: 4000, revalidateOnFocus: false },
  );

  return { vault: data ?? null, error, isLoading, refresh: mutate };
}
