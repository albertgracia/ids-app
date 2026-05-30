import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IDS OT/IT Platform",
  description: "Industrial Intrusion Detection System Console",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
