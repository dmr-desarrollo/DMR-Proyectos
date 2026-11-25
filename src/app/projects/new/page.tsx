
'use client';

import { ProjectForm } from "@/components/ProjectForm";
import { getUnidadesDeNegocio, getVendedores, getSubcategorias, getPersonasInvolucradas } from "@/lib/data";
import { useAuth } from "@/hooks/use-auth";
import type { UnidadDeNegocio, Vendedor, Subcategoria, PersonaInvolucrada } from "@/lib/types";
import { useEffect, useState } from "react";
import Loading from "@/app/loading";

export default function NewProjectPage() {
  const { user, loading: authLoading } = useAuth();
  const [unidadesDeNegocio, setUnidadesDeNegocio] = useState<UnidadDeNegocio[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [personasInvolucradas, setPersonasInvolucradas] = useState<PersonaInvolucrada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!authLoading && user) {
        setLoading(true);
        try {
          const [unidadesData, vendedoresData, subcategoriasData, personasData] = await Promise.all([
            getUnidadesDeNegocio(),
            getVendedores(),
            getSubcategorias(),
            getPersonasInvolucradas()
          ]);
          setUnidadesDeNegocio(unidadesData);
          setVendedores(vendedoresData);
          setSubcategorias(subcategoriasData);
          setPersonasInvolucradas(personasData);
        } catch (error) {
          console.error("Failed to fetch form data", error);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading && !user) {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading]);

  if (authLoading || (loading && user)) {
    return <Loading />;
  }

  return (
    <section className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Crear Nuevo Proyecto</h1>
        <p className="text-muted-foreground">Completa los detalles a continuación para agregar un nuevo proyecto a tu dashboard.</p>
      </div>
      
      <ProjectForm 
        unidadesDeNegocio={unidadesDeNegocio}
        subcategorias={subcategorias}
        vendedores={vendedores}
        personasInvolucradas={personasInvolucradas}
      />
      
    </section>
  );
}
