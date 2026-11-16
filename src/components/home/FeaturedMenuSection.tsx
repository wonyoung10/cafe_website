import { ROUTES } from '@/app/routes';
import { ButtonLink } from '@/components/common/Button';
import Section from '@/components/common/Section';
import SectionHeading from '@/components/common/SectionHeading';
import MenuCard from '@/components/menu/MenuCard';
import { MENU_ITEMS } from '@/data/menu';
import { getFeaturedItems } from '@/utils/menu';

const featured = getFeaturedItems(MENU_ITEMS);

export default function FeaturedMenuSection() {
  return (
    <Section aria-labelledby="featured-heading">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-5 md:mb-12">
        <SectionHeading id="featured-heading" title="오늘의 잎 한 장을 고르세요." />
        <ButtonLink to={ROUTES.menu} variant="ghost" withArrow>전체 메뉴 보기</ButtonLink>
      </div>
      <div className="grid grid-cols-2 gap-5 md:gap-6 lg:grid-cols-4">
        {featured.map((item) => <MenuCard key={item.id} item={item} />)}
      </div>
    </Section>
  );
}
