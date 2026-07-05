import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Menino Travesso | Delivery de Pastéis e Churros',
  description: 'O melhor delivery de pastéis gourmet, churros e bebidas em tempo real!',
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
