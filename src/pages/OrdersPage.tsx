import { Link } from 'react-router-dom';
import { ButtonLink } from '@/components/common/Button';
import CommerceScreen from '@/components/orders/CommerceScreen';
import OrderData from '@/components/orders/OrderData';
import { useAuth, useCommerce } from '@/contexts';
import { formatPrice } from '@/utils/menu';
import { formatDateTime, paymentStatusLabels } from '@/utils/order';

export default function OrdersPage() {
  const { api } = useCommerce();
  const { user } = useAuth();
  return (
    <CommerceScreen title="주문 내역">
      <OrderData key={user?.id} load={api.orders.list} loadingLabel="주문 내역을 불러오고 있어요.">
        {orders => orders.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {orders.toSorted((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map(order => (
              <li key={order.id}>
                <Link to={'/orders/' + encodeURIComponent(order.id)} className="block rounded-leaf-sm px-3 py-5 hover:bg-cream">
                  <time dateTime={order.createdAt} className="text-sm text-ink-soft">{formatDateTime(order.createdAt)}</time>
                  <p className="break-all font-serif text-xl font-bold text-forest">주문번호 {order.orderNo}</p>
                  <p>{paymentStatusLabels[order.paymentStatus]} · {formatPrice(order.total)}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div><p className="mb-4 text-ink-soft">아직 주문 내역이 없어요.</p><ButtonLink to="/menu">메뉴 보러 가기</ButtonLink></div>
        )}
      </OrderData>
    </CommerceScreen>
  );
}
