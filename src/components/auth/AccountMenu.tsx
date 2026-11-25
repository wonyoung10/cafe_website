import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts';

export default function AccountMenu({ variant }: { variant?: 'desktop' | 'panel' }) {
  const { status } = useAuth();
  if (status === 'loading') return null;
  const member = status === 'member';
  return <Link className={'inline-flex min-h-11 min-w-11 items-center font-semibold text-forest ' + (variant === 'panel' ? 'px-4' : 'px-1')}
    to={member ? '/orders' : '/login'}>{member ? '내 계정' : '로그인'}</Link>;
}
