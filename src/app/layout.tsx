import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CallScore — AI-Powered Call Analysis",
    template: "%s — CallScore",
  },
  description:
    "Record, transcribe, and evaluate technician sales calls with AI-powered analysis.",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23111827'/><text x='50' y='68' font-size='55' font-weight='700' text-anchor='middle' fill='white'>C</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
  openGraph: {
    type: "website",
    title: "CallScore — AI-Powered Call Analysis",
    description:
      "Record, transcribe, and evaluate technician sales calls with AI-powered analysis.",
    siteName: "CallScore",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
