import { Coffee, Leaf, Sprout } from 'lucide-react';
import Section from '@/components/common/Section';
import SmartImage from '@/components/common/SmartImage';
import WeekBranch from '@/components/home/WeekBranch';
import { BRAND } from '@/data/brand';

const icons = [Leaf, Coffee, Sprout];

export default function PhilosophySection() {
  return (
    <Section id="philosophy" tone="cream" aria-labelledby="philosophy-heading">
      <h2 id="philosophy-heading" className="font-serif text-base font-bold text-walnut md:text-lg">
        하루에 잎 하나
      </h2>
      <blockquote className="mt-5 max-w-[30ch] font-serif text-[1.625rem] leading-[1.6] font-bold tracking-[-0.01em] text-forest md:text-[2.25rem]">
        {BRAND.philosophy}
      </blockquote>
      <WeekBranch className="mt-12 max-w-4xl md:mt-16" />

      <div className="mt-16 grid items-center gap-8 md:mt-24 md:grid-cols-[1.15fr_1fr] md:gap-14">
        <SmartImage
          src="/images/brand/philosophy.webp"
          alt="식물과 원목의 결이 어우러진 카페의 작은 쉼터"
          wrapperClassName="aspect-[3/2] rounded-3xl"
        />
        <div className="max-w-md space-y-5 text-ink-soft">
          {BRAND.story.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      <ul className="mt-16 grid border-t border-line md:mt-20 md:grid-cols-3">
        {BRAND.values.map((value, index) => {
          const Icon = icons[index] ?? Leaf;
          return (
            <li
              key={value.id}
              className="border-b border-line py-7 last:border-b-0 md:border-b-0 md:border-l md:px-8 md:py-9 md:first:border-l-0 md:first:pl-0 md:last:pr-0"
            >
              <h3 className="flex items-center gap-2.5 font-serif text-xl font-bold text-forest">
                <Icon aria-hidden className="size-5 text-walnut" strokeWidth={1.5} />
                {value.title}
              </h3>
              <p className="mt-3 max-w-xs text-[0.9375rem] leading-relaxed text-ink-soft">{value.description}</p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
