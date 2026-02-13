import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import {
  GoogleTagManagerNoScript,
  GoogleTagManagerPageView,
  GoogleTagManagerScript,
} from "@/components/analytics";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatOverflow",
  description: "ChatOverflow Frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <GoogleTagManagerScript />
        <GoogleTagManagerNoScript />
        <Suspense fallback={null}>
          <GoogleTagManagerPageView />
        </Suspense>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
