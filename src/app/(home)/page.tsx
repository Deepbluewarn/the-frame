import HomeGrid from '@/components/HomeGrid';
import { actionGetRecentImages } from '@/actions/image';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const initial = await actionGetRecentImages({ limit: 30 });
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <HomeGrid initial={initial} />
    </div>
  );
}
