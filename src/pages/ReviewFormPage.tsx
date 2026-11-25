import { useParams } from 'react-router-dom';
import CommercePage from '@/app/CommercePage';

export default function ReviewFormPage() {
  const { reviewId } = useParams();
  return <CommercePage title={reviewId ? '리뷰 수정' : '리뷰 쓰기'} />;
}
