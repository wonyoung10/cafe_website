import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppRoutes from '@/app/router';
import type { CommerceApi } from '@/services/commerceApi';
import { CommerceError } from '@/services/errors';
import { createMemoryApi } from '@/services/memoryApi';
import { PHOTO_MAX_BYTES, PHOTO_UNREADABLE, resizePhoto } from '@/utils/photo';

// 캔버스 인코딩은 src/utils/photo.test.ts에서 따로 확인한다
vi.mock('@/utils/photo', async (importOriginal) => ({ ...await importOriginal<typeof import('@/utils/photo')>(), resizePhoto: vi.fn() }));

function Location() {
  const location = useLocation();
  return <output data-testid="url">{location.pathname + location.search}</output>;
}
function open(path: string, api: CommerceApi) {
  return render(<MemoryRouter initialEntries={[path]}><AppRoutes api={api} /><Location /></MemoryRouter>);
}
const url = () => screen.getByTestId('url').textContent;

async function ordered() {
  const api = createMemoryApi();
  await api.auth.signUp('coffee12', 'abc123');
  await api.cart.add({ menuId: 'cookie', temperature: null, quantity: 1 });
  return { api, orderId: await api.orders.place('takeout', 'onsite') };
}
async function reviewed(photo: Blob | null = null) {
  const { api, orderId } = await ordered();
  const id = await api.reviews.create({ orderId, menuId: 'cookie', rating: 3, text: '처음 글' }, photo);
  return { api, orderId, id };
}
const newPath = (orderId: string, menuId = 'cookie') => `/reviews/new?order=${orderId}&menu=${menuId}`;
const textbox = () => screen.findByRole('textbox', { name: '리뷰' });
const fileInput = () => screen.getByLabelText(/^사진 \(선택\)/) as HTMLInputElement;
const webp = () => new Blob(['small'], { type: 'image/webp' });
const jpeg = (name = 'photo.jpg') => new File(['raw'], name, { type: 'image/jpeg' });

const createUrl = vi.fn();
const revokeUrl = vi.fn();
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  let count = 0;
  createUrl.mockImplementation(() => `blob:preview-${++count}`);
  vi.mocked(resizePhoto).mockReset().mockImplementation(async () => webp());
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: createUrl, revokeObjectURL: revokeUrl }));
});
afterEach(() => vi.unstubAllGlobals());

