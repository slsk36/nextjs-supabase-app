# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js + Supabase 학습용 프로젝트. Vercel의 "Next.js and Supabase Starter Kit"에서 시작했습니다.
학습 목적이므로 구현 시 왜 그렇게 하는지 단계별로 설명을 곁들여 주세요.

## 검증 명령

테스트 프레임워크와 CI가 없습니다. 변경 후 검증은 아래 3개가 전부입니다 (`/verify` 스킬로 한 번에 실행 가능).

```bash
npm run lint          # eslint .
npx tsc --noEmit      # 타입체크 (package.json에 스크립트 없음 — 직접 실행)
npm run build         # cacheComponents 위반은 빌드에서만 잡힘
```

## 의존성 관리 — `npm audit fix --force` 금지

**절대 실행하지 마세요.** `next`가 내부적으로 의존하는 `postcss`·`sharp` 취약점에 대해 npm이 제시하는 유일한 "해결책"이 **`next@9.3.3`으로 다운그레이드**하는 것입니다. 실행하면 App Router·`proxy.ts`·`cacheComponents`가 전부 깨집니다.

남아 있는 3건의 high 취약점은 `next`의 전이 의존성이라 상위에서 고칠 수 없으며, Next.js 업스트림 업데이트를 기다려야 합니다. 복구가 필요하면 `npm install next@latest`.

## Next.js 16 특이사항 (가장 흔한 실수 지점)

- **`middleware.ts`가 없습니다.** Next.js 16에서 이름이 바뀌어 루트의 **`proxy.ts`** 가 그 역할을 합니다 (`export async function proxy`). `middleware.ts`를 새로 만들지 마세요 — 충돌합니다.
- **`next.config.ts`에 `cacheComponents: true`** 가 켜져 있습니다. `cookies()`, `headers()`, 캐시되지 않은 fetch 등 동적 데이터 접근은 반드시 `<Suspense>` 경계 안에 있어야 하며, 아니면 **빌드가 실패**합니다. 서버 컴포넌트에서 Supabase를 읽을 때는 해당 부분을 별도 async 컴포넌트로 분리하고 `<Suspense>`로 감싸세요 (`app/protected/page.tsx`, `app/protected/layout.tsx` 참고).
- 경로 alias는 **`@/* → ./*`** (루트 기준). `src/` 디렉터리는 없고 `app/`, `components/`, `lib/`가 루트에 있습니다.

## Supabase 클라이언트 — 3개 파일, 이름이 전부 `createClient`

컨텍스트별로 파일이 다르며 **함수 이름은 모두 `createClient`** 라 import 경로를 틀리기 쉽습니다.

| 파일 | 용도 | 호출 방식 |
|---|---|---|
| `lib/supabase/client.ts` | `"use client"` 컴포넌트 | `createClient()` — 동기 |
| `lib/supabase/server.ts` | 서버 컴포넌트 / 라우트 핸들러 | **`await createClient()`** — 비동기 |
| `lib/supabase/proxy.ts` | `proxy.ts`용 세션 갱신 | `updateSession(request)` |

- 서버 클라이언트를 **전역 변수에 저장하지 마세요** (Fluid compute). 함수마다 새로 생성합니다.
- `lib/supabase/proxy.ts`에서 `createServerClient`와 `supabase.auth.getClaims()` **사이에 코드를 넣지 마세요.** 또한 `supabaseResponse` 객체는 쿠키가 복사된 그대로 반환해야 합니다 — 아니면 세션이 깨집니다.
- 인증 확인은 `getUser()`가 아니라 **`getClaims()`** 를 씁니다 (더 빠름). 기존 코드와 통일하세요.

## 환경 변수

`.env.example`을 `.env.local`로 복사한 뒤 값을 채웁니다.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- 두 번째는 `ANON_KEY`가 아니라 **`PUBLISHABLE_KEY`** 입니다. Supabase 대시보드 표기와 다르니 주의하세요.
- 환경 변수가 없으면 `lib/utils.ts`의 `hasEnvVars`가 false가 되어 **에러 없이 인증이 조용히 비활성화**됩니다. 인증이 안 될 때 여기부터 확인하세요.

## 타입

- DB 타입은 루트의 **`database.types.ts`** (`@/database.types`). 세 Supabase 클라이언트 모두 `<Database>`로 제네릭 지정되어 있습니다.
- 재생성 스크립트가 없습니다. 스키마 변경 후에는 **Supabase MCP**로 재생성하세요 (`/db-types` 스킬).
- 스키마 조회·변경도 Supabase MCP를 통해 합니다. 로컬 Supabase CLI 설정이나 마이그레이션 파일이 없습니다.

## 기술 스택 / 컨벤션

- **Tailwind CSS v3** (v4 아님). `tailwind.config.ts` + `@tailwind` 디렉티브 + `autoprefixer`. v4 문법(`@import "tailwindcss"`, `@theme`)을 쓰지 마세요.
- **shadcn/ui** (new-york, `components.json`). UI 프리미티브는 `components/ui/`에 있고, 새 컴포넌트는 `npx shadcn@latest add <name>`로 추가합니다.
- 폼: **React Hook Form + Zod (v4) + `@hookform/resolvers`**. 상태관리: **Zustand**. 기존 auth 폼들은 아직 raw `useState`이니 참고하지 말고 새 폼부터 위 스택을 쓰세요.
- 파일명 kebab-case, 컴포넌트 named export, 큰따옴표, 세미콜론, 2칸 들여쓰기. Prettier가 없어 ESLint와 관례로만 유지됩니다.
- ESLint는 flat config (`eslint.config.mjs`)이며 `eslint-config-next@16`을 **`FlatCompat` 없이 직접 스프레드**합니다. v16부터 flat config 배열을 그대로 export하므로 `FlatCompat`으로 감싸면 런타임 에러가 납니다.

## 참고하지 말 것 (starter kit 잔재물, 삭제 예정)

아래는 템플릿 튜토리얼 코드입니다. 패턴 참고 대상으로 삼지 말고, 관련 없는 수정도 하지 마세요.

- `components/tutorial/` 전체
- `components/hero.tsx`, `components/deploy-button.tsx`, `components/next-logo.tsx`, `components/supabase-logo.tsx`, `components/env-var-warning.tsx`
- `lib/utils.ts`의 `hasEnvVars`
- `README.md` — 손대지 않은 upstream 템플릿 문서라 이 프로젝트를 설명하지 않습니다
