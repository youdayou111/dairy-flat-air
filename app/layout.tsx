import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dairy Flat Air",
  description: "Point-to-point luxury jet booking from Dairy Flat Airport"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
