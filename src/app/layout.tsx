import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://payme.tw"),
  title: "PayMe.tw | 台灣通用收款碼",
  description: "純前端、安全、開源的 TWQR 產生器。在您的瀏覽器本地生成，資料不回傳。",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "PayMe.tw | 台灣通用收款碼",
    description: "轉帳不用再背帳號！一鍵產生 TWQR 收款碼，支援所有採用 TWQR 格式的銀行。",
    url: "https://payme.tw",
    siteName: "PayMe.tw",
    images: [
      {
        url: "/og-simple.jpg",
        width: 1200,
        height: 630,
        alt: "PayMe.tw Preview",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PayMe.tw",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // Critical for env(safe-area-inset-*)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="dark">
      <head>
        <link rel="preload" href="/icon-splash-128.png" as="image" type="image/png" fetchPriority="high" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "PayMe.tw",
            "url": "https://payme.tw",
            "description": "純前端、安全、開源的 TWQR 產生器。在您的瀏覽器本地生成，資料不回傳。",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "All",
            "browserRequirements": "Requires JavaScript",
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "TWD" },
            "inLanguage": "zh-TW"
          }) }}
        />
      </head>
      <body className={cn(inter.className, "min-h-screen antialiased overflow-x-hidden selection:bg-blue-500/20 bg-[#020617] text-white")}>
        {children}
      </body>
    </html>
  );
}