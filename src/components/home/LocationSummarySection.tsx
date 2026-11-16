import { MapPin } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { ButtonLink } from '@/components/common/Button';
import Section from '@/components/common/Section';
import SectionHeading from '@/components/common/SectionHeading';
import { CAFE_LOCATION } from '@/data/cafe';

export default function LocationSummarySection() {
  return (
    <Section aria-labelledby="location-summary-heading" containerClassName="flex flex-wrap items-center justify-between gap-8">
      <div>
        <SectionHeading id="location-summary-heading" eyebrow="Find your little rest" title="하루의 잎이 자라날 자리." />
        <p className="mt-5 flex items-start gap-2.5 text-ink-soft"><MapPin aria-hidden className="mt-1 size-5 shrink-0 text-forest" />{CAFE_LOCATION.address}</p>
      </div>
      <ButtonLink to={ROUTES.location} variant="secondary" withArrow>오시는 길</ButtonLink>
    </Section>
  );
}
