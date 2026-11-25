export function validateLoginId(value: string): string | null {
  return /^[A-Za-z0-9]{4,20}$/.test(value) ? null : '아이디는 영문과 숫자로 4~20자를 입력해 주세요.';
}

export function validatePassword(value: string): string | null {
  return /^[A-Za-z0-9]{6,}$/.test(value) ? null : '비밀번호는 영문과 숫자로 6자 이상 입력해 주세요.';
}
