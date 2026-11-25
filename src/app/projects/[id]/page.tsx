

import ProjectDetailClient from './ProjectDetailClient';
import { notFound } from 'next/navigation';

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  if (!params.id) {
    notFound();
  }

  // The client component will fetch all data.
  // This server component just acts as a wrapper and provides the ID.
  return <ProjectDetailClient projectId={params.id} />;
}
