import { BRAND } from '@/data/brand';
import type { CafeLocation } from '@/types/cafe';

const ADDRESS = '경기도 안양시 동안구 경수대로 940';

/**
 * 좌표 확인 기록 (ADR-005)
 * - 2026-11-16 OpenStreetMap Nominatim 지오코딩: "940, 경수대로, 비산1동, 동안구, 안양시, 경기도, 13925"
 * - lat 37.3992443, lng 126.9328738 (건물 단위 일치)
 */
const COORDS = { lat: 37.3992443, lng: 126.9328738 } as const;

const BBOX_PAD = { lat: 0.0022, lng: 0.0042 };
const bbox = [
  COORDS.lng - BBOX_PAD.lng,
  COORDS.lat - BBOX_PAD.lat,
  COORDS.lng + BBOX_PAD.lng,
  COORDS.lat + BBOX_PAD.lat,
]
  .map((value) => value.toFixed(6))
  .join('%2C');

export const CAFE_LOCATION: CafeLocation = {
  address: ADDRESS,
  postalCode: '13925',
  coordinates: COORDS,
  mapEmbedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${COORDS.lat}%2C${COORDS.lng}`,
  mapViewUrl: `https://www.openstreetmap.org/?mlat=${COORDS.lat}&mlon=${COORDS.lng}#map=18/${COORDS.lat}/${COORDS.lng}`,
  naverMapUrl: `https://map.naver.com/p/search/${encodeURIComponent(ADDRESS)}`,
  kakaoMapUrl: `https://map.kakao.com/link/to/${encodeURIComponent(BRAND.name)},${COORDS.lat},${COORDS.lng}`,
  description:
    '안양시 동안구 비산동, 경수대로 변에 자리할 예정입니다. 지도의 표시 위치는 도로명 주소를 기준으로 확인한 위치입니다.',
  notice: '운영시간, 주차, 대중교통 등 상세 정보는 오픈 전 확정되는 대로 안내드리겠습니다.',
};
