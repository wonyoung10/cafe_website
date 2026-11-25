import { validateLoginId, validatePassword } from '@/utils/credentials';
import type { ReviewInput } from '@/types/commerce';
import { CommerceError } from './errors';

export function checkCredentials(loginId: string, password: string) {
  if (validateLoginId(loginId)) throw new CommerceError('login-id-invalid');
  if (validatePassword(password)) throw new CommerceError('password-invalid');
}

export function reviewBody({ rating, text }: ReviewInput) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new CommerceError('rating-invalid');
  const body = text.trim();
  if (!body || [...body].length > 500) throw new CommerceError('text-invalid');
  return body;
}

export function photoExtension(photo: Blob) {
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[photo.type];
  if (!extension || photo.size > 2 * 1024 * 1024) throw new CommerceError('photo-invalid');
  return extension;
}
