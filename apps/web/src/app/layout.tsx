import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IDS OT/IT Platform",
  description: "Industrial Intrusion Detection System Console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
