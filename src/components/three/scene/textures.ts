import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

interface TextureCache { floor: CanvasTexture; garden: CanvasTexture; users: number }
let cache: TextureCache | undefined;
function canvasTexture(paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  if (context) paint(context);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
export function getTextures(): TextureCache {
  if (cache) return cache;
  const floor = canvasTexture((ctx) => {
    ctx.fillStyle = '#C9A27A'; ctx.fillRect(0, 0, 512, 512);
    let seed = 73;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let row = 0; row < 8; row++) {
      ctx.fillStyle = `hsl(31 35% ${61 + random() * 10}%)`; ctx.fillRect(0, row * 64, 512, 63);
      ctx.fillStyle = '#927052'; ctx.fillRect(0, row * 64, 512, 1);
      const seam = (row % 2) * 240 + 30;
      ctx.fillRect(seam, row * 64, 1, 64);
      for (let line = 0; line < 80; line++) {
        ctx.fillStyle = `rgba(91,61,33,${random() * 0.1})`;
        ctx.fillRect(random() * 512, row * 64 + random() * 63, 30 + random() * 130, 0.6);
      }
    }
  });
  floor.wrapS = floor.wrapT = RepeatWrapping; floor.repeat.set(3, 3);
  const garden = canvasTexture((ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#DCEBF0'); gradient.addColorStop(0.6, '#F7EED7'); gradient.addColorStop(1, '#BBC6A3');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9; i++) {
      const x = i * 68 - 15; const y = 225 + Math.sin(i * 2) * 45;
      ctx.fillStyle = '#9DAF94'; ctx.fillRect(x - 3, y, 6, 512 - y);
      ctx.fillStyle = i % 2 ? '#B6C3A6' : '#A5B89A';
      ctx.beginPath(); ctx.ellipse(x, y, 45, 85, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
  cache = { floor, garden, users: 0 };
  return cache;
}
/** A microtask lease also survives React StrictMode's immediate effect replay. */
export function retainTextures(textures: TextureCache) {
  textures.users++;
  return () => {
    textures.users--;
    queueMicrotask(() => {
      if (textures.users === 0) {
        textures.floor.dispose(); textures.garden.dispose();
        if (cache === textures) cache = undefined;
      }
    });
  };
}
