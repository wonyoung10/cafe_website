import { COLORS } from '@/styles/tokens';

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_ACCEPT = PHOTO_TYPES.join(',');
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_MAX_EDGE = 1200;
/** 저장소 버킷이 받는 최대 크기 */
export const PHOTO_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

export const PHOTO_UNREADABLE = '사진을 읽지 못했어요. 다른 사진을 골라 주세요.';

/** 올리기 전에 형식과 크기를 검사한다. 오류 문구 또는 null. */
export function validatePhoto(file: Blob): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return 'JPG, PNG, WebP 사진을 골라 주세요.';
  if (file.size === 0) return PHOTO_UNREADABLE;
  if (file.size > PHOTO_MAX_BYTES) return '10MB 이하 사진을 골라 주세요.';
  return null;
}

/** 비율을 지키며 긴 변을 maxEdge에 맞춘다. 작은 사진은 키우지 않는다. */
export function fitWithin(width: number, height: number, maxEdge = PHOTO_MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * 긴 변 1200px로 줄여 WebP로 다시 인코딩한다. WebP 인코딩이 없는 브라우저는 JPEG.
 * 픽셀만 다시 쓰기 때문에 위치·기기 같은 메타데이터는 남지 않는다.
 */
export async function resizePhoto(file: Blob): Promise<Blob> {
  const invalid = validatePhoto(file);
  if (invalid) throw new Error(invalid);

  const url = URL.createObjectURL(file);
  try {
    // <img>는 사진의 회전 정보를 반영해 그려 준다
    const image = new Image();
    image.src = url;
    await image.decode();
    const { width, height } = fitWithin(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error(PHOTO_UNREADABLE);
    // JPEG에는 투명이 없어 검게 변하므로 종이색을 먼저 깐다
    context.fillStyle = COLORS.ivory;
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of [0.82, 0.6, 0.4]) {
      // 지원하지 않는 형식을 요청하면 브라우저가 PNG를 돌려주므로 결과의 형식을 확인한다
      let blob = await encode(canvas, 'image/webp', quality);
      if (blob?.type !== 'image/webp') blob = await encode(canvas, 'image/jpeg', quality);
      if (blob?.type.match(/^image\/(webp|jpeg)$/) && blob.size <= PHOTO_MAX_OUTPUT_BYTES) return blob;
    }
    throw new Error(PHOTO_UNREADABLE);
  } catch {
    throw new Error(PHOTO_UNREADABLE);
  } finally {
    URL.revokeObjectURL(url);
  }
}
