import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CartButton() {
  return (
    <Link to="/cart" aria-label="장바구니" className="grid size-11 place-items-center rounded-leaf-sm text-forest hover:bg-cream">
      <ShoppingBag aria-hidden className="size-5" />
    </Link>
  );
}
