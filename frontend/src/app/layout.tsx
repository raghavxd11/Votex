import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '../context/AuthContext'
import NavigationHeader from '../components/NavigationHeader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Votex AI Dashboard',
  description: 'Multimodal mental health analysis platform.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0b0f19] text-white min-h-screen`}>
        <AuthProvider>
            <div className="flex flex-col min-h-screen">
                <NavigationHeader />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </AuthProvider>
      </body>
    </html>
  )
}
