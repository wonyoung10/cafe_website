import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HOTSPOTS } from '@/data/hotspots';
import StoreExperience from './StoreExperience';
import StorePreview from './StorePreview';

vi.mock('@/utils/webgl', () => ({ isWebGLAvailable: () => false }));
beforeEach(() => vi.clearAllMocks());
describe('static WebGL alternatives', () => {
  it('renders the fallback and every hotspot without mounting Canvas', () => {
    const { container } = render(<StoreExperience />);
    expect(screen.getByRole('status')).toHaveTextContent('이 환경에서는 3D 매장을 표시할 수 없어요.');
    for (const spot of HOTSPOTS) expect(screen.getByRole('heading', { name: spot.title })).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('src', '/images/store/store-fallback.webp');
    fireEvent.error(image);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
  it('keeps the home preview labelled and fills its parent in fallback mode', () => {
    const { container } = render(<StorePreview className="rounded-xl" />);
    expect(screen.getByLabelText('하루의 잎 가상 매장 미리보기')).toHaveClass('h-full', 'w-full', 'rounded-xl');
    expect(container.querySelector('canvas')).toBeNull();
  });
});
