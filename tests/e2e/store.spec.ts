import type { Page } from '@playwright/test';
import type { CameraView, Point3 } from '../../src/types/three';
import { expect, test } from './fixtures';

test.describe.configure({ timeout: 90_000 });

async function camera(page: Page): Promise<CameraView> {
  return page.evaluate(() => {
    const debug = window.__CAFE_3D__;
    if (!debug) throw new Error('3D debug hook is missing');
    return debug.getCamera();
  });
}

function distance(a: Point3, b: Point3) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

async function openStore(page: Page) {
  await page.goto('/store', { waitUntil: 'domcontentloaded' });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.__CAFE_3D__?.ready), { timeout: 30_000 }).toBe(true);
  await expect(page.getByRole('status').filter({ hasText: '매장을 준비하고 있어요' })).toHaveCount(0, { timeout: 30_000 });
  // ready means frames have rendered; controls may still be completing the initial transition.
  await expect.poll(async () => distance((await camera(page)).position, [4.8, 2.6, 3.8]), { timeout: 20_000 }).toBeLessThan(0.02);
  return canvas;
}

async function enterWalk(page: Page) {
  const button = page.getByRole('button', { name: '실내 탐색', exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.__CAFE_3D__?.mode)).toBe('walk');
  // A completed transition snaps to WALK_START, avoiding a false movement result from damping.
  await expect.poll(async () => distance((await camera(page)).position, [3.4, 1.6, 1.8]), { timeout: 20_000 }).toBeLessThan(0.001);
}

test('캔버스가 준비되고 로딩 표시가 사라진다', async ({ page }) => {
  await openStore(page);
  expect(await page.evaluate(() => window.__CAFE_3D__?.mode)).toBe('orbit');
});

test('데스크톱 드래그가 카메라 위치를 바꾼다', async ({ page, isMobile }) => {
  test.skip(isMobile, '데스크톱 마우스 조작 전용');
  const canvas = await openStore(page);
  const before = await camera(page);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.6);
  await page.mouse.down();
  try { await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.65, { steps: 12 }); }
  finally { await page.mouse.up(); }
  await expect.poll(async () => distance((await camera(page)).position, before.position)).toBeGreaterThan(0.1);
});

test('실내 탐색에서 W로 이동하며 눈높이를 유지한다', async ({ page }) => {
  await openStore(page);
  await enterWalk(page);
  const before = await camera(page);
  await page.keyboard.down('w');
  try { await page.waitForTimeout(600); }
  finally { await page.keyboard.up('w'); }
  const after = await camera(page);
  expect(distance(after.position, before.position)).toBeGreaterThan(0.02);
  expect(after.position[1]).toBeCloseTo(1.6, 2);
});

test('북쪽 벽에 계속 걸어도 방 경계를 벗어나지 않는다', async ({ page }) => {
  const canvas = await openStore(page);
  await enterWalk(page);
  // Turn to face north using a real drag, then move west through the clear south aisle.
  const view = await camera(page);
  const yaw = Math.atan2(view.position[0] - view.target[0], view.position[2] - view.target[2]);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas has no bounding box');
  const x = box.x + box.width * 0.3;
  const y = box.y + box.height * 0.6;
  await page.mouse.move(x, y);
  await page.mouse.down();
  try { await page.mouse.move(x + yaw / 0.004, y, { steps: 12 }); }
  finally { await page.mouse.up(); }
  await page.keyboard.down('a');
  try {
    await expect.poll(async () => (await camera(page)).position[0], { timeout: 30_000, intervals: [100] }).toBeLessThan(-4);
  } finally { await page.keyboard.up('a'); }
  await page.keyboard.down('w');
  try {
    // Require reaching the actual north wall, rather than passing because furniture blocked us.
    await expect.poll(async () => (await camera(page)).position[2], { timeout: 30_000, intervals: [100] }).toBeLessThan(-4.1);
    for (let sample = 0; sample < 12; sample++) {
      await page.waitForTimeout(250);
      const [px, py, pz] = (await camera(page)).position;
      expect(px).toBeGreaterThanOrEqual(-6);
      expect(px).toBeLessThanOrEqual(6);
      expect(pz).toBeGreaterThanOrEqual(-4.5);
      expect(pz).toBeLessThanOrEqual(4.5);
      expect(py).toBeCloseTo(1.6, 2);
    }
  } finally { await page.keyboard.up('w'); }
});

