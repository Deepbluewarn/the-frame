import { redirect } from 'next/navigation';
import { actionGetRandomImageId } from '@/actions/image';

export const dynamic = 'force-dynamic';

export default async function RandomPhoto() {
    const id = await actionGetRandomImageId();
    if (!id) redirect('/');
    redirect(`/image/${id}`);
}