describe('리뷰 쓰기', () => {
  it('RV-01, RV-03: 주문한 메뉴에 별점과 글로 리뷰를 남기고 내 리뷰로 돌아간다', async () => {
    const user = userEvent.setup();
    const { api, orderId } = await ordered();
    const create = vi.spyOn(api.reviews, 'create');
    open(newPath(orderId), api);
    const text = await textbox();
    expect(screen.getByRole('heading', { level: 2, name: '쿠키' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /^4점/ }));
    await user.type(text, '  바삭해요 ');
    expect(screen.getByText('4 / 500')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    await waitFor(() => expect(url()).toBe('/reviews?mine=1'));
    expect(create).toHaveBeenCalledExactlyOnceWith({ orderId, menuId: 'cookie', rating: 4, text: '바삭해요' }, null);
    const notice = await screen.findByText('리뷰를 남겼어요. 고맙습니다.');
    expect(notice.parentElement).toHaveAttribute('role', 'status');
    expect(notice.parentElement).toHaveFocus();
    expect(await screen.findByText('바삭해요')).toBeInTheDocument();
    // 조건을 바꾸면 안내가 사라진다
    await user.click(screen.getByRole('button', { name: '내 리뷰만' }));
    expect(screen.queryByText('리뷰를 남겼어요. 고맙습니다.')).not.toBeInTheDocument();
  });

  it('RV-03: 방향키로 별점을 바꿀 수 있다', async () => {
    const user = userEvent.setup();
    const { api, orderId } = await ordered();
    open(newPath(orderId), api);
    await textbox();
    const group = screen.getByRole('radiogroup', { name: '별점' });
    await user.click(within(group).getByRole('radio', { name: /^2점/ }));
    await user.keyboard('{ArrowRight}');
    expect(within(group).getByRole('radio', { name: /^3점/ })).toBeChecked();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(within(group).getByRole('radio', { name: /^1점/ })).toBeChecked();
  });

  it('RV-03: 비어 있으면 첫 오류 칸으로 초점을 옮기고 오류를 칸과 잇는다', async () => {
    const user = userEvent.setup();
    const { api, orderId } = await ordered();
    const create = vi.spyOn(api.reviews, 'create');
    open(newPath(orderId), api);
    const text = await textbox();
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    const group = screen.getByRole('radiogroup', { name: '별점' });
    expect(group).toBeInvalid();
    expect(group).toHaveAccessibleDescription('별점을 골라 주세요.');
    expect(within(group).getByRole('radio', { name: /^1점/ })).toHaveFocus();
    expect(within(group).queryByRole('radio', { checked: true })).not.toBeInTheDocument();
    expect(text).toBeInvalid();
    expect(text).toHaveAccessibleDescription(/리뷰를 한 글자 이상 적어 주세요/);
    await user.click(within(group).getByRole('radio', { name: /^5점/ }));
    expect(group).not.toHaveAttribute('aria-invalid');
    await user.type(text, '   ');
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    expect(text).toHaveFocus();
    expect(create).not.toHaveBeenCalled();
  });

  it('RV-07: 500자를 넘기면 쓰는 중에 알리고 저장하지 않는다', async () => {
    const user = userEvent.setup();
    const { api, orderId } = await ordered();
    const create = vi.spyOn(api.reviews, 'create');
    open(newPath(orderId), api);
    const text = await textbox();
    await user.click(text);
    await user.paste('가'.repeat(503));
    expect(screen.getByText('503 / 500')).toBeInTheDocument();
    expect(text).toHaveAccessibleDescription(/3자를 줄여 주세요/);
    await user.click(screen.getByRole('radio', { name: /^5점/ }));
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    expect(create).not.toHaveBeenCalled();
    await user.clear(text);
    await user.paste('가'.repeat(500));
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
  });

  it.each([
    ['없는 주문', 'missing', 'cookie', '리뷰를 쓸 주문을 찾을 수 없어요.'],
    ['주문 번호 없음', '', 'cookie', '리뷰를 쓸 주문을 찾을 수 없어요.'],
    ['주문에 없는 메뉴', null, 'scone', '이 주문에 없는 메뉴예요.'],
  ])('RV-01: %s이면 쓰지 못한다', async (_name, order, menuId, title) => {
    const { api, orderId } = await ordered();
    open(newPath(order ?? orderId, menuId), api);
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '주문 내역 보기' })).toHaveAttribute('href', '/orders');
    expect(screen.queryByRole('button', { name: '리뷰 남기기' })).not.toBeInTheDocument();
  });

  it('RV-01: 남의 주문으로는 쓰지 못한다', async () => {
    const { api, orderId } = await ordered();
    await api.auth.signUp('another1', 'abc123');
    open(newPath(orderId), api);
    expect(await screen.findByText('리뷰를 쓸 주문을 찾을 수 없어요.')).toBeInTheDocument();
  });

  it('RV-06: 이미 쓴 메뉴면 수정으로 안내한다', async () => {
    const { api, orderId, id } = await reviewed();
    open(newPath(orderId), api);
    expect(await screen.findByRole('link', { name: '쓴 리뷰 수정하기' })).toHaveAttribute('href', `/reviews/${id}/edit`);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('RV-06: 쓰는 사이 다른 곳에서 먼저 썼다면 글을 지우지 않고 알린다', async () => {
    const user = userEvent.setup();
    const { api, orderId } = await ordered();
    open(newPath(orderId), api);
    const text = await textbox();
    await api.reviews.create({ orderId, menuId: 'cookie', rating: 1, text: '다른 탭' }, null);
    await user.click(screen.getByRole('radio', { name: /^5점/ }));
    await user.type(text, '내 글');
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 리뷰를 작성한 메뉴예요.');
    expect(screen.getByRole('link', { name: '내 리뷰 보기' })).toHaveAttribute('href', '/reviews?mine=1');
    expect(text).toHaveValue('내 글');
  });

  it('저장에 실패하면 입력을 지키고 다시 시도할 수 있으며, 저장 중에는 두 번 보내지 않는다', async () => {
    const user = userEvent.setup();
    const { api, orderId } = await ordered();
    let fail!: (reason: unknown) => void;
    const create = vi.spyOn(api.reviews, 'create').mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject; }));
    open(newPath(orderId), api);
    await user.type(await textbox(), '글');
    await user.click(screen.getByRole('radio', { name: /^5점/ }));
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    await user.click(screen.getByRole('button', { name: '저장하는 중' }));
    expect(create).toHaveBeenCalledOnce();
    fail(new CommerceError('network'));
    expect(await screen.findByText('연결 상태를 확인하고 다시 시도해 주세요.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    await waitFor(() => expect(url()).toBe('/reviews?mine=1'));
  });

  it('주문을 불러오지 못하면 다시 불러올 수 있다', async () => {
    const user = userEvent.setup();
    const { api, orderId } = await ordered();
    vi.spyOn(api.orders, 'get').mockRejectedValueOnce(new CommerceError('network'));
    open(newPath(orderId), api);
    await user.click(await screen.findByRole('button', { name: '다시 불러오기' }));
    expect(await textbox()).toBeInTheDocument();
  });
});