test('핫스팟 설명을 열고 Escape로 닫으며 시점을 초기화한다', async ({ page }) => {
  await openStore(page);
  const list = page.getByRole('complementary', { name: '공간 둘러보기' });
  for (const title of ['커피 바', '에스프레소 머신', '창가 좌석', '디저트 진열장', '식물 코너', '메뉴 보드']) {
    const button = list.getByRole('button', { name: title, exact: true });
    await button.click();
    const panel = page.getByRole('region', { name: title, exact: true });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(button).toBeFocused();
  }
  // On mobile, clicking the lower list scrolls the Canvas out of view and pauses rendering.
  await page.locator('canvas').scrollIntoViewIfNeeded();
  await expect.poll(async () => distance((await camera(page)).position, [4.8, 2.6, 3.8]), { timeout: 20_000 }).toBeGreaterThan(0.5);
  await page.getByRole('button', { name: '시점 초기화', exact: true }).click();
  await expect(page.getByRole('button', { name: '둘러보기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => {
    const view = await camera(page);
    return Math.max(distance(view.position, [4.8, 2.6, 3.8]), distance(view.target, [0, 1, -1]));
  }, { timeout: 20_000 }).toBeLessThan(0.02);
});

test('모바일 실내 탐색에 방향 패드가 보인다', async ({ page, isMobile, viewport }) => {
  test.skip(!isMobile || !viewport || viewport.width >= 768, '모바일 뷰포트 전용');
  await openStore(page);
  await enterWalk(page);
  const pad = page.getByRole('group', { name: '이동 방향 패드' });
  await expect(pad).toBeVisible();
  for (const name of ['앞으로', '뒤로', '왼쪽', '오른쪽']) await expect(pad.getByRole('button', { name, exact: true })).toBeVisible();
});

test('WebGL이 없으면 대체 설명을 표시한다', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: () => null });
  });
  await page.goto('/store', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('status')).toHaveText('이 환경에서는 3D 매장을 표시할 수 없어요.');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('article')).toHaveCount(6);
  await expect(page.getByRole('img', { name: '햇살과 식물이 머무는 하루의 잎 가상 매장' })).toBeVisible();
});

async function daylight(page: Page) {
  return page.evaluate(() => {
    const debug = window.__CAFE_3D_DAYLIGHT__;
    if (!debug) throw new Error('daylight debug hook is missing');
    return { timeOfDay: debug.timeOfDay, settled: debug.settled, ...debug.getLevels() };
  });
}

test('하루의 빛: 시간대를 바꾸면 조명이 부드럽게 바뀐다', async ({ page }) => {
  await openStore(page);
  const group = page.getByRole('group', { name: '하루의 빛', exact: true });
  const viewer = page.locator('[data-time-of-day]').first();

  await group.getByRole('button', { name: '오후', exact: true }).click();
  await expect(viewer).toHaveAttribute('data-time-of-day', 'afternoon');
  await expect.poll(async () => (await daylight(page)).settled, { timeout: 15_000 }).toBe(true);
  const afternoon = await daylight(page);

  await group.getByRole('button', { name: '저녁', exact: true }).click();
  await expect(group.getByRole('button', { name: '저녁', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(group.getByRole('button', { name: '오후', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(viewer).toHaveAttribute('data-time-of-day', 'evening');
  await expect(page.getByText(/저녁, 창밖이 저물고/)).toBeVisible();
  // 선택 직후 디버그 상태가 새 시간대를 가리키고, 이후 보간이 끝나면 settled가 된다
  const midway = await daylight(page);
  expect(midway.timeOfDay).toBe('evening');
  await expect.poll(async () => (await daylight(page)).settled, { timeout: 15_000 }).toBe(true);
  const evening = await daylight(page);
  expect(evening.sun).toBeLessThan(afternoon.sun * 0.2);
  expect(evening.pendant).toBeGreaterThan(afternoon.pendant * 3);

  await group.getByRole('button', { name: '아침', exact: true }).click();
  await expect.poll(async () => (await daylight(page)).settled, { timeout: 15_000 }).toBe(true);
  const morning = await daylight(page);
  expect(morning.timeOfDay).toBe('morning');
  expect(morning.sun).toBeGreaterThan(evening.sun * 5);
  expect(morning.pendant).toBeLessThan(evening.pendant);
});
