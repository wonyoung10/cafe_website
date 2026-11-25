import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import Section from '@/components/common/Section';
import NotConfiguredNotice from '@/components/common/NotConfiguredNotice';
import { useAuth, useCommerce } from '@/contexts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { safeNextPath } from '@/utils/nextPath';
import CredentialsForm from './CredentialsForm';

export default function AuthScreen({ signup = false }: { signup?: boolean }) {
  const { configured } = useCommerce();
  const { status } = useAuth();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const other = (signup ? ROUTES.login : ROUTES.signup) + (params.has('next') ? '?next=' + encodeURIComponent(next) : '');
  const title = signup ? '회원가입' : '로그인';
  useDocumentTitle(title);

  if (configured && status === 'member') return <Navigate to={next} replace />;

  return (
    <Section>
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-h1 text-forest">{title}</h1>
        {!configured ? <NotConfiguredNotice /> : status === 'loading' ? (
          <p role="status" className="mt-5 text-ink-soft">로그인 상태를 확인하고 있어요.</p>
        ) : (
          <>
            <CredentialsForm signup={signup} />
            <p className="mt-6 flex flex-wrap items-center gap-x-3 border-t border-line pt-3 text-sm text-ink-soft">
              {signup ? '이미 계정이 있으신가요?' : '처음 방문하셨나요?'}
              <Link to={other} className="inline-flex min-h-11 min-w-11 items-center rounded-leaf-sm font-semibold text-forest underline underline-offset-4">
                {signup ? '로그인' : '회원가입'}
              </Link>
            </p>
          </>
        )}
      </div>
    </Section>
  );
}
