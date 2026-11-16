import { ArrowRight, ExternalLink } from 'lucide-react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { buttonClassName, type ButtonSize, type ButtonVariant } from '@/components/common/buttonStyles';

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  /** 오른쪽 화살표(hover 시 이동) */
  withArrow?: boolean;
}

function Content({ children, icon, withArrow }: { children: ReactNode; icon?: ReactNode; withArrow?: boolean }) {
  return (
    <>
      {icon}
      <span>{children}</span>
      {withArrow && (
        <ArrowRight
          aria-hidden
          className="size-[1.1em] transition-transform duration-200 ease-[var(--ease-leaf)] group-hover:translate-x-1"
        />
      )}
    </>
  );
}

type ButtonProps = CommonProps & ComponentPropsWithoutRef<'button'>;

export function Button({ variant, size, icon, withArrow, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClassName(variant, size, className)} {...rest}>
      <Content icon={icon} withArrow={withArrow}>
        {children}
      </Content>
    </button>
  );
}

type ButtonLinkProps = CommonProps & LinkProps;

/** 내부 이동용 버튼 모양 링크 (React Router Link) */
export function ButtonLink({ variant, size, icon, withArrow, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClassName(variant, size, className)} {...rest}>
      <Content icon={icon} withArrow={withArrow}>
        {children}
      </Content>
    </Link>
  );
}

type ExternalButtonLinkProps = CommonProps & Omit<ComponentPropsWithoutRef<'a'>, 'target' | 'rel'>;

/** 외부 사이트 링크: 새 창 + 보안 rel + 스크린리더 안내 */
export function ExternalButtonLink({ variant, size, icon, className, children, ...rest }: ExternalButtonLinkProps) {
  return (
    <a target="_blank" rel="noopener noreferrer" className={buttonClassName(variant, size, className)} {...rest}>
      {icon}
      <span>
        {children}
        <span className="sr-only"> (새 창)</span>
      </span>
      <ExternalLink aria-hidden className="size-[1em] opacity-70" />
    </a>
  );
}
