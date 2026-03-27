import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { DARK_THEME_COLOR, DEFAULT_THEME, LIGHT_THEME_COLOR } from "@/lib/theme";
import { STORAGE_KEY } from "@/config/storage-keys";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: LIGHT_THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: DARK_THEME_COLOR },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // Critical for env(safe-area-inset-*)
};

const themeInitScript = `
  (function () {
    try {
      var storageKey = '${STORAGE_KEY.theme}';
      var storedTheme = localStorage.getItem(storageKey);
      var theme = storedTheme === 'dark' ? 'dark' : '${DEFAULT_THEME}';
      var root = document.documentElement;
      root.classList.toggle('dark', theme === 'dark');
      root.style.colorScheme = theme;
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', theme === 'dark' ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
      }
    } catch (error) {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = '${DEFAULT_THEME}';
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
      <body className={cn("font-sans min-h-screen antialiased overflow-x-hidden selection:bg-blue-500/20 text-foreground")}>
        {children}
      </body>
    </html>
  );
}
