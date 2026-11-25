import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/contexts';

export default function CartButton() {
  const { count } = useCart();
  return (
    <Link to="/cart" aria-label={`장바구니, ${count}개`} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-leaf-sm text-forest hover:bg-cream">
      <ShoppingBag aria-hidden className="size-5" />
      {count > 0 && <span aria-hidden className="text-sm font-semibold tabular-nums">{count}</span>}
    </Link>
  );
}
