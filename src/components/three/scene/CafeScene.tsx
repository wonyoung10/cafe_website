import { Instance, Instances, Text } from '@react-three/drei';
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, MeshStandardMaterial, SphereGeometry } from 'three';
import { COLORS, SCENE_COLORS as C } from '@/styles/tokens';
import type { Point3 } from '@/types/three';
import { CHAIRS, COUNTER, DISPLAY, PENDANTS, PLANTERS, STOOLS, TABLES, WINDOW_BAR } from './layout';
import { getTextures, retainTextures } from './textures';
import menuFont from './cafe-grid.ttf?url';

type Kind = 'box' | 'cylinder' | 'sphere' | 'cone' | 'leaf';
type Finish = 'matte' | 'metal' | 'glass' | 'bulb';
interface Shape { kind: Kind; finish: Finish; position: Point3; scale: Point3; rotation?: Point3; color: string }

function buildFurniture(): Shape[] {
  const shapes: Shape[] = [];
  const add = (kind: Kind, position: Point3, scale: Point3, color: string, rotation?: Point3, finish: Finish = 'matte') => shapes.push({ kind, position, scale, color, rotation, finish });
  const box = (p: Point3, s: Point3, c: string, r?: Point3) => add('box', p, s, c, r);
  const cylinder = (p: Point3, s: Point3, c: string) => add('cylinder', p, s, c);
  box(COUNTER.position, COUNTER.size, C.walnut);
  box([1, 1.09, -3.2], [5.15, 0.1, 0.85], C.oakLight);
  for (let i = 0; i < 40; i++) box([-1.43 + i * 0.125, 0.53, -2.836], [0.045, 0.95, 0.04], C.oak);
  for (const y of [1.65, 2.22]) {
    box([1, y, -4.25], [4.1, 0.08, 0.38], C.walnut);
    for (let i = 0; i < 9; i++) {
      cylinder([-0.7 + i * 0.42, y + 0.16, -4.2], [0.15, 0.24, 0.15], i % 3 === 0 ? C.walnutDark : C.ceramic);
      if (i % 3 === 0) cylinder([-0.7 + i * 0.42, y + 0.29, -4.2], [0.17, 0.035, 0.17], C.oakLight);
    }
  }
  add('box', [0.6, 1.43, -3.2], [1.05, 0.54, 0.42], C.metal, undefined, 'metal');
  box([0.6, 1.42, -2.97], [0.88, 0.28, 0.04], C.metalDark);
  add('box', [0.6, 1.16, -2.91], [1.12, 0.06, 0.35], C.metal, undefined, 'metal');
  for (const x of [0.3, 0.85]) {
    add('cylinder', [x, 1.32, -2.87], [0.11, 0.12, 0.11], C.metal, undefined, 'metal');
    box([x + 0.08, 1.32, -2.8], [0.2, 0.035, 0.04], C.metalDark);
    cylinder([x, 1.22, -2.85], [0.11, 0.1, 0.11], C.ceramic);
    cylinder([x, 1.76, -3.2], [0.12, 0.1, 0.12], C.ceramic);
  }
  add('cylinder', [1.18, 1.28, -2.94], [0.025, 0.26, 0.025], C.metal, [0, 0, -0.3], 'metal');
  cylinder([-0.45, 1.3, -3.2], [0.25, 0.36, 0.25], C.metalDark);
  add('cone', [-0.45, 1.65, -3.2], [0.3, 0.35, 0.3], C.walnutDark, [0, 0, Math.PI]);
  box([DISPLAY.position[0], 0.36, DISPLAY.position[2]], [DISPLAY.size[0], 0.72, DISPLAY.size[2]], C.oak);
  add('box', [4.6, 1.05, -3], [1.3, 0.6, 1], C.glass, undefined, 'glass');
  for (const x of [3.95, 5.25]) for (const z of [-3.5, -2.5]) box([x, 1.03, z], [0.035, 0.65, 0.035], C.walnut);
  box([4.6, 1.36, -3], [1.38, 0.05, 1.05], C.oakLight);
  for (let i = 0; i < 6; i++) {
    const x = 4.22 + i % 3 * 0.37; const z = -3.23 + Math.floor(i / 3) * 0.45;
    cylinder([x, 0.75, z], [0.29, 0.025, 0.29], C.ceramic);
    add(i % 2 ? 'sphere' : 'cone', [x, 0.84, z], [0.23, 0.15, 0.23], i % 2 ? C.oak : C.oakLight);
  }
  for (const [x, , z] of TABLES) {
    cylinder([x, 0.76, z], [0.9, 0.09, 0.9], C.oakLight);
    cylinder([x, 0.37, z], [0.12, 0.7, 0.12], C.walnut);
    cylinder([x, 0.035, z], [0.5, 0.07, 0.5], C.walnut);
    cylinder([x, 0.86, z], [0.1, 0.12, 0.1], C.ceramic);
  }
  // Chairs, stools and all foliage share the same instanced batches as furniture.
  for (const { position: [x, , z], rotation } of CHAIRS) {
    cylinder([x, 0.46, z], [0.46, 0.07, 0.46], C.oak);
    const dx = Math.sin(rotation) * 0.21; const dz = Math.cos(rotation) * 0.21;
    box([x + dx, 0.75, z + dz], [0.46, 0.42, 0.055], C.oak, [0, rotation, 0]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) box([x + a * 0.15, 0.23, z + b * 0.15], [0.045, 0.44, 0.045], C.walnut);
  }
  box(WINDOW_BAR.position, WINDOW_BAR.size, C.oakLight);
  for (const x of [-3.75, 1.75]) box([x, 0.45, 3.7], [0.1, 0.9, 0.5], C.walnut);
  for (const [x, , z] of STOOLS) {
    cylinder([x, 0.64, z], [0.42, 0.08, 0.42], C.oak);
    for (const a of [-1, 1]) for (const b of [-1, 1]) box([x + a * 0.13, 0.3, z + b * 0.13], [0.04, 0.6, 0.04], C.walnut);
  }
  for (const [index, [x, , z]] of PLANTERS.entries()) {
    cylinder([x, 0.27, z], [0.62, 0.54, 0.62], C.terracotta);
    cylinder([x, 0.55, z], [0.65, 0.07, 0.65], C.terracotta);
    if (index === 1) {
      cylinder([x, 1.16, z], [0.06, 1.4, 0.06], C.walnut);
      for (let i = 0; i < 15; i++) {
        const a = i * 2.4; const y = 1.4 + (i % 4) * 0.22;
        add('sphere', [x + Math.cos(a) * 0.35, y, z + Math.sin(a) * 0.3], [0.45, 0.42, 0.4], i % 2 ? C.leafLight : C.leaf);
      }
    } else {
      for (let i = 0; i < 18; i++) {
        const a = i * 2.4; const y = 0.85 + (i % 5) * 0.2;
        add('cylinder', [x + Math.cos(a) * 0.15, y * 0.6, z + Math.sin(a) * 0.15], [0.015, y - 0.3, 0.015], C.leafDark, [Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4]);
        add('leaf', [x + Math.cos(a) * 0.37, y, z + Math.sin(a) * 0.37], [0.3, 0.48, 1], i % 2 ? C.leaf : C.leafLight, [-0.5, a, -0.4]);
      }
    }
  }
  for (const x of [-4.6, 3.8]) {
    cylinder([x, 2.8, 4], [0.018, 0.8, 0.018], C.walnut);
    cylinder([x, 2.4, 4], [0.36, 0.25, 0.36], C.terracotta);
    for (let i = 0; i < 30; i++) {
      const a = i * 2.4; const y = 2.35 - i % 8 * 0.11;
      add('leaf', [x + Math.cos(a) * 0.23, y, 4 + Math.sin(a) * 0.18], [0.12, 0.19, 1], C.leaf, [0.2, a, 0.7]);
    }
  }
  for (const [x, y, z] of PENDANTS) {
    cylinder([x, (y + 3.2) / 2, z], [0.015, 3.2 - y, 0.015], C.metalDark);
    add('cone', [x, y, z], [0.48, 0.28, 0.48], C.walnut);
    add('sphere', [x, y - 0.13, z], [0.16, 0.16, 0.16], C.warmLight, undefined, 'bulb');
  }
  // Window frames, mullions and walnut baseboards.
  for (const x of [-5.5, -2.75, 0, 2.75, 5.5]) box([x, 1.7, 4.45], [0.08, 2.45, 0.12], C.walnut);
  for (const y of [0.48, 1.65, 2.92]) box([0, y, 4.45], [11.1, 0.08, 0.12], C.walnut);
  for (const x of [-5.96, 5.96]) box([x, 0.08, 0], [0.07, 0.16, 9], C.walnut);
  box([0, 0.08, -4.46], [12, 0.16, 0.07], C.walnut);
  for (const x of [-3.5, 0, 3.5]) box([x, 3.08, 0], [0.12, 0.2, 9], C.oak);
  box([-4, 2, -4.4], [2.5, 1.85, 0.08], C.walnut);
  box([-4, 2, -4.34], [2.34, 1.69, 0.04], C.board);
  return shapes;
}
const SHAPES = buildFurniture();

