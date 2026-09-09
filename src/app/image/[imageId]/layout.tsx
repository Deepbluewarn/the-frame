import { notFound } from 'next/navigation';
import { isValidObjectId } from 'mongoose';
import { getImage } from './getImage';

// 존재 확인을 여기서 하는 이유:
// loading.tsx가 Page를 Suspense로 감싸기 때문에 Next가 응답을 먼저 흘려보낸다.
// 그래서 Page나 generateMetadata에서 notFound()를 던져도 상태 코드는 이미 200으로 굳어
// soft 404(200 + noindex)가 나가고, 서치 콘솔이 "noindex로 제외"로 잡는다.
// layout은 그 Suspense 경계 바깥에서 실행되므로 여기서 던져야 실제 404가 나간다.
export default async function ImageLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { imageId: string };
}) {
    if (!isValidObjectId(params.imageId)) notFound();
    if (!(await getImage(params.imageId))) notFound();
    return <>{children}</>;
}
