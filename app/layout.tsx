import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://palletledger.com";
const description =
  "Track what you paid, what it's worth, and what it sold for — per item and per pallet. Built for B-Stock and liquidation resellers.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Pallet Ledger — Know what every pallet actually made you",
    template: "%s · Pallet Ledger",
  },
  description,
  openGraph: {
    title: "Pallet Ledger",
    description,
    url: siteUrl,
    siteName: "Pallet Ledger",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pallet Ledger",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body">{children}</body>
    </html>
  );
}
