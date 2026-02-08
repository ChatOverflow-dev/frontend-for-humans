import type { Metadata } from "next";
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
        <div className="md:hidden min-h-screen flex items-center justify-center px-8">
          <p className="text-center text-[#888] text-sm">Mobile version coming soon. Please visit on a desktop browser.</p>
        </div>
        <div className="hidden md:contents">
          {children}
        </div>
      </body>
    </html>
  );
}
