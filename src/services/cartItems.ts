import { MENU_ITEMS } from '@/data/menu';
import type { CartItem } from '@/types/commerce';
import { CommerceError } from './errors';

export function menuFor(menuId: string) {
  const menu = MENU_ITEMS.find(menu => menu.id === menuId);
  if (!menu) throw new CommerceError('menu-unknown');
  return menu;
}

function validateItem(item: CartItem) {
  const menu = menuFor(item.menuId);
  if (item.temperature === null ? menu.temperatures.length > 0 : !menu.temperatures.includes(item.temperature)) {
    throw new CommerceError('temperature-invalid');
  }
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
    throw new CommerceError('quantity-invalid');
  }
}

function sameLine(line: CartItem, item: Pick<CartItem, 'menuId' | 'temperature'>) {
  return line.menuId === item.menuId && line.temperature === item.temperature;
}

export function changeCart(items: CartItem[], item: CartItem, mode: 'add' | 'set' | 'remove') {
  validateItem(item);
  const index = items.findIndex(line => sameLine(line, item));
  if (index < 0 && mode !== 'add') throw new CommerceError('forbidden');
  if (mode === 'remove') items.splice(index, 1);
  else {
    const previous = items[index]?.quantity ?? 0;
    const quantity = mode === 'add' ? Math.min(previous + item.quantity, 20) : item.quantity;
    const line = { menuId: item.menuId, temperature: item.temperature, quantity };
    if (index < 0) items.push(line);
    else items[index] = line;
  }
}
