import { Suspense } from 'react';
import { Dashboard } from '@/components/Dashboard';

interface Props {
  searchParams: {
    page?: string;
    search?: string;
    role?: string;
  };
}

export default async function HomePage({ searchParams }: Props) {



  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  );
}
