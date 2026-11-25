import { useCallback, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, ButtonLink } from '@/components/common/Button';
import NotConfiguredNotice from '@/components/common/NotConfiguredNotice';
import Section from '@/components/common/Section';
import SectionHeading from '@/components/common/SectionHeading';
import SmartImage from '@/components/common/SmartImage';
import ReviewForm from '@/components/reviews/ReviewForm';
import ReviewNotice from '@/components/reviews/ReviewNotice';
import { formatDay, menuName } from '@/components/reviews/reviewQuery';
import { useLoad } from '@/components/reviews/useLoad';
import { useAuth, useCommerce } from '@/contexts';
import { MENU_ITEMS } from '@/data/menu';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { CommerceError } from '@/services/errors';

const MY_REVIEWS = '/reviews?mine=1';

/** 무엇에 대한 리뷰인지 보여 주는 왼쪽(모바일은 위) 단 */
function Subject({ menuId, name, note, children }: { menuId: string; name: string; note: string; children: ReactNode }) {
  const image = MENU_ITEMS.find(({ id }) => id === menuId)?.image;
  return (
    <div className="mt-9 grid gap-9 md:mt-12 lg:grid-cols-[15rem_minmax(0,40rem)] lg:gap-16">
      <div className="flex items-center gap-4 lg:block">
        {image && <SmartImage src={image} alt="" wrapperClassName="size-20 shrink-0 rounded-leaf-sm lg:aspect-square lg:h-auto lg:w-full lg:rounded-leaf" />}
        <div className="min-w-0 lg:mt-5">
          <h2 className="font-serif text-xl font-bold text-forest">{name}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">{note}</p>
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Loading() {
  return <p role="status" className="mt-10 text-ink-soft">불러오고 있어요.</p>;
}

function LoadError({ error, onRetry }: { error: CommerceError; onRetry: () => void }) {
  return (
    <ReviewNotice className="mt-8" role="alert" title="불러오지 못했어요." action={<Button variant="secondary" onClick={onRetry}>다시 불러오기</Button>}>
      {error.message}
    </ReviewNotice>
  );
}

function useFinish() {
  const navigate = useNavigate();
  return (reviewNotice: string) => navigate(MY_REVIEWS, { replace: true, state: { reviewNotice } });
}

function NewReview({ orderId, menuId, userId }: { orderId: string; menuId: string; userId: string | undefined }) {
  const { api } = useCommerce();
  const finish = useFinish();
  const load = useCallback(async () => {
    const [order, mine] = await Promise.all([
      orderId && menuId ? api.orders.get(orderId) : null,
      orderId && menuId ? api.reviews.list({ menuId, mineOnly: true }) : [],
    ]);
    return {
      userId,
      order,
      line: order?.lines.find((line) => line.menuId === menuId),
      written: mine.find((review) => review.orderId === orderId),
    };
  }, [api, orderId, menuId, userId]);
  const { loading, data, error, reload } = useLoad(load);

  if (loading || !data) return error ? <LoadError error={error} onRetry={reload} /> : <Loading />;
  const { order, line, written } = data;
  if (!order || !line) {
    return (
      <ReviewNotice
        className="mt-8"
        role="alert"
        title={order ? '이 주문에 없는 메뉴예요.' : '리뷰를 쓸 주문을 찾을 수 없어요.'}
        action={<ButtonLink to="/orders" variant="secondary" withArrow>주문 내역 보기</ButtonLink>}
      >
        주문한 메뉴에만 리뷰를 쓸 수 있어요. 주문 내역에서 메뉴를 골라 주세요.
      </ReviewNotice>
    );
  }
  if (written) {
    return (
      <ReviewNotice
        className="mt-8"
        role="alert"
        title={`이 주문의 ${line.name} 리뷰는 이미 썼어요.`}
        action={<ButtonLink to={`/reviews/${written.id}/edit`} variant="secondary" withArrow>쓴 리뷰 수정하기</ButtonLink>}
      >
        주문 한 번에 메뉴마다 리뷰 하나를 남길 수 있어요.
      </ReviewNotice>
    );
  }
  return (
    <Subject menuId={menuId} name={line.name} note={`${formatDay(order.createdAt)} 주문`}>
      <ReviewForm
        key={`${orderId}:${menuId}`}
        submitLabel="리뷰 남기기"
        cancelTo={`/orders/${order.id}`}
        onSubmit={async (input, photo) => {
          await api.reviews.create({ orderId, menuId, ...input }, typeof photo === 'string' ? null : photo);
          await finish('리뷰를 남겼어요. 고맙습니다.');
        }}
      />
    </Subject>
  );
}

function EditReview({ reviewId, userId }: { reviewId: string; userId: string | undefined }) {
  const { api } = useCommerce();
  const finish = useFinish();
  // 내 리뷰 목록에서만 찾으므로 남의 리뷰는 주소를 알아도 열리지 않는다
  const load = useCallback(async () => {
    const mine = await api.reviews.list({ mineOnly: true });
    return { userId, review: mine.find(({ id, isMine }) => id === reviewId && isMine) };
  }, [api, reviewId, userId]);
  const { loading, data, error, reload } = useLoad(load);

  if (loading || !data) return error ? <LoadError error={error} onRetry={reload} /> : <Loading />;
  const { review } = data;
  if (!review) {
    return (
      <ReviewNotice
        className="mt-8"
        role="alert"
        title="수정할 수 있는 리뷰가 아니에요."
        action={<ButtonLink to={MY_REVIEWS} variant="secondary" withArrow>내 리뷰 보기</ButtonLink>}
      >
        내가 쓴 리뷰만 수정할 수 있어요.
      </ReviewNotice>
    );
  }
  return (
    <Subject menuId={review.menuId} name={menuName(review.menuId)} note={`${formatDay(review.createdAt)}에 쓴 리뷰`}>
      <ReviewForm
        key={review.id}
        initial={{ rating: review.rating, text: review.text }}
        savedPhotoUrl={review.photoUrl}
        submitLabel="수정한 리뷰 저장"
        cancelTo={MY_REVIEWS}
        onSubmit={async (input, photo) => {
          await api.reviews.update(review.id, input, photo);
          await finish('리뷰를 수정했어요.');
        }}
      />
    </Subject>
  );
}

export default function ReviewFormPage() {
  const { reviewId } = useParams();
  const [searchParams] = useSearchParams();
  const { configured } = useCommerce();
  const { user } = useAuth();
  const title = reviewId ? '리뷰 수정' : '리뷰 쓰기';
  useDocumentTitle(title);

  let content = <NotConfiguredNotice />;
  if (configured) {
    content = reviewId
      ? <EditReview reviewId={reviewId} userId={user?.id} />
      : <NewReview orderId={searchParams.get('order') ?? ''} menuId={searchParams.get('menu') ?? ''} userId={user?.id} />;
  }
  return (
    <Section tone="paper" className="min-h-[70svh]">
      <SectionHeading level={1} title={title} description={reviewId ? '마음이 달라졌다면 고쳐 쓰세요.' : '어떠셨는지 편하게 들려주세요.'} />
      {content}
    </Section>
  );
}
