import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen p-4 pt-20 lg:pt-6 lg:p-6 transition-all duration-300">
        <div className="mx-auto max-w-[1920px] animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
