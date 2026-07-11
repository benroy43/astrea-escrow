import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/src/core/hooks/WalletContext";
import { SiteNav } from "@/src/modules/common/SiteNav";
import { SiteFooter } from "@/src/modules/common/SiteFooter";

export const metadata: Metadata = {
  title: "Zenith — Staged Settlement Vaults",
  description: "Funds unlock stage by stage, secured transparently on Stellar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-cyber-bg text-cyber-gray-400 antialiased cyber-grid-overlay">
        <WalletProvider>
          <SiteNav />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </WalletProvider>
      </body>
    </html>
  );
}
