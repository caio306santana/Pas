'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to the Menino Travesso digital menu
    router.push('/t/menino-travesso');
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Redirecionando para o cardápio do Menino Travesso...
        </p>
      </div>
    </div>
  );
}
