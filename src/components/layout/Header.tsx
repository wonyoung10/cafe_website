import { Link, NavLink } from 'react-router-dom';
import { NAV_ITEMS, ROUTES } from '@/app/routes';
import { BRAND } from '@/data/brand';

export default function Header() {
  return (
    <header>
      <Link to={ROUTES.home} aria-label={`${BRAND.name} 홈으로`}>
        {BRAND.name}
      </Link>
      <nav aria-label="주 메뉴">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