describe('리뷰 사진', () => {
  it('RV-03, RV-07: 줄인 사진을 미리 보고 바꾸거나 빼며, object URL을 해제하고 줄인 사진만 올린다', async () => {
    const user = userEvent.setup();
    const { api, orderId } = await ordered();
    const create = vi.spyOn(api.reviews, 'create');
    const last = webp();
    vi.mocked(resizePhoto).mockResolvedValueOnce(webp()).mockResolvedValueOnce(webp()).mockResolvedValueOnce(last);
    open(newPath(orderId), api);
    await user.type(await textbox(), '글');
    await user.click(screen.getByRole('radio', { name: /^5점/ }));
    expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');

    await user.upload(fileInput(), jpeg());
    expect(await screen.findByAltText('고른 사진 미리보기')).toHaveAttribute('src', 'blob:preview-1');
    await user.upload(fileInput(), jpeg('other.jpg'));
    await waitFor(() => expect(screen.getByAltText('고른 사진 미리보기')).toHaveAttribute('src', 'blob:preview-2'));
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview-1');
    await user.click(screen.getByRole('button', { name: '사진 빼기' }));
    expect(screen.queryByAltText('고른 사진 미리보기')).not.toBeInTheDocument();
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview-2');
    expect(fileInput()).toHaveFocus();

    await user.upload(fileInput(), jpeg('last.jpg'));
    await screen.findByAltText('고른 사진 미리보기');
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    await waitFor(() => expect(url()).toBe('/reviews?mine=1'));
    expect(create.mock.calls[0]?.[1]).toBe(last);
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview-3');
  });

  it('RV-07: 형식이 다르거나 10MB를 넘는 사진은 줄이기 전에 거절하고 앞서 고른 사진을 지킨다', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { api, orderId } = await ordered();
    open(newPath(orderId), api);
    await textbox();
    await user.upload(fileInput(), jpeg());
    await screen.findByAltText('고른 사진 미리보기');
    await user.upload(fileInput(), new File(['x'], 'a.gif', { type: 'image/gif' }));
    expect(fileInput()).toBeInvalid();
    expect(fileInput()).toHaveAccessibleDescription(/JPG, PNG, WebP 사진을 골라 주세요/);
    const big = jpeg();
    Object.defineProperty(big, 'size', { value: PHOTO_MAX_BYTES + 1 });
    await user.upload(fileInput(), big);
    expect(fileInput()).toHaveAccessibleDescription(/10MB 이하 사진을 골라 주세요/);
    expect(resizePhoto).toHaveBeenCalledOnce();
    expect(screen.getByAltText('고른 사진 미리보기')).toBeInTheDocument();
  });

  it('RV-07: 읽을 수 없는 사진을 알린다', async () => {
    const user = userEvent.setup();
    const { api, orderId } = await ordered();
    vi.mocked(resizePhoto).mockRejectedValueOnce(new Error('bad'));
    open(newPath(orderId), api);
    await textbox();
    await user.upload(fileInput(), jpeg());
    expect(await screen.findByText(PHOTO_UNREADABLE)).toBeInTheDocument();
  });

  it('사진을 줄이는 동안에는 저장하지 않고, 늦게 끝난 이전 사진은 버린다', async () => {
    const user = userEvent.setup();
    const { api, orderId } = await ordered();
    const create = vi.spyOn(api.reviews, 'create');
    let finishSlow!: (blob: Blob) => void;
    const fast = webp();
    vi.mocked(resizePhoto).mockReturnValueOnce(new Promise((resolve) => { finishSlow = resolve; })).mockResolvedValueOnce(fast);
    open(newPath(orderId), api);
    await user.type(await textbox(), '글');
    await user.click(screen.getByRole('radio', { name: /^5점/ }));
    await user.upload(fileInput(), jpeg('slow.jpg'));
    expect(screen.getByText('사진을 알맞은 크기로 줄이고 있어요.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    expect(create).not.toHaveBeenCalled();
    await user.upload(fileInput(), jpeg('fast.jpg'));
    await screen.findByAltText('고른 사진 미리보기');
    finishSlow(webp());
    await user.click(screen.getByRole('button', { name: '리뷰 남기기' }));
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0]?.[1]).toBe(fast);
  });
});

