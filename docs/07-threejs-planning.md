# 07. Three.js 3D 매장 기획

실제 도면·사진이 없으므로 **콘셉트 기반 가상 매장**을 코드(Procedural Geometry)로 구성한다. 외부 GLB 모델을 쓰지 않아 로딩이 가볍고 라이선스 문제가 없다(→ ADR-003).

## 1. 공간 구조 (단위: m, Y-up, 원점 = 바닥 중앙)

```text
            북쪽 벽 (z = -4.5)  — 커피 바 + 백바 선반 + 메뉴 보드
   ┌──────────────────────────────────────────────┐
   │  [메뉴보드]   [백바 선반]                     │
   │  ┌──────── 커피 바 카운터 ────────┐  [진열장] │
   │  │ 에스프레소 머신 · 그라인더       │          │
   │  └────────────────────────────────┘          │
 서 │  🌿                                        🌿 │ 동
 쪽 │     ◯ 테이블A      ◯ 테이블B                │ 쪽
 벽 │                                    [식물코너] │ 벽
   │  ▭ 창가 바 테이블 + 스툴 ×4                   │
   │  ════════ 대형 창문 (남쪽 벽) ════════        │
   └──────────────────────────────────────────────┘
            남쪽 벽 (z = +4.5)  — 대형 통창 (자연광 유입)
```

- 바닥: 12 × 9 (x: -6 ~ 6, z: -4.5 ~ 4.5), 천장 높이 3.2
- 바닥재: 따뜻한 원목 마루(절차적 캔버스 텍스처: 판재 줄무늬 + 노이즈)
- 벽: 크림 회반죽 톤(`#EFE6D6`), 하단 걸레받이 월넛
- 천장: 아이보리 + 원목 루버 3줄

## 2. 가구 및 소품 배치

| 오브젝트 | 위치(대략) | 구성 | 충돌 |
|---|---|---|---|
| 커피 바 카운터 | x -1.5~3.5, z -3.2 (깊이 0.7, 높이 1.05) | 월넛 박스 + 상판(밝은 오크) + 하단 세로 루버 | ✅ |
| 백바 선반 | 북벽 x -1~3, 높이 1.4/1.9 | 선반 2단 + 원두 병/컵 소품 | (벽 안쪽) |
| 에스프레소 머신 | 카운터 위 x 0.6 | 메탈 바디 박스 + 그룹헤드 실린더 2 + 스팀 완드 + 컵 | (카운터) |
| 그라인더 | 카운터 위 x -0.3 | 실린더 + 원뿔 호퍼 | (카운터) |
| 메뉴 보드 | 북벽 x -4, 높이 2.0 | 짙은 그린 보드 + 나무 프레임 + `Text`(drei) 메뉴 몇 줄 | (벽) |
| 진열장(디저트 쇼케이스) | x 4.6, z -3.0 | 원목 하부 + 반투명 유리(`meshPhysicalMaterial transmission` 대신 opacity 0.25, 성능) + 디저트 소품 | ✅ |
| 원형 테이블 A/B | (-2.5, 0.2), (0.8, 0.6) | 상판 실린더 r0.45 + 다리 | ✅ |
| 의자 | 테이블당 2~3개 | 좌판 + 등받이 + 다리 (Instances) | ✅(통합 박스) |
| 창가 바 테이블 | z 3.7, x -4~2 | 긴 상판 + 스툴 4개 | ✅ |
| 큰 화분 식물 | 서쪽 모서리, 동쪽 식물 코너, 카운터 끝 | 화분 실린더 + 잎(스케일·회전 다양한 평면/아이코스피어 Instances) — 몬스테라형, 올리브나무형, 행잉 플랜트 3종 이상 | ✅(화분) |
| 행잉 플랜트 | 창가 천장 2개 | 줄 + 화분 + 늘어진 잎 | ✗ |
| 대형 창문 | 남쪽 벽 전면 x -5.5~5.5, 높이 0.5~2.9 | 창틀(월넛) + 유리 평면(밝은 하늘색, 약간 발광) + 바깥 정원 배경면(그라데이션 + 나무 실루엣) | ✅(벽) |
| 펜던트 조명 | 테이블·카운터 위 4개 | 코드 + 갓(원뿔) + 발광 전구 | ✗ |

