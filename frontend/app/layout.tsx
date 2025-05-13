import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { suppressHydrationWarnings } from "./utils/suppressHydrationWarnings";
import { setupBrowserExtensionInterceptor } from "./utils/browserExtensionInterceptor";

// Apply hydration warning suppression
if (typeof window !== 'undefined') {
  suppressHydrationWarnings();
  
  // Setup browser extension attribute interceptor
  // This will clean up attributes like fdprocessedid that cause hydration issues
  const cleanup = setupBrowserExtensionInterceptor();
  
  // Clean up on unmount (not typically needed for layout but good practice)
  window.addEventListener('beforeunload', cleanup);
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI出品タイトル生成",
  description: "商品画像とデータからAIが最適な出品タイトルを生成します",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
