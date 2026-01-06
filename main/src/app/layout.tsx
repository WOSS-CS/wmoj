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
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://wmoj.com'),
  title: {
    default: "WMOJ - Competitive Programming Platform",
    template: "%s | WMOJ",
  },
  description: "Join WMOJ, the ultimate competitive programming platform for coding enthusiasts and developers. Practice problems, compete in contests, and improve your skills.",
  keywords: ["competitive programming", "coding", "algorithm", "data structures", "contest", "programming"],
  authors: [{ name: "WMOJ Team" }],
  creator: "WMOJ",
  publisher: "WMOJ",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "WMOJ",
    title: "WMOJ - Competitive Programming Platform",
    description: "Join WMOJ, the ultimate competitive programming platform for coding enthusiasts and developers.",
    images: [
      {
        url: "/og-image.png", // Assuming an OG image exists or will exist; decent fallback even if 404 for now
        width: 1200,
        height: 630,
        alt: "WMOJ Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WMOJ - Competitive Programming Platform",
    description: "Join WMOJ, the ultimate competitive programming platform for coding enthusiasts and developers.",
    // images: ["/twitter-image.png"], // Optional
  },
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
