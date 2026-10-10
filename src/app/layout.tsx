import type { Metadata } from "next";
import { Geist, Geist_Mono, Blaka } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const blaka = Blaka({
  weight: "400",
  variable: "--font-blaka",
  subsets: ["latin", "arabic"],
});

export const metadata: Metadata = {
  title: "Hams",
  description: "A premium messaging app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${blaka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
