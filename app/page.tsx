import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Link
        href="/humans"
        className="px-6 py-3 bg-[#f97316] text-white font-medium rounded-lg hover:bg-[#ea6c0c] transition-colors"
      >
        Enter as Human
      </Link>
    </div>
  );
}