function Furniture({ shadows }: { shadows: boolean }) {
  const geometries = useMemo(() => ({ box: new BoxGeometry(1, 1, 1), cylinder: new CylinderGeometry(0.5, 0.5, 1, 12), sphere: new SphereGeometry(0.5, 10, 8), cone: new ConeGeometry(0.5, 1, 16), leaf: new CircleGeometry(0.5, 10) }), []);
  const materials = useMemo(() => ({ matte: new MeshStandardMaterial({ roughness: 0.8, side: DoubleSide }), metal: new MeshStandardMaterial({ roughness: 0.3, metalness: 0.8 }), glass: new MeshStandardMaterial({ transparent: true, opacity: 0.22, roughness: 0.2, depthWrite: false }), bulb: new MeshStandardMaterial({ emissive: C.warmLight, emissiveIntensity: 1.3 }) }), []);
  const batches = useMemo(() => {
    const result = new Map<string, Shape[]>();
    for (const shape of SHAPES) {
      const key = `${shape.kind}:${shape.finish}`;
      const batch = result.get(key) ?? []; batch.push(shape); result.set(key, batch);
    }
    return [...result.entries()];
  }, []);
  useEffect(() => () => {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    Object.values(materials).forEach((material) => material.dispose());
  }, [geometries, materials]);
  return <>{batches.map(([key, shapes]) => {
    const first = shapes[0];
    if (!first) return null;
    return <Instances key={key} geometry={geometries[first.kind]} material={materials[first.finish]} limit={shapes.length} frames={1} castShadow={shadows && first.finish === 'matte' && first.kind !== 'leaf'} receiveShadow={shadows} dispose={null}>
      {shapes.map((shape, i) => <Instance key={i} position={shape.position} scale={shape.scale} rotation={shape.rotation} color={shape.color} />)}
    </Instances>;
  })}</>;
}

