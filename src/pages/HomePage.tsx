import FeaturedMenuSection from '@/components/home/FeaturedMenuSection';
import HeroSection from '@/components/home/HeroSection';
import LocationSummarySection from '@/components/home/LocationSummarySection';
import PhilosophySection from '@/components/home/PhilosophySection';
import StorePreviewSection from '@/components/home/StorePreviewSection';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function HomePage() {
  useDocumentTitle();
  return <><HeroSection /><PhilosophySection /><FeaturedMenuSection /><StorePreviewSection /><LocationSummarySection /></>;
}
