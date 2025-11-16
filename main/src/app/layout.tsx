import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CountdownProvider } from "@/contexts/CountdownContext";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { ActiveContestRedirect } from "@/components/ActiveContestRedirect";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WMOJ - Competitive Programming Platform",
  description: "Join WMOJ, the ultimate competitive programming platform for coding enthusiasts and developers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased smooth-transition`}
      >
        <AuthProvider>
          <CountdownProvider>
            <div className="animate-fade-in-up">
              {children}
            </div>
            <CountdownOverlay />
            <ActiveContestRedirect />
          </CountdownProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
