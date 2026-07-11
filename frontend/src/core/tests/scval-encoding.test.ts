import { describe, expect, it } from "vitest";
import { nativeToScVal } from "@stellar/stellar-sdk";

/**
 * Regression test for value encoding rules: initialize_vault can trap on-chain
 * (HostError(WasmVm, InvalidAction) / UnreachableCodeReached) if
 * nativeToScVal(bigint[]) with no type hint encodes each element as the
 * smallest XDR type that fits the value, not i128.
 */
describe("stage amount ScVal encoding", () => {
  it("encodes each element of a bigint[] as i128 when { type: 'i128' } is passed", () => {
    const amounts = [10_000_000n, 20_000_000n];
    const scVal = nativeToScVal(amounts, { type: "i128" });
    const vec = scVal.vec();
    expect(vec).toHaveLength(2);
    for (const el of vec!) {
      expect(el.switch().name).toBe("scvI128");
    }
  });

  it("regression guard: omitting the type hint does NOT produce i128", () => {
    const amounts = [10_000_000n, 20_000_000n];
    const scVal = nativeToScVal(amounts);
    const vec = scVal.vec();
    expect(vec![0].switch().name).not.toBe("scvI128");
  });
});
