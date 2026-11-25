import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHOTO_MAX_BYTES, PHOTO_MAX_OUTPUT_BYTES, PHOTO_UNREADABLE, fitWithin, resizePhoto, validatePhoto } from './photo';

function blobOf(type: string, size: number) {
  const blob = new Blob(['x'], { type });
  Object.defineProperty(blob, 'size', { value: size });
  return blob;
}

describe('validatePhoto (RV-07)', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('%s 10MB까지 받는다', (type) => {
    expect(validatePhoto(blobOf(type, PHOTO_MAX_BYTES))).toBeNull();
  });

  it.each(['image/gif', 'image/svg+xml', 'image/heic', 'application/pdf', ''])('%s 형식을 거절한다', (type) => {
    expect(validatePhoto(blobOf(type, 10))).toBe('JPG, PNG, WebP 사진을 골라 주세요.');
  });

  it('10MB를 넘거나 빈 파일을 거절한다', () => {
    expect(validatePhoto(blobOf('image/png', PHOTO_MAX_BYTES + 1))).toBe('10MB 이하 사진을 골라 주세요.');
    expect(validatePhoto(blobOf('image/png', 0))).toBe(PHOTO_UNREADABLE);
  });
});

describe('fitWithin (RV-07)', () => {
  it.each([
    [4032, 3024, 1200, 900],
    [3024, 4032, 900, 1200],
    [2400, 2400, 1200, 1200],
    [1200, 800, 1200, 800],
    [640, 480, 640, 480],
    [1201, 1000, 1200, 999],
    [20000, 3, 1200, 1],
  ])('%i×%i → %i×%i', (width, height, expectedWidth, expectedHeight) => {
    expect(fitWithin(width, height)).toEqual({ width: expectedWidth, height: expectedHeight });
  });
});

describe('resizePhoto (RV-07)', () => {
  const create = vi.fn(() => 'blob:photo');
  const revoke = vi.fn();
  const drawImage = vi.fn();
  const fillRect = vi.fn();
  let decode = vi.fn(async () => {});
  let supported: string[] = [];
  let outputSize = 1000;
  const requested: Array<[string | undefined, number | undefined]> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    requested.length = 0;
    supported = ['image/webp', 'image/jpeg'];
    outputSize = 1000;
    decode = vi.fn(async () => {});
    vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: create, revokeObjectURL: revoke }));
    vi.stubGlobal('Image', class {
      src = '';
      naturalWidth = 4000;
      naturalHeight = 3000;
      decode = () => decode();
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      { drawImage, fillRect, fillStyle: '' } as unknown as RenderingContext as never,
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback, type, quality) {
      requested.push([type, quality as number]);
      callback(blobOf(type && supported.includes(type) ? type : 'image/png', outputSize));
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('긴 변 1200px WebP로 다시 인코딩하고 object URL을 해제한다', async () => {
    expect((await resizePhoto(blobOf('image/jpeg', 5000))).type).toBe('image/webp');
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 900);
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:photo');
  });

  it('WebP를 만들 수 없는 브라우저에서는 JPEG로 바꾼다', async () => {
    supported = ['image/jpeg'];
    expect((await resizePhoto(blobOf('image/png', 5000))).type).toBe('image/jpeg');
    expect(requested.map(([type]) => type)).toEqual(['image/webp', 'image/jpeg']);
    expect(fillRect).toHaveBeenCalledWith(0, 0, 1200, 900);
  });

  it('2MB보다 크면 화질을 낮추고, 끝내 크면 오류로 알린다', async () => {
    outputSize = PHOTO_MAX_OUTPUT_BYTES + 1;
    await expect(resizePhoto(blobOf('image/png', 5000))).rejects.toThrow(PHOTO_UNREADABLE);
    expect(requested.map(([, quality]) => quality)).toEqual([0.82, 0.6, 0.4]);
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it('읽을 수 없는 사진도 object URL을 해제하고 안내 문구를 던진다', async () => {
    decode = vi.fn(async () => { throw new DOMException('bad', 'EncodingError'); });
    await expect(resizePhoto(blobOf('image/png', 5000))).rejects.toThrow(PHOTO_UNREADABLE);
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it('형식이 맞지 않으면 읽기 전에 멈춘다', async () => {
    await expect(resizePhoto(blobOf('image/gif', 10))).rejects.toThrow('JPG, PNG, WebP');
    expect(create).not.toHaveBeenCalled();
  });
});
