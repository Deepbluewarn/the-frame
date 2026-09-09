import { cache } from 'react';
import { actionGetImageById } from '@/actions/image';

// layout / generateMetadata / Page가 같은 요청에서 호출해도 캐시되어 DB는 1회만 조회.
export const getImage = cache(async (id: string) => actionGetImageById(id));
