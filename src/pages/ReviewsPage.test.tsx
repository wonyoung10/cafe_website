import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppRoutes from '@/app/router';
import { CommerceError } from '@/services/errors';
import { createMemoryApi } from '@/services/memoryApi';
import type { ReviewView } from '@/types/commerce';

function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="url">{location.pathname + location.search}</output>
      <button onClick={() => void navigate(-1)}>뒤로</button>
    </>
  );
}

function open(path: string, api = createMemoryApi()) {
  render(<MemoryRouter initialEntries={[path]}><AppRoutes api={api} /><Location /></MemoryRouter>);
  return api;
}

const url = () => screen.getByTestId('url').textContent;
const titles = () => screen.getAllByRole('article').map((article) => within(article).getByRole('heading').textContent);
const ready = () => screen.findAllByRole('article');

/** first01: 아메리카노 2점, 쿠키 5점 / second02(로그인 상태): 아메리카노 4점 */
async function seed() {
  const api = createMemoryApi();
  const write = async (loginId: string, reviews: Array<[string, number, string, Blob | null]>) => {
    await api.auth.signUp(loginId, 'abc123');
    for (const [menuId] of reviews) await api.cart.add({ menuId, temperature: menuId === 'cookie' ? null : 'hot', quantity: 1 });
    const orderId = await api.orders.place('takeout', 'onsite');
    for (const [menuId, rating, text, photo] of reviews) await api.reviews.create({ orderId, menuId, rating, text }, photo);
  };
  await write('first01', [['americano', 2, '첫 번째 글', null], ['cookie', 5, '두 번째 글', new Blob(['x'], { type: 'image/webp' })]]);
  await api.auth.logOut();
  await write('second02', [['americano', 4, '<b>세 번째</b> 글', null]]);
  return api;
}

beforeEach(() => localStorage.clear());