색상 팔레트: `src/styles/tokens.ts`의 `SCENE_COLORS` (oak `#C9A27A`, walnut `#6E4F3A`, plaster `#EFE6D6`, leaf `#5E7F5A`/`#7F9E6E`/`#4C6B47`, metal `#B9B4AC`, terracotta `#B8754F`).

## 3. 카메라 컨트롤

| 모드 | 구현 | 조작 |
|---|---|---|
| **둘러보기(orbit)** | drei `OrbitControls` (damping) | 드래그 회전 · 휠/핀치 줌 · 우클릭/두 손가락 팬 |
| **실내 탐색(walk)** | 커스텀 `WalkControls` (포인터 드래그로 yaw/pitch, 키보드/가상 패드로 이동) | WASD/방향키 이동, Shift 빠르게, 드래그 시선, 모바일 방향 패드 |

- 기본 시점: 위치 `(5.2, 3.0, 6.0)` → 실내 경계로 클램프되어 `(4.8, 2.6, 3.8)` 부근, 타깃 `(0, 1, -1)`
- 둘러보기 제한: `minDistance 1.5`, `maxDistance 9`, `minPolarAngle 0.15π`, `maxPolarAngle 0.49π`(바닥 아래 금지), 매 프레임 카메라 위치/타깃을 방 내부 AABB(여유 0.25m)로 `clampToRoom`
- 탐색 모드: 눈높이 1.6m 고정, 속도 2.2m/s (Shift 3.8), pitch ±60°
- 모드 전환·핫스팟 선택 시 카메라 위치/타깃을 `damp`로 약 1.2s 보간 (`CameraRig`)
- 개발/테스트용: `window.__CAFE_3D__ = { getCamera(): {position, target}, mode }` (E2E 검증용, 프로덕션에서도 무해한 읽기 전용)

## 4. 조명 및 재질

| 조명 | 설정 | 의도 |
|---|---|---|
| `hemisphereLight` | sky `#FFF4E2`, ground `#8A6F55`, 0.55 | 전체 따뜻한 바운스 |
| `directionalLight` (햇빛) | 남쪽 창 바깥 `(3, 6, 9)` → 실내, `#FFE7C2`, 2.2, castShadow, mapSize 1024(모바일 512), 섀도 카메라를 방 크기에 맞춤 | 창으로 드는 자연광·긴 그림자 |
| `pointLight` ×4 (펜던트) | `#FFC98A`, 0.6, distance 4, decay 2, 그림자 없음 | 따뜻한 실내 조명 |
| 환경 | drei `Environment preset="apartment"` 대신 경량 `hemisphere`만 사용 (HDR 다운로드 회피) | 로딩 경량 |

- 재질: `meshStandardMaterial` 위주 (roughness 0.6~0.9), 금속은 metalness 0.8 roughness 0.3, 유리는 transparent opacity
- 톤매핑: `ACESFilmic`, `outputColorSpace = SRGB`
- 부드러운 그림자: `shadows="soft"`(PCFSoft) + 바닥 `ContactShadows` 대신 실제 그림자 사용

## 5. 충돌 처리

- 정적 충돌체: 벽 4개(방 경계) + 카운터, 진열장, 테이블 3, 화분 3을 **XZ 평면 AABB**로 `src/components/three/scene/colliders.ts`에 정의 (시각 메시와 같은 상수 공유)
- 플레이어: 반지름 0.3m 원
- 알고리즘 (`src/utils/collision.ts`):
  1. 이동 벡터를 X, Z 축으로 분리하여 순차 적용 (벽을 따라 미끄러짐)
  2. 각 축 이동 후 원-AABB 겹침 검사 → 겹치면 해당 축 이동 취소
  3. 마지막에 방 경계 클램프
