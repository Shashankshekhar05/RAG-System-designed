import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Advisor.ai | Intelligent Document Teammate",
  description: "Next-generation AI document copilot with local embeddings, semantic cache, and verified page citations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-[#1E1B4B] font-sans antialiased selection:bg-purple-500/25 selection:text-purple-950">
        {children}
      </body>
    </html>
  );
}
