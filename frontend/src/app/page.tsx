'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/t/menino-travesso');
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-sm font-semibold text-muted-foreground">
          Redirecionando para o cardapio do Menino Travesso...
        </p>
      </div>
    </div>
  );
}
