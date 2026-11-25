import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ButtonLink } from '@/components/common/Button';
import CommerceScreen from '@/components/orders/CommerceScreen';
import OrderData from '@/components/orders/OrderData';
import OrderSummary from '@/components/orders/OrderSummary';
import { useAuth, useCommerce } from '@/contexts';
import type { Order } from '@/types/commerce';
import { paymentLabels, paymentStatusLabels, receiveLabels } from '@/utils/order';

function OrderReviews({ order }: { order: Order }) {
  const { api } = useCommerce();
  const loadReviews = useCallback(() => api.reviews.list({ mineOnly: true }), [api]);
  const menus = new Map(order.lines.map(line => [line.menuId, line.name]));
  return (
    <section aria-labelledby="order-reviews-heading" className="my-8">
      <h2 id="order-reviews-heading" className="mb-3 font-serif text-xl font-bold text-forest">메뉴 리뷰</h2>
      <OrderData load={loadReviews} loadingLabel="내 리뷰를 불러오고 있어요.">
        {reviews => (
          <ul className="divide-y divide-line border-y border-line">
            {Array.from(menus, ([menuId, name]) => {
              const review = reviews.find(review => review.orderId === order.id && review.menuId === menuId);
              const action = review ? '리뷰 수정' : '리뷰 쓰기';
              const to = review ? '/reviews/' + encodeURIComponent(review.id) + '/edit'
                : '/reviews/new?' + new URLSearchParams({ order: order.id, menu: menuId });
              return (
                <li key={menuId} className="flex flex-wrap items-center justify-between gap-2 py-1">
                  <span>{name}</span><ButtonLink to={to} variant="ghost" className="min-h-11" aria-label={name + ' ' + action}>{action}</ButtonLink>
                </li>
              );
            })}
          </ul>
        )}
      </OrderData>
    </section>
  );
}

export default function OrderDetailPage() {
  const { api } = useCommerce();
  const { user } = useAuth();
  const { orderId = '' } = useParams();
  const loadOrder = useCallback(() => api.orders.get(orderId), [api, orderId]);
  return (
    <CommerceScreen title="주문 상세">
      <OrderData key={user?.id + '/' + orderId} load={loadOrder} loadingLabel="주문을 불러오고 있어요.">
        {order => (
          <>
            {order ? (
              <>
                <p className="mb-4 break-all font-semibold text-forest">주문번호 {order.orderNo}</p>
                <OrderSummary lines={order.lines} total={order.total} />
                <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                  <dt className="text-ink-soft">받는 방법</dt><dd>{receiveLabels[order.receiveMethod]}</dd>
                  <dt className="text-ink-soft">결제 방법</dt><dd>{paymentLabels[order.paymentMethod]}</dd>
                  <dt className="text-ink-soft">결제 상태</dt><dd>{paymentStatusLabels[order.paymentStatus]}</dd>
                </dl>
                <OrderReviews order={order} />
              </>
            ) : <p className="mb-4">주문을 찾을 수 없어요.</p>}
            <ButtonLink to="/orders" variant="secondary">주문 내역 보기</ButtonLink>
          </>
        )}
      </OrderData>
    </CommerceScreen>
  );
}
