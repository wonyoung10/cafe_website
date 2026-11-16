/**
 * CSS 토큰(src/styles/index.css @theme)과 동일한 값.
 * Three.js 씬처럼 CSS 변수를 직접 쓸 수 없는 곳에서 사용한다.
 */
export const COLORS = {
  ivory: '#FBF8F1',
  cream: '#F3EBDD',
  creamDeep: '#E8DCC6',
  line: '#E2D7C5',
  sage: '#A7B596',
  sageSoft: '#DCE3D1',
  forest: '#2F4A3A',
  forestDeep: '#213529',
  walnut: '#6E4F3A',
  walnutSoft: '#EADBCB',
  ink: '#2B2A26',
  inkSoft: '#5E5A52',
} as const;

/** 3D 매장 전용 재질 팔레트 (docs/07-threejs-planning.md §2) */
export const SCENE_COLORS = {
  oak: '#C9A27A',
  oakLight: '#DDBF98',
  walnut: '#6E4F3A',
  walnutDark: '#4A3628',
  plaster: '#EFE6D6',
  ceiling: '#F6F0E4',
  leaf: '#5E7F5A',
  leafLight: '#7F9E6E',
  leafDark: '#4C6B47',
  metal: '#B9B4AC',
  metalDark: '#55524D',
  terracotta: '#B8754F',
  ceramic: '#F4EFE6',
  glass: '#CFE3E8',
  sky: '#DCEBF0',
  board: '#2F4A3A',
  warmLight: '#FFC98A',
  sunlight: '#FFE7C2',
} as const;

export const EASE_LEAF = [0.22, 1, 0.36, 1] as const;