export default function CafeScene({ coarse = false, preview = false }: { coarse?: boolean; preview?: boolean }) {
  const textures = useMemo(() => getTextures(), []);
  const root = useRef<Group>(null);
  useEffect(() => retainTextures(textures), [textures]);
  useLayoutEffect(() => { if (root.current) { root.current.updateMatrix(); root.current.matrixAutoUpdate = false; } }, []);
  return <>
    <color attach="background" args={[COLORS.cream]} />
    <hemisphereLight args={['#FFF4E2', '#8A6F55', 0.55]} />
    <directionalLight position={[3, 6, 9]} color={C.sunlight} intensity={2.2} castShadow={!preview} shadow-mapSize-width={coarse ? 512 : 1024} shadow-mapSize-height={coarse ? 512 : 1024} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-camera-near={0.5} shadow-camera-far={24} shadow-normalBias={0.035} shadow-bias={-0.0001} />
    {PENDANTS.slice(0, coarse || preview ? 2 : 4).map(([x, y, z], i) => <pointLight key={i} position={[x, y - 0.25, z]} color={C.warmLight} intensity={0.6} distance={4} decay={2} />)}
    <group ref={root}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={!preview}><planeGeometry args={[12, 9]} /><meshStandardMaterial map={textures.floor} roughness={0.85} /></mesh>
      <mesh position={[0, 1.6, -4.55]} receiveShadow={!preview}><boxGeometry args={[12.2, 3.2, 0.1]} /><meshStandardMaterial color={C.plaster} /></mesh>
      {[-6.05, 6.05].map((x) => <mesh key={x} position={[x, 1.6, 0]} receiveShadow={!preview}><boxGeometry args={[0.1, 3.2, 9.1]} /><meshStandardMaterial color={C.plaster} /></mesh>)}
      <mesh position={[0, 3.25, 0]}><boxGeometry args={[12.2, 0.1, 9.2]} /><meshStandardMaterial color={C.ceiling} /></mesh>
      {[0.23, 3.08].map((y) => <mesh key={y} position={[0, y, 4.5]}><boxGeometry args={[12, y < 1 ? 0.46 : 0.24, 0.1]} /><meshStandardMaterial color={C.plaster} /></mesh>)}
      {[-5.78, 5.78].map((x) => <mesh key={x} position={[x, 1.7, 4.5]}><boxGeometry args={[0.44, 2.5, 0.1]} /><meshStandardMaterial color={C.plaster} /></mesh>)}
      <mesh position={[0, 1.7, 4.51]}><planeGeometry args={[11, 2.45]} /><meshStandardMaterial color={C.glass} emissive={C.sky} emissiveIntensity={0.15} transparent opacity={0.12} side={DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, 2.5, 5.5]} rotation={[0, Math.PI, 0]}><planeGeometry args={[18, 6]} /><meshBasicMaterial map={textures.garden} side={DoubleSide} /></mesh>
      <Furniture shadows={!preview} />
      <Suspense fallback={null}>
        <Text font={menuFont} characters="LEAFCOFF ESPRESSOLATTEMATCHAEARLGREYSCONE" position={[-4, 2.56, -4.3]} fontSize={0.16} color={C.oakLight}>LEAF COFFEE</Text>
        <Text font={menuFont} characters="LEAFCOFF ESPRESSOLATTEMATCHAEARLGREYSCONE" position={[-4, 1.92, -4.3]} fontSize={0.11} lineHeight={1.9} color={C.ceramic}>{'ESPRESSO\nLATTE\nMATCHA\nEARL GREY\nSCONE'}</Text>
      </Suspense>
    </group>
  </>;
}
