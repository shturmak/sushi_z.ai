import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "SushiChain — Замовляй улюблену їжу онлайн з доставкою",
  description:
    "SushiChain — white-label платформа для замовлення їди. Швидке онлайн-замовлення суші, піци та інших страв з доставкою до дверей.",
  keywords: [
    "замовлення їди",
    "доставка їжі",
    "суші",
    "піца",
    "онлайн замовлення",
    "SushiChain",
    "доставка",
    "ресторан",
  ],
  authors: [{ name: "SushiChain" }],
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SushiChain",
  },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: "SushiChain",
    title: "SushiChain — Замовляй улюблену їжу онлайн з доставкою",
    description:
      "Швидке онлайн-замовлення суші, піци та інших страв з доставкою до дверей.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SushiChain — Замовляй улюблену їжу онлайн з доставкою",
    description:
      "Швидке онлайн-замовлення суші, піци та інших страв з доставкою до дверей.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  );
}
