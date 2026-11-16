import { MapPin } from 'lucide-react';
import { ROUTES } from '@/app/routes';
import { ButtonLink } from '@/components/common/Button';
import Section from '@/components/common/Section';
import { CAFE_LOCATION } from '@/data/cafe';

export default function LocationSummarySection() {
  return (
    <Section aria-labelledby="location-summary-heading" className="py-16 md:py-24">
      <div className="grid gap-8 border-t border-line pt-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:pt-14">
        <div className="min-w-0">
          <h2 id="location-summary-heading" className="font-serif text-base font-bold text-walnut md:text-lg">
            하루의 잎이 자라날 자리.
          </h2>
          <div className="mt-4 flex items-start gap-3 md:mt-5">
            <MapPin aria-hidden className="mt-2 size-6 shrink-0 text-sage md:mt-3 md:size-7" strokeWidth={1.6} />
            <p className="font-serif text-2xl leading-snug font-bold text-forest md:text-[2.125rem]">{CAFE_LOCATION.address}</p>
          </div>
        </div>
        <ButtonLink to={ROUTES.location} variant="secondary" size="lg" withArrow className="justify-self-start">
          오시는 길
        </ButtonLink>
      </div>
    </Section>
  );
}
