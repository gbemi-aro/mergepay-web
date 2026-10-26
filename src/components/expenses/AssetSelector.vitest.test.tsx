import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AssetSelector } from "./AssetSelector";
import { SETTLEMENT_ASSETS } from "@/lib/constants";

// The selector's conversion preview depends on hooks that fetch live rates;
// stub them so tests exercise pure formatting/math deterministically.
vi.mock("@/hooks/useCurrencyRates", () => ({
  useCurrencyRates: () => ({
    rates: { xlm: 0.12, usdc: 1.0, live: true },
    isLive: true,
    isFetching: false,
  }),
  convertToFiat: (amount: string | number, assetCode: string) => {
    const num = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(num) || num < 0) return null;
    const rate = assetCode.toUpperCase() === "XLM" ? 0.12 : 1.0;
    return (num * rate).toFixed(2);
  },
}));

describe("AssetSelector", () => {
  it("lists every configured settlement asset", () => {
    render(<AssetSelector value="XLM" onChange={vi.fn()} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(
      SETTLEMENT_ASSETS.map((a) => a.code)
    );
    expect(select.value).toBe("XLM");
  });

  it("notifies the parent when the selected asset changes", () => {
    const onChange = vi.fn();
    render(<AssetSelector value="XLM" onChange={onChange} />);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: SETTLEMENT_ASSETS[1].code },
    });
    expect(onChange).toHaveBeenCalledWith(SETTLEMENT_ASSETS[1].code);
  });

  it("prompts for an amount when there is nothing to convert", () => {
    render(<AssetSelector value="XLM" onChange={vi.fn()} />);

    expect(
      screen.getByText("Enter an amount for a fiat preview.")
    ).toBeInTheDocument();
  });

  it("renders a live fiat equivalent of the entered amount", () => {
    render(
      <AssetSelector
        value="XLM"
        onChange={vi.fn()}
        cryptoAmount="10"
        fiatCurrency="USD"
      />
    );

    // 10 XLM × 0.12 USD/XLM → $1.20
    expect(screen.getByTestId("asset-equivalent")).toHaveTextContent(
      "≈ 1.20 USD"
    );
  });

  it("reports an unavailable preview for non-numeric amounts", () => {
    render(
      <AssetSelector
        value="XLM"
        onChange={vi.fn()}
        cryptoAmount="abc"
        fiatCurrency="USD"
      />
    );

    expect(screen.getByTestId("asset-equivalent")).toHaveTextContent(
      "Fiat preview unavailable."
    );
  });

  it("labels the selected asset with its transition name when provided", () => {
    render(
      <AssetSelector value="XLM" onChange={vi.fn()} name={() => "Lumen"} />
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("XLM (Lumen)");
  });
});
