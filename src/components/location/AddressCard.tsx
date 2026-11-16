import { Check, Copy, MapPin } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { CAFE_LOCATION } from '@/data/cafe';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

export default function AddressCard() {
  const { copy, status } = useCopyToClipboard();
  const Icon = status === 'copied' ? Check : Copy;
  return (
    <div className="rounded-3xl border border-line bg-ivory p-6 shadow-soft md:p-8">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-walnut"><MapPin aria-hidden className="size-4" />주소</h2>
      <address className="mt-4 font-serif text-2xl leading-snug font-bold text-forest not-italic select-text md:text-[1.75rem]">{CAFE_LOCATION.address}</address>
      <p className="mt-2 text-sm text-ink-soft">우편번호 {CAFE_LOCATION.postalCode}</p>
      <Button variant="secondary" className="mt-5" icon={<Icon aria-hidden className="size-4" />} onClick={() => void copy(CAFE_LOCATION.address)}>주소 복사</Button>
      <p role="status" aria-live="polite" aria-atomic="true" className="mt-3 min-h-6 text-sm text-ink-soft">{status === 'copied' ? '주소가 복사되었어요' : status === 'error' ? '복사하지 못했어요. 직접 선택해 복사해 주세요.' : ''}</p>
    </div>
  );
}
