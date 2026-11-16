import { Info } from 'lucide-react';
import Section from '@/components/common/Section';
import SectionHeading from '@/components/common/SectionHeading';
import AddressCard from '@/components/location/AddressCard';
import DirectionsLinks from '@/components/location/DirectionsLinks';
import MapEmbed from '@/components/location/MapEmbed';
import { CAFE_LOCATION } from '@/data/cafe';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function LocationPage() {
  useDocumentTitle('오시는 길');
  return (
    <Section tone="paper">
      <SectionHeading level={1} title="오시는 길" description="하루의 잎이 자라날 자리." />
      <div className="mt-10 grid items-start gap-8 md:mt-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <div className="min-w-0 space-y-6"><AddressCard /><DirectionsLinks /><p className="text-sm leading-relaxed text-ink-soft">{CAFE_LOCATION.description}</p></div>
        <div className="min-w-0"><MapEmbed /><div className="mt-5 flex items-start gap-3 rounded-leaf border border-line bg-ivory/70 p-5"><Info aria-hidden className="mt-1 size-5 shrink-0 text-walnut" /><p className="text-sm leading-relaxed text-ink-soft">{CAFE_LOCATION.notice}</p></div></div>
      </div>
    </Section>
  );
}
