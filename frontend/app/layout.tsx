import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/src/providers/WalletProvider";
import { Header } from "@/src/components/shared/Header";
import { Footer } from "@/src/components/shared/Footer";

export const metadata: Metadata = {
  title: "Astraea Trust — Escrow & Linear Vesting",
  description: "Stage-gated escrows and linear token streams secured transparently on Stellar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-[#090d16] text-slate-100 antialiased font-sans">
        <WalletProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
