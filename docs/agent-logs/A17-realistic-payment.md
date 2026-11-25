# A17 실제 결제처럼 진행되는 모의 결제

작업 브랜치는 `feature/realistic-payment`(2026-11-25, Claude Code · Claude Opus 5.5). DB 스키마·RPC와 `CommerceApi` 계약은 바꾸지 않았다. 결정은 ADR-011, 흐름은 13 문서 §2.1.

| 파일 | 내용 |
|---|---|
| `src/data/payments.ts` | 가상 카드 3종·간편결제 2종, 할부 조건 |
| `src/utils/payment.ts` | 할부 선택지, 모의 승인 번호, 화면 대기 시간 |
| `src/services/mockPayment.ts` | 승인 순서, 실패 사유, 응답을 잃은 결제의 결과 확인 |
| `src/services/paymentRecords.ts` | 브라우저 기록: 고른 값, 진행 중인 요청, 영수증의 결제수단 |
| `src/components/checkout/InstrumentGroup.tsx` `PaymentDialog.tsx` | 결제수단 선택, 단계별 결제창 (`MockPaymentDialog.tsx`는 삭제) |
| `src/components/orders/Receipt.tsx` | 영수증 |
| `src/pages/CheckoutPage.tsx` `OrderDetailPage.tsx` | 방문 기록·새로고침 처리, 완료 안내 |

## 확인하지 못한 항목

- 실제 Supabase로 결제 화면을 통과시키지 않았다(운영 DB에 시험 주문을 남기지 않기 위해). 호출하는 API는 이전과 같은 `cart.list`·`orders.list`·`place_order`다.
- Safari·Firefox, 실제 휴대폰, 스크린리더 음성.
- 승인 중 새로고침은 저장된 요청 기록을 넣은 단위 테스트로 확인했다.
