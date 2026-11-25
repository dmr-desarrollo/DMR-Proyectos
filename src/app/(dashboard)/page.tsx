
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getProjects, getEstados, getVendedores, getUnidadesDeNegocio, getPersonasInvolucradas, getSubcategorias } from '@/lib/data';
import Dashboard from '@/components/Dashboard';
import type { Proyecto, Estado, Vendedor, UnidadDeNegocio, PersonaInvolucrada, Subcategoria } from '@/lib/types';
import Loading from '../loading';
import { useAuth } from '@/hooks/use-auth';
import { filterProjectsByUser } from '@/lib/utils';

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [allProjects, setAllProjects] = useState<Proyecto[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [personasInvolucradas, setPersonasInvolucradas] = useState<PersonaInvolucrada[]>([]);
  const [unidadesDeNegocio, setUnidadesDeNegocio] = useState<UnidadDeNegocio[]>([]);
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [loading, setLoading] = useState(true);

  const allPeople = useMemo(() => [...vendedores, ...personasInvolucradas], [vendedores, personasInvolucradas]);

  useEffect(() => {
    const fetchData = async () => {
      if (!authLoading && user) {
        try {
          setLoading(true);
          const [projectsData, estadosData, vendedoresData, unidadesData, personasData, subcategoriasData] = await Promise.all([
            getProjects(),
            getEstados(),
            getVendedores(),
            getUnidadesDeNegocio(),
            getPersonasInvolucradas(),
            getSubcategorias(),
          ]);
          
          setAllProjects(projectsData);
          setEstados(estadosData);
          setVendedores(vendedoresData);
          setUnidadesDeNegocio(unidadesData);
          setPersonasInvolucradas(personasData);
          setSubcategorias(subcategoriasData);

        } catch (error) {
          console.error("Failed to fetch initial data", error);
        } finally {
          setLoading(false);
        }
      } else if (!authLoading && !user) {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading]);

  const userFilteredProjects = useMemo(() => {
    if (loading || authLoading) return [];
    return filterProjectsByUser(allProjects, user, allPeople);
  }, [allProjects, user, allPeople, loading, authLoading]);


  if (authLoading || (loading && user)) {
    return <Loading />;
  }

  return (
    <Dashboard 
      projects={userFilteredProjects}
      estados={estados} 
      vendedores={vendedores}
      unidadesDeNegocio={unidadesDeNegocio}
      subcategorias={subcategorias}
      user={user}
    />
  );
}
