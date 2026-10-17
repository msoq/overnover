import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "overnover",
  description: "Turn study material into exercises, and review your mistakes until they stick.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="brand">
            overnover
          </Link>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
