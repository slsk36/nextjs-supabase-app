---
name: verify
description: 변경 사항을 lint → 타입체크 → 빌드 순으로 검증합니다. 이 프로젝트에는 테스트 프레임워크가 없으므로 이것이 유일한 검증 게이트입니다. 코드 변경을 마쳤을 때, 커밋 전에, 또는 사용자가 "확인해줘"/"검증"을 요청할 때 사용하세요.
---

이 프로젝트에는 테스트가 없습니다. 아래 3단계가 전부이며, **반드시 순서대로** 실행합니다.

## 1. Lint

```bash
npm run lint
```

## 2. 타입체크

```bash
npx tsc --noEmit
```

`package.json`에 스크립트가 없으므로 위 명령을 직접 실행합니다.

## 3. 빌드

```bash
npm run build
```

**이 단계를 건너뛰지 마세요.** `next.config.ts`에 `cacheComponents: true`가 켜져 있어서, 동적 데이터 접근(`cookies()`, `await createClient()` 등)이 `<Suspense>` 경계 밖에 있는 오류는 **빌드에서만** 잡힙니다. lint와 tsc는 이를 통과시킵니다.

## 규칙

- 앞 단계가 실패하면 **거기서 멈추고 고친 뒤 처음부터 다시** 실행합니다.
- 실패 시 출력을 그대로 보여주고, 원인과 수정안을 설명합니다.
- 3단계가 모두 통과했을 때만 "검증 통과"라고 보고합니다. 일부만 돌렸다면 어느 단계를 건너뛰었는지 명시하세요.

## 자주 나오는 실패 패턴

- **빌드에서 `cacheComponents` 관련 에러** → 해당 async 로직을 별도 컴포넌트로 분리하고 `<Suspense fallback={...}>`로 감싸세요. `app/protected/page.tsx`가 참고 예시입니다.
- **`createClient` 타입 에러** → 서버용(`@/lib/supabase/server`)은 `await`가 필요하고 클라이언트용(`@/lib/supabase/client`)은 아닙니다. import 경로를 확인하세요.
- **`npm audit fix --force`로 문제를 해결하려 하지 마세요.** `next@9.3.3`으로 다운그레이드시켜 프로젝트 전체를 망가뜨립니다. 남은 취약점은 `next`의 전이 의존성이며 상위에서 고칠 수 없습니다.
