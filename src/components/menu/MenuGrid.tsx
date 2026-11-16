import { AnimatePresence, motion } from 'motion/react';
import MenuCard from '@/components/menu/MenuCard';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASE_LEAF } from '@/styles/tokens';
import type { MenuItem } from '@/types/menu';

export default function MenuGrid({ items }: { items: readonly MenuItem[] }) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => (
          <motion.div key={item.id} layout={!reducedMotion} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.35, ease: EASE_LEAF }} className="min-w-0">
            <MenuCard item={item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
