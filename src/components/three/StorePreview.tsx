/**
 * [계약 스텁] A04(Three.js)가 홈 화면용 경량 3D 미리보기로 교체한다.
 * default export, props: { className?: string }
 */
export interface StorePreviewProps {
  className?: string;
}

export default function StorePreview({ className }: StorePreviewProps) {
  return (
    <div className={className} data-testid="store-preview-stub">
      3D 매장 미리보기
    </div>
  );
}
