import type { ReactNode } from 'react';
import { Button, ButtonLink } from '@/components/common/Button';
import { useCart } from '@/contexts';

export default function CartContents({ children }: { children: ReactNode }) {
  const { status, items, reload } = useCart();
  if (status === 'loading') return <p role="status">장바구니를 불러오고 있어요.</p>;
  return (
    <>
      {status === 'error' && (
        <div className="mb-4">
          <p role="alert">장바구니를 다시 불러와 수량과 금액을 확인해 주세요.</p>
          <Button variant="secondary" onClick={() => void reload().catch(() => {})}>장바구니 다시 불러오기</Button>
        </div>
      )}
      {items.length > 0 ? children : status === 'ready' && (
        <div>
          <p className="mb-5 text-ink-soft">장바구니가 비어 있어요.</p>
          <ButtonLink to="/menu">메뉴 보러 가기</ButtonLink>
        </div>
      )}
    </>
  );
}