describe('리뷰 수정', () => {
  it('RV-04: 내 리뷰를 불러와 고치고 내 리뷰로 돌아간다', async () => {
    const user = userEvent.setup();
    const { api, id } = await reviewed();
    const update = vi.spyOn(api.reviews, 'update');
    open(`/reviews/${id}/edit`, api);
    const text = await textbox();
    expect(text).toHaveValue('처음 글');
    expect(screen.getByRole('radio', { name: /^3점/ })).toBeChecked();
    await user.clear(text);
    await user.type(text, '고친 글');
    await user.click(screen.getByRole('radio', { name: /^5점/ }));
    await user.click(screen.getByRole('button', { name: '수정한 리뷰 저장' }));
    await waitFor(() => expect(url()).toBe('/reviews?mine=1'));
    expect(update).toHaveBeenCalledExactlyOnceWith(id, { rating: 5, text: '고친 글' }, 'keep');
    expect(await screen.findByText('리뷰를 수정했어요.')).toBeInTheDocument();
    expect(await screen.findByText('고친 글')).toBeInTheDocument();
  });

  it('RV-04: 남의 리뷰는 주소로 들어와도 열리지 않는다', async () => {
    const { api, id } = await reviewed();
    await api.auth.signUp('another1', 'abc123');
    await api.cart.add({ menuId: 'scone', temperature: null, quantity: 1 });
    await api.reviews.create({ orderId: await api.orders.place('takeout', 'onsite'), menuId: 'scone', rating: 5, text: '다른 회원 글' }, null);
    open(`/reviews/${id}/edit`, api);
    expect(await screen.findByText('수정할 수 있는 리뷰가 아니에요.')).toBeInTheDocument();
    expect(screen.queryByText('처음 글')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '내 리뷰 보기' })).toHaveAttribute('href', '/reviews?mine=1');
  });

  it('RV-03: 저장된 사진을 빼고, 되돌리고, 새 사진으로 바꿀 수 있다', async () => {
    const user = userEvent.setup();
    const { api, id } = await reviewed(webp());
    const update = vi.spyOn(api.reviews, 'update');
    open(`/reviews/${id}/edit`, api);
    expect(await screen.findByAltText('지금 리뷰에 있는 사진')).toHaveAttribute('src', expect.stringMatching(/^data:image\/webp/));
    await user.click(screen.getByRole('button', { name: '사진 빼기' }));
    expect(screen.queryByAltText('지금 리뷰에 있는 사진')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '원래 사진으로 되돌리기' }));
    expect(screen.getByAltText('지금 리뷰에 있는 사진')).toBeInTheDocument();
    const next = webp();
    vi.mocked(resizePhoto).mockResolvedValueOnce(next);
    await user.upload(fileInput(), jpeg());
    await screen.findByAltText('고른 사진 미리보기');
    await user.click(screen.getByRole('button', { name: '사진 빼기' }));
    await user.click(screen.getByRole('button', { name: '수정한 리뷰 저장' }));
    await waitFor(() => expect(update).toHaveBeenCalledExactlyOnceWith(id, { rating: 3, text: '처음 글' }, 'remove'));
  });

  it('RV-03: 새 사진으로 바꿔 저장한다', async () => {
    const user = userEvent.setup();
    const { api, id } = await reviewed(webp());
    const update = vi.spyOn(api.reviews, 'update');
    const next = webp();
    vi.mocked(resizePhoto).mockResolvedValueOnce(next);
    open(`/reviews/${id}/edit`, api);
    await textbox();
    await user.upload(fileInput(), jpeg());
    await screen.findByAltText('고른 사진 미리보기');
    await user.click(screen.getByRole('button', { name: '수정한 리뷰 저장' }));
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    expect(update.mock.calls[0]?.[2]).toBe(next);
  });
});
