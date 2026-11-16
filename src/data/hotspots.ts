import type { Hotspot } from '@/types/three';

export const HOTSPOTS: readonly Hotspot[] = [
  { id: 'coffee-bar', title: '커피 바', description: '한 잔을 내리는 손길이 하루의 리듬을 만듭니다. 따뜻한 나무 너머로 커피 향이 천천히 번져요.', position: [1.8, 1.5, -2.8], camera: { position: [3, 2.2, 0], target: [1, 1.1, -3.2] } },
  { id: 'espresso-machine', title: '에스프레소 머신', description: '하루의 첫 잎을 틔우듯 원두의 향을 깨우는 자리예요. 정성껏 내린 한 잔에 작은 쉼을 담습니다.', position: [0.6, 1.85, -3.2], camera: { position: [0, 1.9, -0.9], target: [0.6, 1.4, -3.2] } },
  { id: 'window-seat', title: '창가 좌석', description: '창으로 들어온 햇살이 나무 위에 잠시 머물러요. 혼자만의 속도로 한 잔과 풍경을 즐겨보세요.', position: [-1, 1.4, 3.65], camera: { position: [1.5, 2, 1.25], target: [-1.5, 1.2, 3.7] } },
  { id: 'display-case', title: '디저트 진열장', description: '노릇한 구움과자를 담아둘 작은 진열장이에요. 커피 곁에 놓일 달콤한 여유를 그려보았습니다.', position: [4.6, 1.8, -3], camera: { position: [3.1, 1.9, -0.7], target: [4.6, 1, -3] } },
  { id: 'plant-corner', title: '식물 코너', description: '서로 다른 모양의 잎들이 조용히 자라는 곳이에요. 일상에도 작은 초록이 더해지기를 바랍니다.', position: [4.95, 1.9, 0.8], camera: { position: [2.5, 1.9, 2.3], target: [4.95, 1.3, 0.8] } },
  { id: 'menu-board', title: '메뉴 보드', description: '오늘의 마음에 어울리는 한 잔을 골라보세요. 익숙한 커피와 차가 각자의 향으로 기다립니다.', position: [-4, 2.4, -4.3], camera: { position: [-3.7, 2, -1.5], target: [-4, 2, -4.3] } },
];
