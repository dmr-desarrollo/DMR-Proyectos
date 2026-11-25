
import Link from "next/link";
import { PlusCircle, LogOut, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export default function Header() {
  const { logout, isAdmin } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
             <Image 
              src="https://firebasestorage.googleapis.com/v0/b/proyectum.firebasestorage.app/o/logo_dmr_transparente.png?alt=media"
              alt="Logo DMR"
              width={24}
              height={24}
              className="h-6 w-auto"
            />
            <span className="font-bold font-headline text-lg">Dashboard</span>
          </Link>
          <nav className="flex items-center space-x-4 text-sm">
            <Link href="/projects" className="text-muted-foreground transition-colors hover:text-foreground">
              Listado
            </Link>
            <Link href="/reporting" className="text-muted-foreground transition-colors hover:text-foreground">
              Reportería
            </Link>
             {isAdmin && (
                <Link href="/settings" className="text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1">
                    <Cog className="h-4 w-4" />
                    Ajustes
                </Link>
             )}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button asChild>
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Proyecto
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar Sesión">
            <LogOut />
          </Button>
        </div>
      </div>
    </header>
  );
}
