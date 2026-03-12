import type { Metadata } from "next";
import { Playfair_Display, Poppins, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const headingFont = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading"
});

const bodyFont = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body"
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Temp Mail",
  description: "Minimal temporary inboxes powered by Appwrite and Mailgun."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
