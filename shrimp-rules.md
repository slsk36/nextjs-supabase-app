# 개발 가이드라인 (AI Agent 전용)

> 이 문서는 **AI Agent가 이 저장소를 수정할 때 따르는 운영 규칙**입니다.
> 일반 개발 지식은 담지 않습니다. 이 저장소에서만 참인 사실과 함정만 기술합니다.
> `CLAUDE.md`와 충돌하면 `CLAUDE.md`가 우선입니다.

---

## 1. 프로젝트 개요

Next.js + Supabase 학습용 저장소. Vercel "Next.js and Supabase Starter Kit"에서 출발했고, `docs/PRD.md`에 정의된 일회성 모임 관리 앱("모임해") MVP를 구현하는 중입니다.

| 항목 | 값 | 주의 |
|---|---|---|
| Next.js | 16.x | 미들웨어 파일명이 `proxy.ts` |
| React | 19 | |
| Tailwind CSS | **v3** | v4 문법 금지 |
| shadcn/ui | new-york, RSC | `components.json` |
| 폼 | React Hook Form + Zod **v4** + `@hookform/resolvers` | |
| 전역 상태 | Zustand (설치됨, MVP에서는 사용하지 않음) | |
| 백엔드 | Supabase (`@supabase/ssr`, `@supabase/supabase-js` — 둘 다 `latest`) | 버전 고정 안 됨 |
| 테스트 | **없음** | CI도 없음 |

---

## 2. 디렉터리 구조

- 경로 alias는 **`@/* → ./*`** (저장소 루트 기준)입니다.
- **`src/` 디렉터리를 만들지 마세요.** `app/`, `components/`, `lib/`은 루트에 있습니다.

| 경로 | 역할 | 규칙 |
|---|---|---|
| `app/` | App Router 라우트 | 라우트 추가 시 §5 공개 라우트 절차 확인 |
| `app/auth/**` | 인증 화면 · 콜백 라우트 핸들러 | 비로그인 접근 허용 경로 |
| `app/protected/` | 스타터 잔재물 | PRD상 `/events`로 대체 예정 — 확장 금지 |
| `components/` | 도메인 컴포넌트 | kebab-case 파일명, named export |
| `components/ui/` | shadcn/ui 프리미티브 | **손으로 만들지 말고 CLI로 추가** (§8) |
| `components/tutorial/` | 스타터 잔재물 | 참고·수정 금지 (§12) |
| `lib/supabase/` | Supabase 클라이언트 3종 | §3 |
| `lib/utils.ts` | `cn()` + 잔재물 `hasEnvVars` | |
| `docs/PRD.md` | 제품 요구사항 | 기능 구현 전 반드시 확인 |
| `shrimp_data/` | shrimp-task-manager 데이터 | 직접 편집 금지 |

**루트 특수 파일**

| 파일 | 역할 | 규칙 |
|---|---|---|
| `proxy.ts` | Next.js 16 미들웨어 진입점 | `config.matcher`는 **정적 파일 제외용**. 인증 예외는 여기가 아님 |
| `next.config.ts` | `cacheComponents: true` | §4 |
| `database.types.ts` | Supabase 생성 타입 | **수동 편집 금지** (§6) |
| `eslint.config.mjs` | flat config | `FlatCompat` 사용 금지 |
| `tailwind.config.ts` | Tailwind v3 설정 | |

---

## 3. Supabase 클라이언트 — 이름이 전부 `createClient`

**import 경로를 틀리는 것이 이 저장소에서 가장 흔한 오류입니다.** 새 클라이언트를 직접 생성하지 말고 반드시 아래에서 import하세요.

| 실행 위치 | import | 호출 |
|---|---|---|
| `"use client"` 컴포넌트 | `@/lib/supabase/client` | `createClient()` — **동기** |
| Server Component / Route Handler / Server Action | `@/lib/supabase/server` | **`await createClient()`** — 비동기 |
| `proxy.ts` 내부 | `@/lib/supabase/proxy` | `updateSession(request)` |

```ts
// ✅ 서버 — await 필수
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// ❌ 서버에서 await 누락 → 런타임에 supabase.from is not a function
const supabase = createClient();

// ❌ 클라이언트 컴포넌트에서 서버 클라이언트 import
import { createClient } from "@/lib/supabase/server"; // "use client" 파일에서 금지
```