- 순수 함수로 작성하여 Vitest로 검증: `resolveMovement(prev, delta, colliders, radius)`

## 6. 핫스팟

| id | 이름 | 위치 | 설명(요지) | 카메라 시점 |
|---|---|---|---|---|
| `coffee-bar` | 커피 바 | 카운터 중앙 위 | 바리스타가 한 잔씩 내리는 중심 공간 | 정면 사선 |
| `espresso-machine` | 에스프레소 머신 | 머신 위 | 하루의 첫 잎을 틔우는 곳, 원두 향 | 근접 |
| `window-seat` | 창가 좌석 | 창가 바 테이블 | 햇살 아래 혼자 머무는 자리 | 실내→창 |
| `display-case` | 디저트 진열장 | 쇼케이스 위 | 매일 아침 굽는 구움과자 | 근접 |
| `plant-corner` | 식물 코너 | 동쪽 식물 | 잎이 자라는 공간 — 브랜드 철학의 상징 | 사선 |
| `menu-board` | 메뉴 보드 | 북벽 보드 | 오늘의 잎(메뉴)을 고르는 곳 | 정면 |

- 데이터: `src/data/hotspots.ts` (`Hotspot { id, title, description, position: [x,y,z], camera: { position, target } }`)
- 표시: drei `Html` 안의 `<button>`(잎 아이콘 원형 마커 + 호버 라벨), `occlude` 미사용(성능) 대신 `distanceFactor`
- 선택 시: 카메라 이동 + 설명 패널, ESC/닫기로 해제
- 캔버스 밖 목록에서도 동일 선택 가능(키보드 접근성)

## 7. 모바일 대응

- `touch-action: none` 캔버스, OrbitControls 기본 터치(1손가락 회전, 2손가락 줌·팬)
- 탐색 모드: 좌하단 방향 패드(4방향 버튼, 누르고 있는 동안 이동, `pointerdown/up/leave/cancel`), 캔버스 드래그로 시선
- `(pointer: coarse)`면 DPR 상한 1.5, 그림자 맵 512, 펜던트 포인트라이트 2개로 축소
- 안내 문구를 디바이스에 맞게 교체 (`useMediaQuery('(pointer: coarse)')`)

## 8. 렌더링 최적화

1. DPR `[1, 1.75]` + drei `PerformanceMonitor`로 성능 저하 시 DPR 1로 하향
2. 지오메트리·재질 모듈 단위 재사용(`useMemo`), 의자/스툴/잎은 drei `Instances`
3. 정적 메시는 `matrixAutoUpdate=false`
4. 그림자: 햇빛 1개만 캐스팅, 작은 소품은 `castShadow` 제외
5. 캔버스 텍스처는 1회 생성 후 캐시, 크기 512
6. 문서 숨김(`visibilitychange`) 또는 뷰포트 밖이면 `frameloop="never"`/`"demand"`
7. 홈 미리보기: `frameloop="demand"` + 느린 자동 회전만 `invalidate`, 그림자 off, DPR 1~1.25
8. 언마운트 시 R3F가 리소스 dispose (수동 생성 텍스처는 cleanup에서 dispose)
9. 목표: 데스크톱 60fps, 중급 모바일 30fps 이상, 드로우콜 < 150

## 9. 로딩 & 대체 UI

- `Suspense` 경계 + `useProgress` → `LoadingOverlay`(진행률 %, `role="status"`). 절차적 씬은 로딩이 빠르므로 최소 표시 시간 400ms로 깜빡임 방지
- `isWebGLAvailable()` false 또는 `webglcontextlost` → `WebGLFallback`: `/images/store/store-fallback.webp` + 핫스팟 목록 텍스트 + "3D를 지원하지 않는 환경이에요" 안내
- 렌더 오류는 `ErrorBoundary`로 감싸 대체 UI 표시
