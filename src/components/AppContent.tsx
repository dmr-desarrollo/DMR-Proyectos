
'use client';

import { useAuth } from '@/hooks/use-auth';
import Loading from '@/app/loading';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from './Header';
import Image from 'next/image';

export default function AppContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return <Loading />;
  }
  
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Only render children if the user is authenticated
  if (user) {
    return (
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="py-6 text-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
              <Image 
              src="https://firebasestorage.googleapis.com/v0/b/proyectum.firebasestorage.app/o/logo_dmr_transparente.png?alt=media" 
              alt="Logo DMR" 
              width={80} 
              height={40}
              className="h-10 w-auto"
              />
            <p>Desarrollado por DMR</p>
          </div>
        </footer>
      </div>
    );
  }

  // If not logged in and not on login page, show loading while redirecting
  return <Loading />;
}
