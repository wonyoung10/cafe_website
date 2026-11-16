import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { NAV_ITEMS, ROUTES } from '@/app/routes';
import BrandLogo from '@/components/common/BrandLogo';
import Container from '@/components/common/Container';
import { BRAND } from '@/data/brand';
import { CAFE_LOCATION } from '@/data/cafe';

export default function Footer() {
  return (
    <footer className="relative bg-forest text-ivory">
      {/* 숲 가장자리: 나무 꼭대기가 겹쳐 이어지는 실루엣 */}
      <svg aria-hidden viewBox="0 0 1440 64" preserveAspectRatio="none" className="absolute inset-x-0 bottom-full -mb-px h-8 w-full text-forest md:h-12">
        <path d="M0 64 L0 40 C-4 11 47 11 53 40 C47 26 88 26 93 40 C93 30 154 30 162 40 C158 16 210 16 217 40 C206 20 237 20 241 40 C234 29 293 29 300 40 C292 16 328 16 332 40 C324 25 360 25 364 40 C359 27 388 27 392 40 C391 12 443 12 450 40 C451 18 513 18 521 40 C519 24 561 24 566 40 C555 17 593 17 598 40 C596 24 637 24 642 40 C635 20 676 20 681 40 C680 30 716 30 721 40 C713 18 742 18 746 40 C737 30 771 30 775 40 C772 27 821 27 827 40 C815 27 843 27 846 40 C836 24 872 24 877 40 C869 28 897 28 900 40 C899 30 953 30 960 40 C950 12 981 12 985 40 C979 24 1033 24 1040 40 C1032 18 1062 18 1066 40 C1064 28 1124 28 1131 40 C1120 25 1155 25 1159 40 C1152 29 1216 29 1224 40 C1223 13 1264 13 1269 40 C1260 26 1318 26 1325 40 C1322 29 1378 29 1385 40 C1386 18 1442 18 1450 40 L1440 64Z" fill="var(--color-forest-deep)" opacity="0.55" />
        <path d="M0 64 L0 50 C-6 31 22 31 26 50 C18 29 54 29 58 50 C55 28 99 28 105 50 C103 28 149 28 155 50 C149 44 169 44 172 50 C167 31 218 31 224 50 C220 37 248 37 252 50 C246 31 268 31 271 50 C264 43 308 43 313 50 C308 29 356 29 362 50 C360 44 399 44 404 50 C399 41 424 41 427 50 C426 39 470 39 476 50 C467 32 504 32 509 50 C500 39 528 39 531 50 C518 29 540 29 543 50 C537 38 561 38 564 50 C561 42 612 42 618 50 C617 29 666 29 672 50 C663 38 703 38 708 50 C700 31 728 31 732 50 C727 30 766 30 771 50 C762 34 802 34 807 50 C799 36 839 36 844 50 C841 39 866 39 869 50 C859 29 879 29 882 50 C881 28 930 28 936 50 C933 34 983 34 989 50 C978 39 1005 39 1008 50 C996 33 1024 33 1028 50 C1022 35 1060 35 1065 50 C1059 39 1085 39 1088 50 C1085 31 1114 31 1118 50 C1111 43 1139 43 1143 50 C1133 37 1180 37 1186 50 C1178 44 1206 44 1210 50 C1205 28 1250 28 1256 50 C1248 37 1281 37 1285 50 C1283 42 1332 42 1338 50 C1330 29 1372 29 1377 50 C1375 43 1411 43 1415 50 C1409 43 1445 43 1449 50 C1441 39 1446 39 1450 50 C1441 34 1447 34 1450 50 C1438 40 1446 40 1450 50 C1440 36 1447 36 1450 50 L1440 64Z" fill="currentColor" />
      </svg>
      <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:py-20">
        <div>
          <Link to={ROUTES.home} aria-label={`${BRAND.name} 홈으로`} className="inline-block rounded-full">
            <BrandLogo tone="light" />
          </Link>
          <p className="mt-6 max-w-sm font-serif text-lg leading-relaxed text-ivory/85">{BRAND.tagline}</p>
          <p className="mt-2 max-w-sm text-sm text-ivory/60">{BRAND.subTagline}</p>
        </div>

        <nav aria-label="하단 메뉴">
          <p className="text-sm font-semibold text-sprout">둘러보기</p>
          <ul className="mt-4 space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-ivory/80 transition-colors hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold text-sprout">찾아오기</p>
          <p className="mt-4 flex gap-2 text-ivory/80">
            <MapPin aria-hidden className="mt-1.5 size-4 shrink-0 text-sage" />
            <span>{CAFE_LOCATION.address}</span>
          </p>
        </div>
      </Container>
      <div className="border-t border-ivory/10">
        <Container className="flex flex-col gap-2 py-6 text-xs text-ivory/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name}
            {BRAND.isTemporaryName && ' (가칭)'}
          </p>
          <p>대학교 웹 프로그래밍 과제로 제작한 비상업 웹사이트입니다.</p>
        </Container>
      </div>
    </footer>
  );
}
