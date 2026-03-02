import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeStudio — AI-Powered IDE",
  description: "Build full-stack applications with AI assistance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased h-full overflow-hidden text-[14px]">
        {children}
      </body>
    </html>
  );
}