### 3.1 절대 규칙

- 서버 클라이언트를 **모듈 전역 변수에 저장하지 마세요.** Fluid compute 환경에서 세션이 섞입니다. 함수마다 새로 생성합니다.
- `lib/supabase/proxy.ts`에서 **`createServerClient(...)`와 `await supabase.auth.getClaims()` 사이에 코드를 넣지 마세요.** 사용자가 무작위로 로그아웃되는 디버깅 불가능한 버그가 생깁니다.
- `lib/supabase/proxy.ts`의 `supabaseResponse`는 **쿠키가 복사된 그대로 반환**하세요. 새 `NextResponse`로 갈아끼우려면 쿠키를 반드시 복사합니다.
- Supabase 호출 결과의 `error`를 **항상 확인**하세요. 무시하고 진행 금지.

### 3.2 환경 변수

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- 두 번째 이름은 **`PUBLISHABLE_KEY`** 입니다. `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 쓰지 마세요.
- 값이 없으면 `lib/utils.ts`의 `hasEnvVars`가 false가 되어 **에러 없이 인증이 조용히 비활성화**됩니다. "로그인이 안 된다"는 증상은 여기부터 확인하세요.
- `.env.local`을 읽거나 커밋하지 마세요. 비밀값을 코드·설정 파일에 하드코딩 금지.

---

## 4. Next.js 16 필수 규칙

### 4.1 미들웨어는 `proxy.ts`

- 루트 **`proxy.ts`** 가 `export async function proxy(request)` 를 내보냅니다.
- **`middleware.ts`를 새로 만들지 마세요.** 충돌합니다.

### 4.2 `cacheComponents: true` — 빌드에서만 실패하는 오류

`next.config.ts`에 켜져 있습니다. `cookies()`, `headers()`, `await createClient()` 후의 Supabase 조회 등 **동적 데이터 접근은 반드시 `<Suspense>` 경계 안**에 있어야 합니다.

- 위반해도 `npm run dev`와 `npx tsc --noEmit`은 **통과합니다.** `npm run build`에서만 실패합니다.
- 참조 예시는 `app/protected/page.tsx` 하나뿐입니다. 새 페이지도 이 형태를 따르세요.

```tsx
// ✅ 데이터를 읽는 부분만 async 컴포넌트로 분리하고 Suspense로 감쌉니다
async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/auth/login");
  return <pre>{JSON.stringify(data.claims, null, 2)}</pre>;
}

export default function Page() {
  return (
    <Suspense fallback={<p>불러오는 중…</p>}>
      <UserDetails />
    </Suspense>
  );
}

// ❌ 페이지 컴포넌트 본문에서 직접 조회 → npm run build 실패
export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return <pre>{JSON.stringify(data?.claims)}</pre>;
}
```

---

## 5. 인증 · 권한

### 5.1 인증 확인은 `getClaims()`

`getUser()`를 쓰지 마세요. 기존 코드와 통일합니다.

```ts
// ✅
const { data, error } = await supabase.auth.getClaims();
if (error || !data?.claims) {
  redirect("/auth/login");
}

