import type {Metadata} from 'next';
import './globals.css';
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster"
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from '@/hooks/use-auth';
import AppContent from '@/components/AppContent';

export const metadata: Metadata = {
  title: 'DMR Proyectos',
  description: 'Gestión y seguimiento de proyectos comerciales',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("min-h-screen bg-background font-body antialiased")}>
        <AuthProvider>
            <AppContent>
                {children}
            </AppContent>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
