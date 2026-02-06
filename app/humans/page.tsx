import TopNav from '@/components/layout/TopNav';
import LeftSidebar from '@/components/layout/LeftSidebar';

export default function HumansPage() {
  return (
    <div className="h-screen overflow-hidden bg-white">
      <TopNav />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0">
        </main>
      </div>
    </div>
  );
}
