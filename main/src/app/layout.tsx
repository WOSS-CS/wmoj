import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google"; // [MODIFY] Replaced Geist
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CountdownProvider } from "@/contexts/CountdownContext";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { ActiveContestRedirect } from "@/components/ActiveContestRedirect";
import { AppShell } from "@/components/layout/AppShell";
import { ToastContainer } from "@/components/ui/Toast";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-heading",
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
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased smooth-transition`}
      >
        <AuthProvider>
          <CountdownProvider>
            <AppShell>
              {children}
            </AppShell>
            <CountdownOverlay />
            <ActiveContestRedirect />
            <ToastContainer />
          </CountdownProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
