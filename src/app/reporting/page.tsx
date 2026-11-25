
'use client';

import { useState, useEffect, useMemo } from 'react';
import { getProjects, getVendedores, getUnidadesDeNegocio, getPersonasInvolucradas } from '@/lib/data';
import ReportingDashboard from '@/components/ReportingDashboard';
import type { Proyecto, Vendedor, UnidadDeNegocio, PersonaInvolucrada } from '@/lib/types';
import Loading from '../loading';
import { useAuth } from '@/hooks/use-auth';
import { filterProjectsByUser } from '@/lib/utils';

export default function ReportingPage() {
    const { user, loading: authLoading } = useAuth();
    const [allProjects, setAllProjects] = useState<Proyecto[]>([]);
    const [vendedores, setVendedores] = useState<Vendedor[]>([]);
    const [personasInvolucradas, setPersonasInvolucradas] = useState<PersonaInvolucrada[]>([]);
    const [unidadesDeNegocio, setUnidadesDeNegocio] = useState<UnidadDeNegocio[]>([]);
    const [loading, setLoading] = useState(true);

    const allPeople = useMemo(() => [...vendedores, ...personasInvolucradas], [vendedores, personasInvolucradas]);

    useEffect(() => {
        const fetchReportingData = async () => {
            if (!authLoading && user) {
                setLoading(true);
                try {
                    const [projectsData, vendedoresData, unidadesData, personasData] = await Promise.all([
                        getProjects(),
                        getVendedores(),
                        getUnidadesDeNegocio(),
                        getPersonasInvolucradas()
                    ]);

                    setAllProjects(projectsData);
                    setVendedores(vendedoresData);
                    setUnidadesDeNegocio(unidadesData);
                    setPersonasInvolucradas(personasData);
                } catch (error) {
                    console.error("Failed to fetch data for reporting", error);
                } finally {
                    setLoading(false);
                }
            } else if (!authLoading && !user) {
              setLoading(false);
            }
        };
        fetchReportingData();
    }, [user, authLoading]);

    const userProjects = useMemo(() => {
        if (loading || authLoading) return [];
        return filterProjectsByUser(allProjects, user, allPeople);
    }, [allProjects, user, allPeople, loading, authLoading]);

    if (authLoading || (loading && user)) {
        return <Loading />;
    }

    return (
        <ReportingDashboard 
            initialProjects={userProjects} 
            vendedores={vendedores} 
            unidadesDeNegocio={unidadesDeNegocio}
        />
    );
}
