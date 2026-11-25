const messages = {
  'login-id-invalid': '아이디는 영문과 숫자로 4~20자를 입력해 주세요.',
  'login-id-taken': '이미 사용 중인 아이디예요. 다른 아이디를 입력해 주세요.',
  'password-invalid': '비밀번호는 영문과 숫자로 6자 이상 입력해 주세요.',
  'credentials-mismatch': '아이디와 비밀번호를 다시 확인해 주세요.',
  'not-authenticated': '로그인한 뒤 다시 시도해 주세요.',
  'cart-empty': '메뉴를 먼저 장바구니에 담아 주세요.',
  'quantity-invalid': '수량은 1개부터 20개까지 선택해 주세요.',
  'menu-unknown': '메뉴를 다시 선택해 주세요.',
  'temperature-invalid': '이 메뉴에서 제공하는 온도를 선택해 주세요.',
  'method-invalid': '받는 방법과 결제 방법을 다시 선택해 주세요.',
  'not-found': '항목을 찾을 수 없어요. 목록을 확인해 주세요.',
  forbidden: '내 항목만 변경할 수 있어요. 목록을 다시 확인해 주세요.',
  'not-purchased': '구매한 메뉴를 선택해 주세요.',
  'already-reviewed': '이미 리뷰를 작성한 메뉴예요. 기존 리뷰를 수정해 주세요.',
  'rating-invalid': '별점을 1점부터 5점 사이로 선택해 주세요.',
  'text-invalid': '리뷰 글은 1~500자로 입력해 주세요.',
  'photo-invalid': '사진의 형식과 크기를 다시 확인해 주세요.',
  network: '연결 상태를 확인하고 다시 시도해 주세요.',
  'not-configured': '서비스를 준비하고 있어요. 잠시 후 다시 방문해 주세요.',
  unknown: '처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

export type CommerceErrorCode = keyof typeof messages;

export class CommerceError extends Error {
  constructor(readonly code: CommerceErrorCode, message = messages[code]) {
    super(message);
    this.name = 'CommerceError';
  }
}

export function mapError(error: unknown, fallback: CommerceErrorCode = 'unknown'): CommerceError {
  if (error instanceof CommerceError) return error;
  const fields = error && typeof error === 'object' ? error : {};
  const code = 'code' in fields ? String(fields.code) : '';
  const message = 'message' in fields ? String(fields.message) : '';
  const status = 'status' in fields ? Number(fields.status) : 0;
  if (Object.hasOwn(messages, message)) return new CommerceError(message as CommerceErrorCode);
  if (Object.hasOwn(messages, code)) return new CommerceError(code as CommerceErrorCode);
  const known: Record<string, CommerceErrorCode> = {
    invalid_credentials: 'credentials-mismatch', user_already_exists: 'login-id-taken',
    email_exists: 'login-id-taken', email_address_invalid: 'login-id-invalid',
    weak_password: 'password-invalid', session_not_found: 'not-authenticated',
    PGRST301: 'not-authenticated', PGRST116: 'not-found', PGRST205: 'not-configured',
    PGRST202: 'not-configured', '42P01': 'not-configured', email_not_confirmed: 'not-configured',
  };
  if (Object.hasOwn(known, code)) return new CommerceError(known[code]!);
  const retryable = 'name' in fields && fields.name === 'AuthRetryableFetchError';
  if (retryable || /fetch|network|load failed|connection|timeout/i.test(message)) return new CommerceError('network');
  if (code === '23514') {
    if (/rating/.test(message)) return new CommerceError('rating-invalid');
    if (/body/.test(message)) return new CommerceError('text-invalid');
    if (/photo/.test(message)) return new CommerceError('photo-invalid');
  }
  if (code === '42501' || status === 403) return new CommerceError('forbidden');
  if (status === 401) return new CommerceError('not-authenticated');
  return new CommerceError(fallback);
}
