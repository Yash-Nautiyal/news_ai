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
