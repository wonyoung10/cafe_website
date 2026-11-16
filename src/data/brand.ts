import type { BrandInfo } from '@/types/cafe';

/**
 * 브랜드 단일 소스 (ADR-004).
 * 카페 이름이 확정되면 이 파일과 index.html의 <title>만 수정한다.
 */
export const BRAND: BrandInfo = {
  name: '하루의 잎',
  nameEn: 'Haru no Leaf',
  isTemporaryName: true,
  tagline: '당신의 하루에, 잎사귀 하나.',
  subTagline: '한 잔의 커피가 오늘의 작은 쉼이 되기를.',
  philosophy:
    '나무에 잎사귀가 하나씩 더해지듯, 한 잔의 커피가 누군가의 하루에 작은 잎사귀 하나가 되었으면 좋겠습니다.',
  story: [
    '한 그루의 나무는 하루아침에 자라지 않습니다. 매일 아주 작은 잎 하나가 더해지고, 그 잎들이 모여 그늘이 되고 숲이 됩니다.',
    '출근길의 따뜻한 라떼, 오후의 차 한 잔, 친구와 나눈 스콘 한 조각. 그 순간들이 모여 당신의 하루가 조금 더 푸르러지기를 바랍니다.',
  ],
  values: [
    {
      id: 'nature',
      title: '자연의 결',
      description: '원목과 식물, 창으로 드는 햇살. 자연에 가까운 재료와 공간을 고릅니다.',
    },
    {
      id: 'care',
      title: '정성의 한 잔',
      description: '서두르지 않고 한 잔씩. 매일 같은 정성으로 커피를 내립니다.',
    },
    {
      id: 'rest',
      title: '머무는 쉼',
      description: '잠시 머물다 가도 좋은 곳. 하루 속 작은 쉼표가 되어 드립니다.',
    },
  ],
};

export const SITE_TITLE_SUFFIX = BRAND.name;
