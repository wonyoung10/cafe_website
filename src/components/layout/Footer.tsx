import { BRAND } from '@/data/brand';
import { CAFE_LOCATION } from '@/data/cafe';

export default function Footer() {
  return (
    <footer>
      <p>{BRAND.name}</p>
      <p>{CAFE_LOCATION.address}</p>
    </footer>
  );
}
