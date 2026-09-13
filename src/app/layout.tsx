import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Word on the Street — Special Orders",
  description:
    "Special order & preorder capture tool for Word on the Street Books.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 font-sans">
        {children}
      </body>
    </html>
  );
}