// ❌
const { data: { user } } = await supabase.auth.getUser();
```

### 5.2 비로그인 접근 라우트를 추가할 때

현재 `lib/supabase/proxy.ts`의 리디렉트 조건은 **`/`와 `/auth/*`, `/login*` 외 모든 경로를 로그인 필수**로 만듭니다.

→ 공개 라우트(예: PRD의 `/e/[slug]`)를 추가하면 **`lib/supabase/proxy.ts`의 `if` 조건에 경로 예외를 추가하세요.** 이 작업을 먼저 하지 않으면 해당 페이지는 무조건 `/auth/login`으로 튕깁니다.

- 예외를 루트 `proxy.ts`의 `config.matcher`에 추가하지 마세요. matcher는 정적 파일 제외 용도입니다.

### 5.3 사용자 입력을 리디렉트 대상으로 쓸 때

`app/auth/callback/route.ts`의 검증 패턴을 그대로 복제하세요.

```ts
// ✅ 오픈 리디렉트 방지 — 내부 절대 경로만 허용, "//evil.com" 차단
const next =
  nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/protected";
```

### 5.4 `redirect()` 주의

`next/navigation`의 `redirect()`는 `NEXT_REDIRECT` 에러를 throw합니다. **`try/catch` 블록 안에 넣지 마세요.**

### 5.5 RLS

- 새 테이블을 만들면 **RLS 활성화와 정책을 함께** 적용하세요. 정책이 없으면 기본 거부입니다.
- 비로그인(`anon`) 접근이 필요하면 테이블 SELECT를 열지 말고 **`SECURITY DEFINER` RPC 함수**로 노출하세요 (`docs/PRD.md` 8장). 함수에는 `SET search_path = public, pg_temp`를 반드시 붙입니다.
- 권한 검사는 서버 또는 RLS에서 수행합니다. 클라이언트에서 온 값을 신뢰하지 마세요.

---

## 6. DB 스키마 · 타입 동기화

로컬 Supabase CLI 설정도, 마이그레이션 파일도, 타입 재생성 스크립트도 **없습니다.** 모든 DB 작업은 **Supabase MCP**로 합니다.

**스키마를 변경했다면 아래 순서를 반드시 전부 수행하세요.**

1. `mcp__supabase__list_tables` — 추측하지 말고 현재 스키마 확인
2. `mcp__supabase__apply_migration` — 변경 적용
3. `mcp__supabase__generate_typescript_types` → 결과로 `database.types.ts` **전체 덮어쓰기** (`/db-types` 스킬)
4. `mcp__supabase__get_advisors` — 보안 경고 확인 (특히 `SECURITY DEFINER` 함수의 `search_path`)
5. `npx tsc --noEmit` — 세 Supabase 클라이언트가 모두 `<Database>` 제네릭을 쓰므로 전체 쿼리에 영향

- **`database.types.ts`를 손으로 편집하지 마세요.** `eslint.config.mjs`의 ignore 대상이라 lint가 잡아주지 않습니다.
- 덮어쓰기 전에 기존 파일을 읽고 **무엇이 달라지는지 요약**해 사용자에게 보고하세요.
- 현재 정의된 테이블은 `public.profiles` 하나뿐입니다. PRD의 `events`·`rsvps`는 아직 없습니다.
- DB 타입은 `Tables<"events">` 형태로 `@/database.types`에서 가져옵니다.

---

## 7. 코드 스타일

이 저장소에는 Prettier가 없습니다. 아래를 수동으로 지키세요.

| 항목 | 규칙 |
|---|---|
| 파일명 | kebab-case (`google-sign-in-button.tsx`) |
| 컴포넌트 | PascalCase, **named export** (`export function LoginForm`) — 페이지·라우트 핸들러만 default export |
| 문자열 | 큰따옴표 |
| 세미콜론 | 사용 |
| 들여쓰기 | 2칸 |
| 주석 | **한국어** |
| `any` | **금지.** `catch (error: unknown)` 후 `error instanceof Error`로 좁히세요 |

---

## 8. UI · 폼 · 상태

### 8.1 shadcn/ui

- 새 프리미티브가 필요하면 **`npx shadcn@latest add <name>`** 으로 추가하세요. `components/ui/*.tsx`를 기억에 의존해 손으로 작성하지 마세요.
- 어떤 컴포넌트가 있는지 모르면 **shadcn MCP**로 검색하세요.
- 현재 설치됨: `badge`, `button`, `card`, `checkbox`, `dropdown-menu`, `input`, `label`.
- 아이콘은 `lucide-react`.

### 8.2 Tailwind v3

```css
/* ✅ app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ❌ v4 문법 — 이 저장소에서 동작하지 않습니다 */
@import "tailwindcss";
@theme { }
```

- 색상은 `tailwind.config.ts`에 매핑된 CSS 변수 토큰(`bg-background`, `text-muted-foreground`, `border-border` 등)을 쓰세요. 하드코딩 색상 금지.
- **반응형은 필수**입니다. PRD상 공개 페이지는 모바일 우선으로 설계합니다.

### 8.3 폼

- 새 폼은 **React Hook Form + Zod v4 + `@hookform/resolvers`** 로 작성하세요.
- Zod 스키마는 `lib/validations/<도메인>.ts`에 두고 **클라이언트 검증과 서버 액션 검증에서 재사용**하세요.
- 기존 auth 폼(`components/login-form.tsx`, `sign-up-form.tsx`, `forgot-password-form.tsx`, `update-password-form.tsx`)은 raw `useState`입니다. **패턴 참고 대상이 아닙니다.**
- 제출 중에는 버튼을 `disabled` 처리해 중복 제출을 막으세요.
- 모든 입력에 `<Label htmlFor>` 를 연결하고, 에러 메시지는 `aria-describedby`로 연결하세요.

### 8.4 Server / Client 경계

- 기본은 Server Component입니다. `"use client"`는 상태·이벤트 핸들러·브라우저 API가 필요할 때만 붙이세요.
- 조회는 Server Component에서 하고 결과를 props로 내립니다.
- 변경은 **Server Action**을 우선 고려하세요.
- Zustand는 MVP 범위에서 사용하지 마세요. 서버 상태는 서버 컴포넌트, 폼 상태는 RHF로 충분합니다.

---

## 9. 핵심 파일 상호작용 매트릭스

**왼쪽을 수정하면 오른쪽을 반드시 함께 처리하세요.**

| 변경 대상 | 함께 수정/실행해야 할 것 |
|---|---|
| DB 스키마 (테이블·컬럼·RPC) | `database.types.ts` 재생성 → `get_advisors` → `npx tsc --noEmit` (§6 전체) |
| 비로그인 접근 라우트 추가 | `lib/supabase/proxy.ts`의 리디렉트 `if` 조건에 경로 예외 추가 (§5.2) |
| 정적 파일/이미지 등 미들웨어 제외 대상 변경 | 루트 `proxy.ts`의 `config.matcher` |
| 서버에서 Supabase 조회·`cookies()` 사용하는 페이지 추가 | async 하위 컴포넌트 분리 + `<Suspense>` (§4.2) → `npm run build`로 확인 |
| 새 shadcn 프리미티브 필요 | `npx shadcn@latest add` 실행 (직접 작성 금지) → `components/ui/`에 생성 확인 |
| 새 폼 추가 | `lib/validations/*.ts`에 Zod 스키마 생성 → 클라이언트·서버 양쪽에서 import |
| `lib/supabase/*.ts`의 `<Database>` 제네릭 관련 변경 | 세 파일(`client.ts`, `server.ts`, `proxy.ts`) 전부 확인 |
| 환경 변수 추가 | `.env.example` 갱신 + `lib/utils.ts`의 `hasEnvVars` 영향 확인 |
| 인증 흐름 변경 | `lib/supabase/proxy.ts`, `app/auth/callback/route.ts`, `app/auth/confirm/route.ts`, `components/auth-button.tsx` 를 함께 검토 |
| 라우트 구조 변경 | `docs/PRD.md` 6장 라우트 표와 일치시키고, 어긋나면 사용자에게 보고 |
| 잔재물 파일 삭제 (§12) | 이를 import하는 `app/protected/layout.tsx`, `app/page.tsx` 등을 함께 정리 |

---

## 10. 검증 절차

테스트 프레임워크와 CI가 없습니다. 아래 3단계가 전부이며 **반드시 순서대로** 실행합니다 (`/verify` 스킬).

```bash
npm run lint          # 1
npx tsc --noEmit      # 2  (package.json에 스크립트 없음 — 직접 실행)
npm run build         # 3  cacheComponents 위반은 여기서만 잡힘
```

- 앞 단계가 실패하면 **거기서 멈추고 고친 뒤 처음부터 다시** 실행하세요.
- **3단계를 건너뛰지 마세요.** lint와 tsc는 `cacheComponents` 위반을 통과시킵니다.
- 3개가 모두 통과했을 때만 "검증 통과"라고 보고하세요. 일부만 돌렸다면 어느 단계를 건너뛰었는지 명시합니다.
- 실패하면 출력을 그대로 보여주고 원인과 수정안을 설명하세요. **검증 없이 "완료했습니다"라고 보고 금지.**

---

## 11. AI 의사결정 기준

### 11.1 Supabase를 어디서 호출할지

```
호출 위치가 "use client" 파일인가?
├─ 예 → @/lib/supabase/client 의 createClient()  (동기)
└─ 아니오
   ├─ proxy.ts 내부인가? → @/lib/supabase/proxy 의 updateSession() 만 사용
   └─ 그 외(Server Component/Route Handler/Server Action)
      → @/lib/supabase/server 의 await createClient()
```

### 11.2 접근 권한 설계

```
이 데이터를 비로그인 사용자도 읽어야 하는가?
├─ 예 → anon에 테이블 권한을 주지 말 것
│        → SECURITY DEFINER RPC + SET search_path 로 노출
│        → lib/supabase/proxy.ts 에 경로 예외 추가
└─ 아니오 → authenticated 대상 RLS 정책 (owner_id = auth.uid())
```

### 11.3 정보가 부족할 때 — 추측 금지

| 모르는 것 | 확인 방법 |
|---|---|
| DB 스키마 | Supabase MCP `list_tables` |
| 런타임 오류·로그 | Supabase MCP `get_logs`, `get_advisors` |
| shadcn 컴포넌트 API | shadcn MCP |
| `@supabase/*`·Next.js 16 API | **context7 MCP** (두 패키지가 `latest`라 학습 데이터와 다를 수 있음) |
| 제품 요구사항·수용 기준 | `docs/PRD.md` |
| 기존 구현 패턴 | 실제 파일을 읽어서 (기억으로 쓰지 말 것) |

### 11.4 작업 범위

- 요청 범위를 넘는 리팩터링을 하지 마세요.
- 잔재물 파일(§12)을 마주치면 **참고도 확장도 하지 말고**, PRD 9.8 정리 단계에서만 삭제하세요.
- 사용자가 요청하지 않은 파일 생성·삭제를 하지 마세요.
- 학습용 저장소이므로 구현 시 **왜 그렇게 했는지 단계별 설명**을 한국어로 곁들이세요.

---

## 12. 참고 금지 파일 (starter kit 잔재물, 삭제 예정)

패턴 참고 대상으로 삼지 말고, 관련 없는 수정도 하지 마세요.

- `components/tutorial/` 전체
- `components/hero.tsx`, `components/deploy-button.tsx`, `components/next-logo.tsx`, `components/supabase-logo.tsx`, `components/env-var-warning.tsx`
- `lib/utils.ts`의 `hasEnvVars`
- `app/protected/` — PRD상 `/events`로 대체 예정
- `README.md` — 손대지 않은 upstream 템플릿 문서. 이 프로젝트를 설명하지 않음

---

## 13. 절대 금지

| 금지 행위 | 이유 |
|---|---|
| **`npm audit fix --force`** | npm이 제시하는 유일한 해결책이 `next@9.3.3` 다운그레이드입니다. App Router·`proxy.ts`·`cacheComponents`가 전부 깨집니다. 남은 high 취약점은 `next`의 전이 의존성이라 상위에서 고칠 수 없습니다. 복구는 `npm install next@latest` |
| `middleware.ts` 생성 | `proxy.ts`와 충돌 |
| `any` 타입 | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` 사용 | 이 저장소는 `PUBLISHABLE_KEY` |
| `getUser()`로 인증 확인 | `getClaims()`로 통일 |
| Tailwind v4 문법 (`@import "tailwindcss"`, `@theme`) | v3 프로젝트 |
| `eslint.config.mjs`에 `FlatCompat` 도입 | `eslint-config-next@16`은 flat config 배열을 직접 export합니다. 감싸면 런타임 에러 |
| Supabase 서버 클라이언트를 전역 변수에 저장 | Fluid compute에서 세션 오염 |
| `createServerClient`와 `getClaims()` 사이 코드 삽입 | 무작위 로그아웃 |
| `database.types.ts` 수동 편집 | 생성 파일. lint 제외 대상 |
| `redirect()`를 `try/catch`로 감싸기 | `NEXT_REDIRECT`를 삼킴 |
| `.env.local` 커밋·출력 | |
| 검증(§10) 없이 완료 보고 | |

---

## 14. Git

- 커밋 메시지는 **한국어**로 작성합니다.
- **`git push` 금지.** 커밋까지만 하고 push는 사용자가 직접 실행합니다.
- 커밋은 사용자가 지시했을 때만 수행합니다.
- 커밋 메시지에 `Co-Authored-By: Claude ...`, `🤖 Generated with Claude Code` 등 **Claude 관련 문구를 넣지 마세요.**
