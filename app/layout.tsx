import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Times Table Trail",
  description: "A cheerful voice multiplication adventure for kids.",
  icons: {
    icon: "./favicon.svg",
    shortcut: "./favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
