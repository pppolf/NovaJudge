import type { Metadata } from "next";
import { Inter, Merriweather, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "sonner";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const serif = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-serif",
});
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NovaJudge",
  description: "High-performance Online Judge system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${serif.variable} ${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <LanguageProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
