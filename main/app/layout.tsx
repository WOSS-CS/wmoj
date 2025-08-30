import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/components/auth/auth-provider"
import { MainLayout } from "@/components/layout/main-layout"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "CodeContest - Programming Contest Platform",
  description: "Practice coding problems and compete in programming contests",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark-green">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <AuthProvider>
            <MainLayout>{children}</MainLayout>
          </AuthProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
