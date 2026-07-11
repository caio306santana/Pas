import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Menino Travesso | Delivery de Pasteis e Churros',
  description: 'Delivery de pasteis, churros e bebidas com acompanhamento em tempo real.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
