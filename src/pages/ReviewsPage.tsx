import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, ButtonLink } from '@/components/common/Button';
import NotConfiguredNotice from '@/components/common/NotConfiguredNotice';
import Section from '@/components/common/Section';
import SectionHeading from '@/components/common/SectionHeading';
import ReviewEntry from '@/components/reviews/ReviewEntry';
import ReviewFilters from '@/components/reviews/ReviewFilters';
import ReviewNotice from '@/components/reviews/ReviewNotice';
import ReviewSummary from '@/components/reviews/ReviewSummary';
import { menuName, parseReviewQuery, writeReviewQuery, type ReviewQuery } from '@/components/reviews/reviewQuery';
import { useLoad } from '@/components/reviews/useLoad';
import { useAuth, useCommerce } from '@/contexts';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/utils/cn';

const TITLE = '리뷰 모아보기';

/** 리뷰를 저장하고 돌아올 때 넘겨받는 안내 */
function noticeFrom(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('reviewNotice' in state)) return null;
  return typeof state.reviewNotice === 'string' ? state.reviewNotice : null;
}

function EmptyList({ query, onChange }: { query: ReviewQuery; onChange: (change: Partial<ReviewQuery>) => void }) {
  const { menuId, mine } = query;
  if (menuId) {
    const name = menuName(menuId);
    return (
      <ReviewNotice
        title={mine ? `${name}에 쓴 내 리뷰가 없어요.` : `${name} 리뷰는 아직 없어요.`}
        action={<Button variant="secondary" onClick={() => onChange({ menuId: null })}>{mine ? '내 리뷰 모두 보기' : '모든 메뉴 리뷰 보기'}</Button>}
      >
        다른 메뉴의 리뷰를 먼저 읽어 보세요.
      </ReviewNotice>
    );
  }
  if (mine) {
    return (
      <ReviewNotice title="아직 쓴 리뷰가 없어요." action={<ButtonLink to="/orders" variant="secondary" withArrow>주문 내역 보기</ButtonLink>}>
        주문 내역에서 드신 메뉴를 골라 리뷰를 쓸 수 있어요.
      </ReviewNotice>
    );
  }
  return (
    <ReviewNotice title="아직 남겨진 리뷰가 없어요." action={<ButtonLink to="/menu" variant="secondary" withArrow>메뉴 보러 가기</ButtonLink>}>
      첫 이야기를 기다리고 있어요. 메뉴를 주문하면 리뷰를 쓸 수 있어요.
    </ReviewNotice>
  );
}

function ReviewBrowser() {
  const { api } = useCommerce();
  const { status, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseReviewQuery(searchParams);
  const { menuId, mine, sort } = query;
  const owner = user?.id ?? null;
  const needsLogin = mine && status === 'guest';

  const load = useCallback(async () => ({
    owner,
    reviews: await api.reviews.list({ ...(menuId && { menuId }), ...(mine && { mineOnly: true }), sort }),
  }), [api, owner, menuId, mine, sort]);
  const { loading, data, error, reload } = useLoad(status === 'loading' || needsLogin ? null : load);

  const [notice, setNotice] = useState(() => noticeFrom(location.state));
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  /** 저장하고 돌아왔거나 리뷰를 지운 뒤 초점을 받을 요소 */
  const [focus, setFocus] = useState(() => (notice ? { id: 'review-notice' } : null));

  useEffect(() => {
    if (focus) document.getElementById(focus.id)?.focus();
  }, [focus]);

  // 새로고침했을 때 같은 안내가 다시 나오지 않도록 기록에서 지운다
  const arrivedWithNotice = noticeFrom(location.state) !== null;
  useEffect(() => {
    if (arrivedWithNotice) void navigate({ search: location.search }, { replace: true, state: null, preventScrollReset: true });
  }, [arrivedWithNotice, location.search, navigate]);

  const changeQuery = (change: Partial<ReviewQuery>) => {
    setNotice(null);
    setSearchParams((previous) => writeReviewQuery(previous, change), { preventScrollReset: true });
  };

  // 다른 계정으로 바뀌면 이전 계정에게 보이던 목록(수정·삭제 버튼 포함)은 쓰지 않는다
  const reviews = data?.owner === owner ? data.reviews.filter(({ id }) => !removed.has(id)) : null;

  const remove = async (id: string) => {
    await api.reviews.remove(id);
    const index = reviews?.findIndex((review) => review.id === id) ?? -1;
    const neighbor = reviews?.[index + 1] ?? reviews?.[index - 1];
    setRemoved((previous) => new Set(previous).add(id));
    setNotice('리뷰를 삭제했어요.');
    setFocus({ id: neighbor ? `review-${neighbor.id}-title` : 'review-notice' });
  };

  let content: ReactNode;
  if (needsLogin) {
    content = (
      <ReviewNotice
        title="로그인하면 내 리뷰를 볼 수 있어요."
        action={<ButtonLink to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}>로그인하기</ButtonLink>}
      />
    );
  } else if (error) {
    content = (
      <ReviewNotice role="alert" title="리뷰를 불러오지 못했어요." action={<Button variant="secondary" onClick={reload}>다시 불러오기</Button>}>
        {error.message}
      </ReviewNotice>
    );
  } else if (!reviews) {
    content = <p role="status" className="py-4 text-ink-soft">리뷰를 불러오고 있어요.</p>;
  } else if (!reviews.length) {
    content = loading
      ? <p role="status" className="py-4 text-ink-soft">리뷰를 불러오고 있어요.</p>
      : <EmptyList query={query} onChange={changeQuery} />;
  } else {
    content = reviews.map((review) => <ReviewEntry key={review.id} review={review} onDelete={remove} />);
  }

  return (
    <>
      <div id="review-notice" role="status" tabIndex={-1} className="outline-none">
        {notice && <p className="mt-6 inline-block rounded-leaf-sm bg-sage-soft px-5 py-2.5 font-semibold text-forest">{notice}</p>}
      </div>
      <div className="mt-9 grid gap-10 md:mt-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <div className="min-w-0 space-y-5 border-b border-line pb-5 lg:sticky lg:top-[calc(var(--header-height)+2.5rem)] lg:self-start lg:space-y-7 lg:border-b-0 lg:pb-0">
          {reviews && !needsLogin && !error && <ReviewSummary query={query} reviews={reviews} />}
          <ReviewFilters query={query} onChange={changeQuery} />
          <ButtonLink to="/orders" variant="ghost" withArrow className="min-h-11">주문한 메뉴에 리뷰 쓰기</ButtonLink>
        </div>
        <div
          aria-busy={loading && !needsLogin}
          className={cn('min-w-0 transition-opacity duration-200', loading && reviews && !needsLogin && 'opacity-50')}
        >
          {content}
        </div>
      </div>
    </>
  );
}

export default function ReviewsPage() {
  useDocumentTitle(TITLE);
  const { configured } = useCommerce();
  return (
    <Section tone="paper" className="min-h-[70svh]">
      <SectionHeading level={1} title={TITLE} description="주문한 분들이 직접 남긴 하루의 잎 이야기예요." />
      {configured ? <ReviewBrowser /> : <NotConfiguredNotice />}
    </Section>
  );
}
