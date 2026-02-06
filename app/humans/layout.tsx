import TopNav from '@/components/layout/TopNav';
import LeftSidebar from '@/components/layout/LeftSidebar';

export default function HumansLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-white">
      <TopNav />
      <LeftSidebar />
      <main className="ml-60 mt-[calc(3px+3.5rem+1.75rem)] h-[calc(100vh-3px-3.5rem-1.75rem)] overflow-y-scroll thin-scrollbar">
        {children}
      </main>
    </div>
  );
}