describe('ReviewsPage', () => {
  it('RV-02, RV-05, RV-08: 비회원에게 모든 리뷰, 평균, 가린 아이디를 보여 주고 원본 아이디는 렌더링하지 않는다', async () => {
    const api = await seed();
    await api.auth.logOut();
    open('/reviews', api);
    expect(await ready()).toHaveLength(3);
    expect(screen.getByText('3.7')).toBeInTheDocument();
    expect(screen.getByText('리뷰 3개의 평균')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '별점 5점 만점에 3.7점' })).toBeInTheDocument();
    expect(screen.getAllByText('first**')).toHaveLength(2);
    expect(screen.getByText('second**')).toBeInTheDocument();
    expect(document.body.innerHTML).not.toMatch(/first01|second02/);
    expect(screen.getByRole('img', { name: '별점 5점 만점에 2점' })).toBeInTheDocument();
    expect(screen.getByAltText('first** 님이 올린 쿠키 사진')).toHaveAttribute('loading', 'lazy');
    // 글은 글로만 보여 준다
    expect(screen.getByText('<b>세 번째</b> 글')).toBeInTheDocument();
    expect(screen.queryByText('내 리뷰')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /리뷰 수정/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /리뷰 삭제/ })).not.toBeInTheDocument();
  });

  it('RV-05: API가 준 이름을 바꾸지 않고 그대로 보여 준다', async () => {
    const api = createMemoryApi();
    const review: ReviewView = {
      id: 'a', orderId: null, menuId: 'cookie', rating: 5, text: '글', photoUrl: null, authorMasked: 'ab**', isMine: false,
      createdAt: '2026-11-25T01:00:00.000Z', updatedAt: '2026-11-25T02:00:00.000Z',
    };
    vi.spyOn(api.reviews, 'list').mockResolvedValue([review]);
    open('/reviews', api);
    expect(await screen.findByText('ab**')).toBeInTheDocument();
    expect(screen.getByText('수정됨')).toBeInTheDocument();
  });

  it('RV-04: 내가 쓴 리뷰에만 수정과 삭제가 있다', async () => {
    open('/reviews', await seed());
    await ready();
    expect(screen.getAllByRole('link', { name: /리뷰 수정$/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /리뷰 삭제$/ })).toHaveLength(1);
    const mine = screen.getByText('<b>세 번째</b> 글').closest('article')!;
    expect(within(mine).getByRole('link', { name: '아메리카노 리뷰 수정' })).toHaveAttribute('href', expect.stringMatching(/^\/reviews\/[\w-]+\/edit$/));
  });

  it('RV-08: 메뉴, 내 리뷰, 정렬 조건을 URL에 두고 뒤로 가기로 되돌린다', async () => {
    const user = userEvent.setup();
    open('/reviews?from=home', await seed());
    await ready();
    await user.selectOptions(screen.getByRole('combobox', { name: '정렬' }), '별점 높은순');
    expect(url()).toBe('/reviews?from=home&sort=rating-high');
    await waitFor(() => expect(titles()).toEqual(['쿠키', '아메리카노', '아메리카노']));
    await user.selectOptions(screen.getByRole('combobox', { name: '메뉴' }), '아메리카노');
    expect(url()).toBe('/reviews?from=home&sort=rating-high&menu=americano');
    await waitFor(() => expect(titles()).toEqual(['아메리카노', '아메리카노']));
    expect(screen.getByText('3.0')).toBeInTheDocument();
    expect(screen.getByText('아메리카노 리뷰')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '내 리뷰만' }));
    expect(screen.getByRole('button', { name: '내 리뷰만' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(titles()).toEqual(['아메리카노']));
    expect(screen.getByText('내가 쓴 아메리카노 리뷰')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '뒤로' }));
    expect(screen.getByRole('button', { name: '내 리뷰만' })).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(titles()).toHaveLength(2));
  });

  it('RV-08: 주소로 바로 들어와도 조건이 적용된다', async () => {
    open('/reviews?sort=rating-low&menu=americano', await seed());
    await ready();
    expect(screen.getByRole('combobox', { name: '메뉴' })).toHaveValue('americano');
    expect(screen.getByRole('combobox', { name: '정렬' })).toHaveValue('rating-low');
    expect(screen.getAllByRole('article').map((article) => article.textContent)).toEqual([
      expect.stringContaining('첫 번째 글'), expect.stringContaining('세 번째'),
    ]);
  });

  it('RV-08: 비회원이 내 리뷰만을 켜면 읽지 않고 돌아올 주소와 함께 로그인을 안내한다', async () => {
    const api = createMemoryApi();
    const list = vi.spyOn(api.reviews, 'list');
    open('/reviews?mine=1&menu=cookie', api);
    expect(await screen.findByRole('link', { name: '로그인하기' }))
      .toHaveAttribute('href', '/login?next=' + encodeURIComponent('/reviews?mine=1&menu=cookie'));
    expect(list).not.toHaveBeenCalled();
  });

  it('RV-09: 삭제 확인을 열면 남겨 두기에 초점, 그만두면 삭제 버튼으로 초점이 돌아온다', async () => {
    const user = userEvent.setup();
    const api = await seed();
    const remove = vi.spyOn(api.reviews, 'remove');
    open('/reviews', api);
    await ready();
    const opener = () => screen.getByRole('button', { name: '아메리카노 리뷰 삭제' });
    await user.click(opener());
    expect(screen.getByRole('group', { name: '아메리카노 리뷰 삭제 확인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '남겨 두기' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(opener()).toHaveFocus();
    await user.keyboard('{Enter}{Escape}');
    expect(opener()).toHaveFocus();
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('RV-04, RV-09: 확인하면 삭제하고 알린 뒤 이웃 리뷰로 초점을 옮긴다', async () => {
    const user = userEvent.setup();
    const api = await seed();
    open('/reviews?sort=rating-high', api);
    await ready();
    await user.click(screen.getByRole('button', { name: '아메리카노 리뷰 삭제' }));
    await user.click(screen.getByRole('button', { name: '삭제하기' }));
    expect(await screen.findByText('리뷰를 삭제했어요.')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('첫 번째 글').closest('article')!.querySelector('h2')).toHaveFocus();
    expect(screen.getByText('3.5')).toBeInTheDocument();
    expect(await api.reviews.list({ mineOnly: true })).toEqual([]);
  });

  it('RV-09: 마지막 내 리뷰를 지우면 안내로 초점이 가고 빈 상태를 보여 준다', async () => {
    const user = userEvent.setup();
    open('/reviews?mine=1', await seed());
    await ready();
    await user.click(screen.getByRole('button', { name: '아메리카노 리뷰 삭제' }));
    await user.click(screen.getByRole('button', { name: '삭제하기' }));
    expect(await screen.findByText('아직 쓴 리뷰가 없어요.')).toBeInTheDocument();
    expect(screen.getByText('리뷰를 삭제했어요.').parentElement).toHaveFocus();
    expect(screen.getByText('리뷰를 삭제했어요.').parentElement).toHaveAttribute('role', 'status');
  });

  it('RV-09: 삭제가 실패하면 리뷰를 남겨 두고 다시 시도할 수 있다', async () => {
    const user = userEvent.setup();
    const api = await seed();
    const remove = vi.spyOn(api.reviews, 'remove').mockRejectedValueOnce(new CommerceError('network'));
    open('/reviews', api);
    await ready();
    await user.click(screen.getByRole('button', { name: '아메리카노 리뷰 삭제' }));
    await user.click(screen.getByRole('button', { name: '삭제하기' }));
    expect(await screen.findByText('연결 상태를 확인하고 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '삭제하기' }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2));
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('RV-09: 리뷰가 하나도 없으면 지어내지 않고 빈 상태를 안내한다', async () => {
    open('/reviews');
    expect(await screen.findByText('아직 남겨진 리뷰가 없어요.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '메뉴 보러 가기' })).toHaveAttribute('href', '/menu');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /별점/ })).not.toBeInTheDocument();
  });

  it('RV-09: 조건에 맞는 리뷰가 없을 때는 조건을 푸는 버튼을 준다', async () => {
    const user = userEvent.setup();
    open('/reviews?menu=scone', await seed());
    expect(await screen.findByText('스콘 리뷰는 아직 없어요.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '모든 메뉴 리뷰 보기' }));
    expect(url()).toBe('/reviews');
    expect(await ready()).toHaveLength(3);
  });

  it('RV-09: 내 리뷰가 없을 때와 내 리뷰 중 그 메뉴가 없을 때를 나눠 안내한다', async () => {
    const api = await seed();
    const user = userEvent.setup();
    open('/reviews?mine=1&menu=scone', api);
    expect(await screen.findByText('스콘에 쓴 내 리뷰가 없어요.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '내 리뷰 모두 보기' }));
    expect(url()).toBe('/reviews?mine=1');
    await ready();
    await act(() => api.auth.signUp('third03', 'abc123').then(() => {}));
    expect(await screen.findByText('아직 쓴 리뷰가 없어요.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '주문 내역 보기' })).toHaveAttribute('href', '/orders');
  });

  it('불러오는 중과 오류를 알리고 다시 불러온다', async () => {
    const user = userEvent.setup();
    const api = await seed();
    let fail!: (reason: unknown) => void;
    vi.spyOn(api.reviews, 'list').mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject; }));
    open('/reviews', api);
    expect(await screen.findByText('리뷰를 불러오고 있어요.')).toHaveAttribute('role', 'status');
    await act(async () => fail(new TypeError('Failed to fetch')));
    expect(screen.getByRole('alert')).toHaveTextContent('연결 상태를 확인하고 다시 시도해 주세요.');
    await user.click(screen.getByRole('button', { name: '다시 불러오기' }));
    expect(await ready()).toHaveLength(3);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('늦게 도착한 이전 조건의 결과는 버린다', async () => {
    const user = userEvent.setup();
    const api = await seed();
    await api.auth.logOut();
    const real = api.reviews.list;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(api.reviews, 'list').mockImplementationOnce(async (query) => { await gate; return real(query); });
    open('/reviews', api);
    await user.selectOptions(await screen.findByRole('combobox', { name: '메뉴' }), '쿠키');
    await waitFor(() => expect(titles()).toEqual(['쿠키']));
    await act(async () => release());
    expect(titles()).toEqual(['쿠키']);
  });

  it('로그아웃하면 이전 회원의 수정·삭제 버튼이 남지 않는다', async () => {
    const api = await seed();
    open('/reviews', api);
    await screen.findByRole('button', { name: '아메리카노 리뷰 삭제' });
    vi.spyOn(api.reviews, 'list').mockReturnValue(new Promise(() => {}));
    await act(() => api.auth.logOut());
    expect(screen.queryByRole('button', { name: '아메리카노 리뷰 삭제' })).not.toBeInTheDocument();
  });
});
