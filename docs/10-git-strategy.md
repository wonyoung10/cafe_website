# 10. Git 전략

## 1. 로컬 전용 원칙

- 모든 작업은 `/Users/won-young/Documents/카페_웹사이트` 로컬 저장소에서 수행
- 원격 저장소 없음. **사용자 명시 요청 없이 `git push` 금지**
- 파괴적 명령 금지: `git reset --hard`(공유 브랜치), `git push --force`, `git clean -fdx`, 히스토리 재작성
- 기존 이력·브랜치 보존. 병합된 브랜치도 삭제하지 않고 남겨 과제 증빙으로 사용

## 2. 브랜치 구조

```text
main ─────────────────────────────────────────────────────────────▶
 ├─ docs/initial-planning        A01 기획 문서
 ├─ setup/project-foundation     A01 Vite/React/TS/Router/Tailwind/테스트 기반 + 계약 스텁
 ├─ feature/brand-design         A02 디자인 시스템·레이아웃
 ├─ feature/react-frontend       A03 홈·메뉴·위치·404
 ├─ feature/threejs-cafe         A04 3D 매장
 ├─ feature/visual-assets        A05 이미지
 └─ test/qa-optimization         A06 테스트·최적화
```

각 feature 브랜치는 직전 단계가 병합된 `main`에서 분기한다.

## 3. 커밋 규칙 (Conventional Commits)

```text
<type>(<scope>): <subject>

type: feat | fix | docs | style | refactor | test | chore | perf | build
scope 예: router, menu, store, location, design, assets, qa
```
- 제목 72자 이내, 명령형 영어 (본문은 한국어 가능)
- 에이전트가 만든 변경은 본문에 `Agent: A03 (Codex gpt-6.1-sol)` 형태로 기록
- 하나의 커밋은 하나의 논리적 변경

## 4. Worktree 사용 방식

```bash
git worktree add .worktrees/react-frontend -b feature/react-frontend main
git worktree add .worktrees/threejs-cafe   -b feature/threejs-cafe   main
git worktree add .worktrees/visual-assets  -b feature/visual-assets  main
(cd .worktrees/<name> && npm ci --prefer-offline)
```
- `.worktrees/`는 `.gitignore`에 포함
- 에이전트별 독립 작업 디렉터리 → 동시 실행 시 파일 충돌·dev 서버 충돌 없음
- 병합 완료 후 `git worktree remove .worktrees/<name>` (브랜치는 유지)

## 5. 병합 기준 (총괄 A01)

1. 기획 문서(02 요구사항 ID)에 부합
2. diff 코드 리뷰 완료 (파일 범위 준수, `any`·`window.location.href` 없음)
3. `npm run typecheck` 통과
4. `npm run lint`, `npm run test` 통과
5. 주요 기능 수동 확인(내장 브라우저)
6. 회귀 없음 (`main`의 기존 테스트 통과)
7. 충돌 해결 완료

병합 명령: `git merge --no-ff <branch> -m "merge: <branch> into main"` → 병합 후 `typecheck/lint/test/build` 재실행.

## 6. 충돌 해결 및 롤백

- 충돌 예방: 06 §4 계약과 09의 파일 범위로 영역 분리
- 충돌 발생 시: 계약 문서 기준으로 수동 해결 → 전체 검증 → 병합 커밋 본문에 해결 내용 기록
- 롤백: 병합 커밋을 `git revert -m 1 <merge-commit>`으로 되돌림 (히스토리 보존)
- 병합 전 문제 발견: 해당 브랜치에서 `fix:` 커밋 추가 후 재검증
