import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ContestHub',
  description: 'Full-stack competitive programming platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50 min-h-screen flex flex-col`}>
        <AuthProvider>
          <Navbar />
          <div className="flex-grow">
            {children}
          </div>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: 'dark:bg-slate-800 dark:text-slate-100',
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
