import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from './providers'

export const metadata: Metadata = {
  title: 'Subly - Find a Sublease Near McGill',
  description: 'Find and post subleases in the Montreal area near McGill University',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
