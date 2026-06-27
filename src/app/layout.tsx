import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Spectral, Hanken_Grotesk } from "next/font/google";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Quintral Insight — Ciencia abierta del bosque esclerófilo",
  description:
    "Identificación con IA, mapa georreferenciado y ciencia ciudadana sobre el quintral (Tristerix corymbosus) y sus árboles hospederos en Chile.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${spectral.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
