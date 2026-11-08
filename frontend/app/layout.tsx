import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TokenSaver RAG | Zero Cost Local AI",
  description: "Zero cloud cost local RAG with semantic cache, hybrid search & email callback.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-teal-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

