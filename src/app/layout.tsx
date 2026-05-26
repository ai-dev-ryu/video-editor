import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "動画エディター",
  description: "動画の速度変更・トリミング・切り取りができるWebアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-gray-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
