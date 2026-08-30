import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pallet Ledger",
  description: "Track pallet flips, costs, and profit — built for resellers.",
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
