import { Coffee, Leaf, Sprout } from 'lucide-react';
import { motion } from 'motion/react';
import { LeafMark } from '@/components/common/BrandLogo';
import Reveal from '@/components/common/Reveal';
import Section from '@/components/common/Section';
import SmartImage from '@/components/common/SmartImage';
import { BRAND } from '@/data/brand';
import { useInView } from '@/hooks/useInView';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { EASE_LEAF } from '@/styles/tokens';

const icons = [Leaf, Coffee, Sprout];

export default function PhilosophySection() {
  const { ref, inView } = useInView();
  const reducedMotion = usePrefersReducedMotion();
  return (
    <Section id="philosophy" tone="cream" aria-labelledby="philosophy-heading">
      <div ref={ref} className="mx-auto max-w-3xl text-center">
        <h2 id="philosophy-heading" className="text-eyebrow">하루에 잎 하나</h2>
        <blockquote className="mt-6 font-serif text-2xl leading-relaxed font-bold text-forest md:text-3xl md:leading-relaxed">{BRAND.philosophy}</blockquote>
        <div aria-hidden className="mt-8 flex justify-center gap-3">
          {Array.from({ length: 7 }, (_, index) => (
            <motion.span key={index} initial={false} animate={{ opacity: reducedMotion || inView ? 1 : 0.2, color: reducedMotion || inView ? 'var(--color-forest)' : 'var(--color-sage)' }} transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : index * 0.16, ease: EASE_LEAF }}>
              <LeafMark className="size-7" />
            </motion.span>
          ))}
        </div>
      </div>
      <div className="mt-14 grid items-center gap-8 md:mt-16 md:grid-cols-2 md:gap-14">
        <SmartImage src="/images/brand/philosophy.webp" alt="식물과 원목의 결이 어우러진 카페의 작은 쉼터" wrapperClassName="aspect-[3/2] rounded-3xl" />
        <div className="space-y-5 text-ink-soft">{BRAND.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      </div>
      <Reveal initial={reducedMotion ? false : { opacity: 0, y: 24 }} className="mt-12 grid gap-5 md:mt-16 md:grid-cols-3">
        {BRAND.values.map((value, index) => {
          const Icon = icons[index] ?? Leaf;
          return (
            <div key={value.id} className="rounded-3xl border border-line bg-ivory/70 p-7 md:p-8">
              <Icon aria-hidden className="mb-5 size-6 text-forest" strokeWidth={1.4} />
              <h3 className="font-serif text-xl font-bold text-forest">{value.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{value.description}</p>
            </div>
          );
        })}
      </Reveal>
    </Section>
  );
}
