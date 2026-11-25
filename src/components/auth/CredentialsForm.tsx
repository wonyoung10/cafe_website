import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import NotConfiguredNotice from '@/components/common/NotConfiguredNotice';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/contexts';
import { CommerceError, mapError } from '@/services/errors';
import { validateLoginId, validatePassword } from '@/utils/credentials';
import AuthField from './AuthField';

type Field = 'loginId' | 'password' | 'confirmation';
type Errors = Partial<Record<Field, string>>;
const fields: Field[] = ['loginId', 'password', 'confirmation'];

function readForm(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    loginId: String(data.get('loginId') ?? ''),
    password: String(data.get('password') ?? ''),
    confirmation: String(data.get('confirmation') ?? ''),
  };
}

function validate(values: ReturnType<typeof readForm>, signup: boolean): Errors {
  const { loginId, password, confirmation } = values;
  if (!signup) {
    return {
      loginId: loginId ? undefined : '아이디를 입력해 주세요.',
      password: password ? undefined : '비밀번호를 입력해 주세요.',
    };
  }
  return {
    loginId: validateLoginId(loginId) ?? undefined,
    password: validatePassword(password) ?? undefined,
    confirmation: confirmation && confirmation === password ? undefined : '같은 비밀번호를 한 번 더 입력해 주세요.',
  };
}

function focusField(form: HTMLFormElement, field: Field) {
  const input = form.elements.namedItem(field);
  if (input instanceof HTMLInputElement) input.focus();
}

export default function CredentialsForm({ signup }: { signup: boolean }) {
  const { signUp, logIn } = useAuth();
  const summaryId = useId();
  const touched = useRef(new Set<Field>());
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<CommerceError | null>(null);
  const mismatch = failure?.code === 'credentials-mismatch';

  // 칸을 벗어나며 생긴 오류가 화면을 밀면, 누르던 버튼이 움직여 클릭이 사라진다.
  // 마우스를 누르는 동안에는 검사를 미뤘다가 클릭이 끝난 뒤에 보여 준다.
  const pressing = useRef(false);
  const afterPress = useRef<(() => void) | null>(null);
  useEffect(() => {
    const press = () => { pressing.current = true; };
    const release = () => {
      pressing.current = false;
      const run = afterPress.current;
      afterPress.current = null;
      if (run) setTimeout(run);
    };
    document.addEventListener('pointerdown', press, true);
    document.addEventListener('pointerup', release, true);
    document.addEventListener('pointercancel', release, true);
    return () => {
      document.removeEventListener('pointerdown', press, true);
      document.removeEventListener('pointerup', release, true);
      document.removeEventListener('pointercancel', release, true);
      afterPress.current = null;
    };
  }, []);

  function leaveField(form: HTMLFormElement, target: EventTarget) {
    if (!pressing.current) {
      updateField(form, target, true);
      return;
    }
    afterPress.current = () => { if (form.isConnected) updateField(form, target, true); };
  }

  function updateField(form: HTMLFormElement, target: EventTarget, blur: boolean) {
    if (!(target instanceof HTMLInputElement)) return;
    const field = fields.find(name => name === target.name);
    if (!field) return;
    if (blur) touched.current.add(field);
    else if (failure?.code !== 'login-id-taken' || field === 'loginId') setFailure(null);
    const updated = validate(readForm(form), signup);
    setErrors(Object.fromEntries([...touched.current].map(name => [name, updated[name]])));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const values = readForm(form);
    const updated = validate(values, signup);
    touched.current = new Set(fields);
    setFailure(null);
    setErrors(updated);
    const first = fields.find(name => updated[name]);
    if (first) {
      focusField(form, first);
      return;
    }

    submitting.current = true;
    setPending(true);
    try {
      await (signup ? signUp : logIn)(values.loginId, values.password);
    } catch (cause) {
      const { code } = mapError(cause);
      setFailure(new CommerceError(code));
      if (code === 'login-id-taken' || code === 'credentials-mismatch') focusField(form, 'loginId');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (failure?.code === 'not-configured') return <NotConfiguredNotice />;

  return (
    <form method="post" noValidate aria-label={signup ? '회원가입' : '로그인'}
      onSubmit={submit} onBlur={e => leaveField(e.currentTarget, e.target)}
      onChange={e => updateField(e.currentTarget, e.target, false)} className="mt-8 space-y-6">
      <AuthField name="loginId" label="아이디" autoComplete="username" pending={pending}
        hint={signup ? '영문 또는 숫자 4~20자예요. 대소문자는 구분하지 않아요.' : undefined}
        error={failure?.code === 'login-id-taken' ? failure.message : errors.loginId}
        credentialsError={mismatch ? summaryId : undefined} />
      <AuthField name="password" label="비밀번호" autoComplete={signup ? 'new-password' : 'current-password'} pending={pending}
        hint={signup ? '영문 또는 숫자로 6자 이상 입력해 주세요. 다른 곳에서 쓰는 비밀번호는 피해 주세요.' : undefined}
        error={errors.password} credentialsError={mismatch ? summaryId : undefined} />
      {signup && <AuthField name="confirmation" label="비밀번호 확인" autoComplete="new-password" pending={pending}
        hint="위와 같은 비밀번호를 입력해 주세요." error={errors.confirmation} />}
      {failure && failure.code !== 'login-id-taken' &&
        <p id={summaryId} role="alert" className="text-sm font-semibold text-walnut">{failure.message}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {signup ? '회원가입' : '로그인'}
      </Button>
      {pending && <p role="status" className="text-sm text-ink-soft">{signup ? '가입하고 있어요.' : '로그인하고 있어요.'}</p>}
    </form>
  );
}
