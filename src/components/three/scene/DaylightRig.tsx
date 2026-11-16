import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Color, type DirectionalLight, type HemisphereLight, type MeshBasicMaterial, type MeshStandardMaterial, type PointLight, Vector3 } from 'three';
import { SCENE_COLORS as C } from '@/styles/tokens';
import type { Point3, TimeOfDay } from '@/types/three';
import { DAYLIGHT_PRESETS, type DaylightPreset } from './daylight';

export interface DaylightMaterials {
  ceiling: RefObject<MeshStandardMaterial | null>;
  glass: RefObject<MeshStandardMaterial | null>;
  outside: RefObject<MeshBasicMaterial | null>;
  bulb: RefObject<MeshStandardMaterial | null>;
}

interface DaylightRigProps {
  timeOfDay: TimeOfDay;
  materials: DaylightMaterials;
  pendants: readonly Point3[];
  castShadow: boolean;
  shadowMapSize: number;
  /** 미리보기·reduced-motion: 보간 없이 즉시 적용 */
  instant?: boolean;
  /** E2E용 전역 디버그 상태를 노출할지 */
  exposeDebug?: boolean;
}

/** 전환 속도: 약 1.2초 안에 목표값의 95%에 도달 */
const SMOOTHING = 2.5;
const EPSILON = 0.004;

function approach(current: number, target: number, k: number) {
  const next = current + (target - current) * k;
  return Math.abs(target - next) < EPSILON ? target : next;
}

/**
 * '하루의 빛' 조명 장치.
 * 햇빛·반구광·펜던트 조명과 발광 재질, 배경색, 노출을 선택한 시간대 프리셋으로 부드럽게 옮긴다.
 */
export default function DaylightRig({
  timeOfDay,
  materials,
  pendants,
  castShadow,
  shadowMapSize,
  instant = false,
  exposeDebug = false,
}: DaylightRigProps) {
  const { scene, gl, invalidate } = useThree();
  const sun = useRef<DirectionalLight>(null);
  const hemisphere = useRef<HemisphereLight>(null);
  const lamps = useRef<(PointLight | null)[]>([]);
  const settled = useRef(false);
  const preset = DAYLIGHT_PRESETS[timeOfDay];

  // 매 프레임 재할당을 피하기 위한 작업용 객체
  const work = useMemo(
    () => ({
      sunColor: new Color(),
      sky: new Color(),
      ground: new Color(),
      outside: new Color(),
      background: new Color(DAYLIGHT_PRESETS.afternoon.background),
      sunPosition: new Vector3(),
    }),
    [],
  );

  useLayoutEffect(() => {
    const previous = scene.background;
    scene.background = work.background;
    return () => {
      scene.background = previous;
    };
  }, [scene, work]);

  const apply = (target: DaylightPreset, k: number) => {
    let done = true;
    const track = (current: number, goal: number) => {
      const next = approach(current, goal, k);
      if (next !== goal) done = false;
      return next;
    };
    const blend = (color: Color, goal: string) => {
      work.sunColor.set(goal);
      color.lerp(work.sunColor, k);
      if (Math.abs(color.r - work.sunColor.r) + Math.abs(color.g - work.sunColor.g) + Math.abs(color.b - work.sunColor.b) > EPSILON * 3) done = false;
      else color.copy(work.sunColor);
    };

    if (sun.current) {
      sun.current.intensity = track(sun.current.intensity, target.sun.intensity);
      blend(sun.current.color, target.sun.color);
      work.sunPosition.set(...target.sun.position);
      sun.current.position.lerp(work.sunPosition, k);
      if (sun.current.position.distanceTo(work.sunPosition) > 0.01) done = false;
    }
    if (hemisphere.current) {
      hemisphere.current.intensity = track(hemisphere.current.intensity, target.hemisphere.intensity);
      blend(hemisphere.current.color, target.hemisphere.sky);
      blend(hemisphere.current.groundColor, target.hemisphere.ground);
    }
    for (const lamp of lamps.current) {
      if (!lamp) continue;
      lamp.intensity = track(lamp.intensity, target.pendant.intensity);
      lamp.distance = track(lamp.distance, target.pendant.distance);
    }
    const { ceiling, glass, outside, bulb } = materials;
    if (ceiling.current) ceiling.current.emissiveIntensity = track(ceiling.current.emissiveIntensity, target.ceilingGlow);
    if (glass.current) glass.current.emissiveIntensity = track(glass.current.emissiveIntensity, target.glassGlow);
    if (bulb.current) bulb.current.emissiveIntensity = track(bulb.current.emissiveIntensity, target.bulbGlow);
    if (outside.current) blend(outside.current.color, target.outsideTint);
    blend(work.background, target.background);
    gl.toneMappingExposure = track(gl.toneMappingExposure, target.exposure);
    return done;
  };

  // 첫 렌더와 즉시 모드에서는 보간 없이 바로 적용
  const initialized = useRef(false);
  useLayoutEffect(() => {
    if (!initialized.current || instant) {
      apply(preset, 1);
      initialized.current = true;
      settled.current = true;
      invalidate();
    } else {
      settled.current = false;
    }
    // apply는 ref만 다루므로 의존성에서 제외해도 안전하다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, instant, invalidate]);

  useFrame((_, delta) => {
    if (settled.current) return;
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * SMOOTHING);
    settled.current = apply(preset, k);
  });

  useEffect(() => {
    if (!exposeDebug) return;
    const debug = Object.freeze({
      get timeOfDay() {
        return timeOfDay;
      },
      get settled() {
        return settled.current;
      },
      getLevels: () => ({
        sun: sun.current?.intensity ?? 0,
        pendant: lamps.current[0]?.intensity ?? 0,
        hemisphere: hemisphere.current?.intensity ?? 0,
      }),
    });
    window.__CAFE_3D_DAYLIGHT__ = debug;
    return () => {
      if (window.__CAFE_3D_DAYLIGHT__ === debug) delete window.__CAFE_3D_DAYLIGHT__;
    };
  }, [exposeDebug, timeOfDay]);

  return (
    <>
      <hemisphereLight ref={hemisphere} />
      <directionalLight
        ref={sun}
        castShadow={castShadow}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={0.5}
        shadow-camera-far={26}
        shadow-normalBias={0.035}
        shadow-bias={-0.0001}
      />
      {pendants.map(([x, y, z], i) => (
        <pointLight
          key={i}
          ref={(light) => {
            lamps.current[i] = light;
          }}
          position={[x, y - 0.25, z]}
          color={C.warmLight}
          decay={2}
        />
      ))}
    </>
  );
}
