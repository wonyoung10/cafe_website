import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/app/routes';
import { useAuth } from '@/contexts';
import { CommerceError, mapError } from '@/services/errors';
import { safeNextPath } from '@/utils/nextPath';

const actionClass = 'flex min-h-11 min-w-11 items-center rounded-leaf-sm px-3 text-left font-semibold text-forest hover:bg-cream';

function MemberActions({ loginId, onLogOut }: { loginId: string; onLogOut: () => void }) {
  const { logOut } = useAuth();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    onLogOut();
    try {
      await logOut();
    } catch (cause) {
      setError(new CommerceError(mapError(cause).code).message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <p className="break-all border-b border-line px-3 py-2 text-sm text-ink-soft">
        <span className="sr-only">아이디 </span>{loginId}
      </p>
      <Link className={actionClass} to={ROUTES.orders}>주문 내역</Link>
      <Link className={actionClass} to={ROUTES.reviews + '?mine=1'}>내 리뷰</Link>
      <button type="button" className={actionClass + ' w-full'} disabled={pending} onClick={signOut}>로그아웃</button>
      {pending && <p role="status" className="px-3 text-sm text-ink-soft">로그아웃하고 있어요.</p>}
      {error && <p role="alert" className="px-3 text-sm text-walnut">{error}</p>}
    </div>
  );
}

function MemberDisclosure({ loginId, onLogOut }: { loginId: string; onLogOut: () => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function close() {
      setOpen(false);
      trigger.current?.focus();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    function onClick(event: MouseEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        if (document.activeElement === document.body || root.current?.contains(document.activeElement)) close();
        else setOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  return (
    <div ref={root} className="relative" onBlur={event => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" aria-expanded={open} aria-controls={id}
        className={actionClass + ' gap-1 whitespace-nowrap'} onClick={() => setOpen(!open)}>
        내 계정 <ChevronDown aria-hidden className="size-4" />
      </button>
      <div id={id} hidden={!open} className="absolute right-0 top-full mt-1 w-48 rounded-leaf border border-line bg-ivory p-2 shadow-lift">
        <MemberActions loginId={loginId} onLogOut={onLogOut} />
      </div>
    </div>
  );
}

export default function AccountMenu({ variant = 'desktop' }: { variant?: 'desktop' | 'panel' }) {
  const { status, user } = useAuth();
  const location = useLocation();
  const login = useRef<HTMLAnchorElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (status === 'guest' && returnFocus.current) {
      if (document.activeElement === document.body) login.current?.focus();
      returnFocus.current = false;
    }
  }, [status]);

  if (status === 'loading') return null;
  if (status === 'member' && user) {
    const props = { loginId: user.loginId, onLogOut: () => { returnFocus.current = true; } };
    return variant === 'panel'
      ? <div className="mt-3 border-t border-line pt-2"><MemberActions {...props} /></div>
      : <MemberDisclosure key={location.key + user.id} {...props} />;
  }
  const authPage = location.pathname === ROUTES.login || location.pathname === ROUTES.signup;
  const next = authPage ? new URLSearchParams(location.search).get('next') : null;
  const query = next === null ? '' : '?next=' + encodeURIComponent(safeNextPath(next));
  return (
    <div className={'flex items-center text-sm ' + (variant === 'panel' ? 'mt-3 border-t border-line pt-2' : '')}>
      <Link ref={login} className={actionClass} to={ROUTES.login + query}>로그인</Link>
      <span aria-hidden className="text-ink-soft">·</span>
      <Link className={actionClass} to={ROUTES.signup + query}>회원가입</Link>
    </div>
  );
}
