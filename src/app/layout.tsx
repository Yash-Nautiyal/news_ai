import type { Metadata } from "next";
import { Montserrat, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const montserratSans = Montserrat({
  variable: "--font-sans-main",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono-main",
  subsets: ["latin"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-hindi",
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "DIPR UP Media Monitor",
  description: "Government media monitoring platform",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserratSans.variable} ${geistMono.variable} ${notoDevanagari.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
