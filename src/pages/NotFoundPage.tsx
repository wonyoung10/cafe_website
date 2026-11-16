import { Link } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('페이지를 찾을 수 없어요');
  return (
    <section>
      <h1>길을 잃은 잎사귀예요</h1>
      <p>요청하신 페이지를 찾을 수 없어요.</p>
      <Link to={ROUTES.home}>홈으로</Link>
    </section>
  );
}
