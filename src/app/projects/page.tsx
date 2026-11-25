

'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import ProjectView from '@/components/ProjectView';
import { getProjects, getEstados, getSubcategorias, getVendedores, getUnidadesDeNegocio, getPersonasInvolucradas } from '@/lib/data';
import type { Proyecto, Estado, Subcategoria, Vendedor, UnidadDeNegocio, PersonaInvolucrada } from '@/lib/types';
import ProjectsLoading from './loading';
import { useAuth } from '@/hooks/use-auth';
import { filterProjectsByUser } from '@/lib/utils';

function ProjectsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const [allProjects, setAllProjects] = useState<Proyecto[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [personasInvolucradas, setPersonasInvolucradas] = useState<PersonaInvolucrada[]>([]);
  const [unidadesDeNegocio, setUnidadesDeNegocio] = useState<UnidadDeNegocio[]>([]);
  const [loading, setLoading] = useState(true);

  const allPeople = useMemo(() => [...vendedores, ...personasInvolucradas], [vendedores, personasInvolucradas]);

  useEffect(() => {
    const fetchData = async () => {
      if (!authLoading && user) {
        setLoading(true);
        try {
          const [projectsData, estadosData, subcategoriasData, vendedoresData, unidadesData, personasData] = await Promise.all([
            getProjects(),
            getEstados(),
            getSubcategorias(),
            getVendedores(),
            getUnidadesDeNegocio(),
            getPersonasInvolucradas(),
          ]);

          setAllProjects(projectsData);
          setEstados(estadosData);
          setSubcategorias(subcategoriasData);
          setVendedores(vendedoresData);
          setUnidadesDeNegocio(unidadesData);
          setPersonasInvolucradas(personasData);
        } catch (error) {
          console.error("Failed to fetch projects data", error);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading && !user) {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading]);

  const userProjects = useMemo(() => {
    if (loading || authLoading) return [];
    return filterProjectsByUser(allProjects, user, allPeople);
  }, [allProjects, user, allPeople, loading, authLoading]);


  if (authLoading || (loading && user)) {
    return <ProjectsLoading />;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Mis Proyectos</h1>
      </div>
      <ProjectView 
        projects={userProjects} 
        estados={estados} 
        subcategorias={subcategorias} 
        vendedores={vendedores}
        unidadesDeNegocio={unidadesDeNegocio}
      />
    </section>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsLoading />}>
      <ProjectsPageContent />
    </Suspense>
  )
}
