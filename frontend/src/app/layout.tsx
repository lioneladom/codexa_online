import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Codexa - Secure Programming Examination Platform",
  description: "Enterprise-grade secure programming examination platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
