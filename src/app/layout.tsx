import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth/AuthProvider";
import { SystemDialogProvider } from "../components/ui/SystemDialog";
import { ToastProvider } from "../components/ui/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = { title: { default: "البوابة المقبلة للخدمات اللوجستية", template: "%s | البوابة المقبلة" }, description: "منصة شركة البوابة المقبلة للخدمات اللوجستية" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <SystemDialogProvider>
            <AuthProvider>{children}</AuthProvider>
          </SystemDialogProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
