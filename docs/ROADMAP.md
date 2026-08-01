# ROADMAP — 모임해 MVP 구현 계획

> `docs/PRD.md` v1.0 의 MVP(Phase 1)를 이 저장소에 구현하기 위한 작업 분해 및 실행 순서

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026-08-01 |
| 기준 문서 | `docs/PRD.md` v1.0 |
| 대상 범위 | F-01 ~ F-10 (MVP Phase 1) |
| 총 작업 수 | 12개 |
| 관리 도구 | shrimp-task-manager (`list_tasks` / `execute_task`) |

---

## 1. 착수 전 확인 사항

아래 3건은 **1번 작업을 시작하기 전에 확정**해야 합니다.

### 1.1 대상 Supabase 프로젝트

`list_projects` 결과 프로젝트가 2개입니다.

| 이름 | ID | 상태 | 판정 |
|---|---|---|---|
| `nextjs-supabase-app` | `nhkqhmndqpjmxibxiauk` | ACTIVE_HEALTHY | **대상으로 판단** |
| `claude-nextjs-starterkit` | `lmnyzfsqyppybtcccuxy` | INACTIVE | 배제 |

판단 근거 — 저장소명과 일치하고, `list_tables` 결과 `public.profiles` 단 하나이며 이것이 루트 `database.types.ts`의 정의와 정확히 일치합니다.

> 마이그레이션은 되돌리기 어려우므로 1번 작업 실행 직전에 재확인합니다.

### 1.2 PRD 11.1 "advisor 경고 0건"은 코드로 달성 불가

현재 `get_advisors(security)` 결과 경고 1건이 이미 존재합니다.

```
auth_leaked_password_protection (WARN) — Leaked Password Protection Disabled
```

이는 **Supabase 대시보드의 Auth 설정**이며 마이그레이션으로 고칠 수 없습니다.

→ 완료 기준을 **"신규 스키마·함수로 인한 경고 0건"** 으로 조정합니다. 실제로 켜려면 사용자가 대시보드에서 직접 활성화해야 합니다.

### 1.3 스타터 잔재물 정리 시점

12번(마지막)에 일괄 배치했습니다. 8번(`/events` 완성) 직후로 앞당기면 인증 리디렉트가 일찍 정리되지만, 그 전에 지우면 로그인 후 이동할 곳이 사라집니다. **현 순서를 권장합니다.**

---

## 2. PRD 대비 보정 사항

계획 수립 중 실제 DB와 코드를 조회해 확인한 내용입니다. **PRD 기술을 그대로 따르면 실패하는 지점**이므로 구현 시 아래를 우선합니다.

### 2.1 데이터베이스 (실측: `list_extensions`, `pg_get_functiondef`, `pg_policies`)

| # | PRD 기술 | 실제 확인 결과 | 조치 |
|---|---|---|---|
| 1 | `encode(gen_random_bytes(16),'base64')` (8.5) | `pgcrypto`가 **`extensions` 스키마**에 설치됨 | **`extensions.gen_random_bytes(16)`** 로 스키마 한정. 누락 시 slug 기본값 생성 실패 |
| 2 | `SET search_path = public, pg_temp` (8.3) | 기존 `handle_new_user()`·`set_updated_at()`가 **`SET search_path TO ''`**(빈 값) + 모든 객체 완전 한정 | 더 엄격한 **기존 관례**를 따름. 모든 참조를 `public.events` 형태로 한정 |
| 3 | "`updated_at`은 트리거로 갱신" (7.5) | **`public.set_updated_at()`가 이미 존재**하며 `profiles`가 사용 중 | 신규 작성 금지, **재사용**. 트리거만 부착 |
| 4 | `owner_id = auth.uid()` (8.4) | 기존 `profiles` 정책이 **`( select auth.uid() )` 서브쿼리 형태** (행마다 재평가 방지) | 신규 정책도 동일 형태 |

기타 확인 사항 — Postgres 17.6.1 / `moddatetime` 확장 미설치(불필요) / 기존 정책 명명은 `profiles_select_authenticated`·`profiles_insert_own`·`profiles_update_own` 로 PRD의 `events_*_own` 명명과 일관.

### 2.2 프론트엔드 (실측: grep, `package.json`, `components/ui/`)

| # | PRD 기술 | 실제 확인 결과 | 조치 |
|---|---|---|---|
| 5 | 추가 shadcn 8종 (6.2) | `components/ui/form.tsx`가 **없음** | **`form` 추가.** RHF 연동과 `aria-describedby` 자동 연결(10.3)에 필요 |
| 6 | `select` 로 참석 상태 선택 | 3지선다이며 PRD 10.1이 모바일 우선, 10.3이 키보드 조작을 요구 | **`radio-group`** 사용. 방향키 로빙 포커스 기본 제공, 모바일에서 탭 1회로 선택 |
| 7 | `avatar` 추가 | MVP 화면에 아바타 표시 요구 없음 (F-05는 "주최자 이름"만) | **보류** |
| 8 | — | 날짜 라이브러리 사용처가 저장소 전체에 **0건** | 새 패키지 추가 금지. `lib/format.ts`에 `Intl.DateTimeFormat("ko-KR", …)` 래퍼를 한 곳만 |
| 9 | — | `<input type="datetime-local">` 값은 **오프셋 없는 로컬 벽시계 시각** | Zod transform에서 오프셋을 붙여 ISO로 변환. 누락 시 *"9시 모임이 다른 시각으로 저장"* 되는 조용한 버그 |
| 10 | `hasEnvVars` 제거 (9.8) | `lib/supabase/proxy.ts:13`에서 **환경변수 미설정 시 인증을 건너뛰는 안전장치**로 사용 중 | 삭제 금지. UI 사용처(`EnvVarWarning`)만 제거 |

### 2.3 `/protected` 참조 위치 (grep 실측 7개소)

12번 작업에서 **전부 `/events`로 교체**해야 합니다. 하나라도 누락하면 로그인 후 404가 됩니다.

```
app/auth/callback/route.ts:25,29        기본 next 값
components/login-form.tsx:43,116        router.push / GoogleSignInButton next
components/sign-up-form.tsx:48,126      emailRedirectTo / GoogleSignInButton next
components/update-password-form.tsx:37  router.push
components/google-sign-in-button.tsx:41 next 기본 프로퍼티값
```

---

## 3. 작업 목록

| # | 작업 | ID | 선행 | 관련 요구사항 |
|---|---|---|---|---|
| 1 | DB 마이그레이션 1 — 테이블·인덱스·트리거·RLS | `99b088b1` | — | PRD 7장, 8.4 |
| 2 | DB 마이그레이션 2 — SECURITY DEFINER RPC 3종 | `1ea53da6` | 1 | PRD 8.2~8.3 |
| 3 | `database.types.ts` 재생성 및 어드바이저 확인 | `cdb2c69d` | 2 | PRD 9.6 |
| 4 | `proxy.ts` 공개 라우트 예외 추가 | `61689cb3` | — | PRD 9.1 |
| 5 | shadcn 컴포넌트 추가와 Toaster 배치 | `799c8305` | — | PRD 6.2 |
| 6 | Zod 검증 스키마와 RPC 응답 파서 | `be41847f` | 3 | PRD 9.5 |
| 7 | 이벤트 Server Actions | `fac38c48` | 6 | F-01, F-02, F-09 |
| 8 | 이벤트 목록과 생성 폼 화면 | `76845216` | 7, 5 | F-01, F-04 |
| 9 | 관리 대시보드와 링크 공유 | `fbc708c9` | 8 | F-03, F-08 |
| 10 | 이벤트 수정·삭제와 취소 상태 | `ee970e7e` | 9 | F-02, F-09 |
| 11 | **공개 이벤트 페이지와 RSVP 응답** | `043e445a` | 4, 6, 5 | F-05, F-06, F-07, F-10 |
| 12 | 스타터 잔재물 정리와 최종 검증 | `2e71d51a` | 11, 10 | PRD 9.8, 11.1 |

---

## 4. 의존성 구조

```
1 ─→ 2 ─→ 3 ─→ 6 ─┬─→ 7 ─→ 8 ─→ 9 ─→ 10 ─┐
                   │        ↑              ├─→ 12
4 ─────────────────┼─→ 11 ──┼──────────────┘
                   │   ↑    │
5 ─────────────────┴───┴────┘
```

- **즉시 시작 가능**: **1, 4, 5** (선행 작업 없음)
- **최장 경로**: `1 → 2 → 3 → 6 → 7 → 8 → 9 → 10 → 12` (9단계) — 일정을 결정하는 구간
- **병행 가능**: 4번·5번은 DB 작업(1~3)과 파일이 겹치지 않아 동시 진행 가능

> **4번을 먼저 처리하는 것을 권장합니다.** 한 줄 수정이며, 11번을 막을 유일한 차단 요인을 미리 제거합니다.

---

## 5. 단계별 상세

### 단계 A — 데이터 계층 (작업 1~3)

**1. DB 마이그레이션 1 — 테이블·인덱스·트리거·RLS**

- `events` / `rsvps` 생성 (PRD 7.2·7.3 컬럼·CHECK 그대로)
- `public_slug` 기본값: `translate(encode(extensions.gen_random_bytes(16),'base64'),'+/=','-_')` → 22자, 128비트 엔트로피
- 인덱스 5종, `public.set_updated_at()` 트리거 부착
- RLS 활성화. **`anon` 대상 정책은 만들지 않음** (정책 없음 = 전면 차단)

*검증* — `rls_enabled=true`, 임의 insert 시 22자 slug 자동 생성, `pg_policies`에 `authenticated` 대상 6개만 존재

**2. DB 마이그레이션 2 — RPC 3종**

| 함수 | 반환 | 핵심 |
|---|---|---|
| `get_event_by_slug(p_slug, p_edit_token)` | `jsonb` | 이벤트 + `counts` + `roster` + `my_rsvp` + 파생 `is_cancelled`·`is_closed`. `owner_id`·타인 토큰 미반환 |
| `upsert_rsvp_by_slug(p_slug, p_name, p_status, p_message, p_edit_token)` | `jsonb` | 취소·종료 시 예외. 토큰 불일치는 **조용히 신규 처리** (존재 여부 비노출). 반환에 `edit_token` 포함 |
| `delete_rsvp_by_slug(p_slug, p_edit_token)` | `boolean` | 토큰 또는 `auth.uid()` 일치 행만 삭제 |

전부 `SECURITY DEFINER` + `SET search_path TO ''` + 완전 한정. `grant execute ... to anon, authenticated`.

> `get_event_by_slug`에 `is_closed`(= `starts_at < now()`)를 넣는 이유 — PRD 3.3의 "이미 지난 이벤트"는 `status` 컬럼으로 표현되지 않는 파생 상태입니다. 프론트가 시각 비교를 중복 구현하지 않도록 서버가 판정해 내려줍니다.

**3. 타입 재생성** — `generate_typescript_types` → `database.types.ts` 전체 덮어쓰기 → `npx tsc --noEmit` → `get_advisors`

### 단계 B — 인프라·기반 (작업 4~6, 단계 A와 병행 가능)

**4. `proxy.ts` 공개 라우트 예외** — `lib/supabase/proxy.ts`의 `if` 조건에 `!pathname.startsWith("/e/")` 추가. `createServerClient`~`getClaims()` 구간과 `supabaseResponse` 반환부는 **건드리지 않음**. 루트 `proxy.ts`의 `config.matcher`는 대상 아님.

**5. shadcn + Toaster** — `form textarea radio-group dialog tabs sonner separator skeleton` 설치, `app/layout.tsx`에 `<Toaster />`, `lib/format.ts` 신설

**6. Zod 스키마** — `lib/validations/event.ts`, `lib/validations/rsvp.ts`. 폼 스키마는 **클라이언트 RHF resolver와 Server Action 재검증 양쪽에서 재사용**. RPC의 `jsonb` 반환이 `Json` 타입으로 내려오므로 파싱 스키마로 타입 안전성 회복.

### 단계 C — 주최자 기능 (작업 7~10)

**7. Server Actions** (`lib/actions/events.ts`) — 소유권 검사는 RLS가 담당, 액션은 재검증·캐시 무효화 담당. `redirect()`는 `NEXT_REDIRECT`를 throw하므로 `try/catch` 밖에서 호출.

**8. `/events` + `/events/new`** — 참석 인원 수 집계에서 **N+1 주의**. PostgREST 임베디드 집계를 문서로 확인하고, 불확실하면 `in(event_id, ids)` 일괄 조회로 왕복 2회 고정.

**9. `/events/[id]`** — RLS가 타인 이벤트에 빈 결과를 주므로 권한 없음이 자연히 `notFound()`가 됨.

**10. `/events/[id]/edit` + 취소** — 수정 전후 `public_slug` 불변 확인 (F-03).

### 단계 D — 참석자 기능 (작업 11) — **최중요**

`/e/[slug]` 모바일 우선. 쿠키를 읽고 RPC를 호출하는 async 컴포넌트를 `<Suspense>`로 분리.

| 항목 | 값 |
|---|---|
| 쿠키 이름 | `rsvp_<slug>` |
| 값 | `edit_token` |
| 옵션 | `httpOnly`, `secure`(프로덕션), `sameSite: "lax"`, `path: /e/<slug>`, `maxAge` 90일 |

`httpOnly`라 클라이언트 JS가 읽을 수 없으므로 **폼 초기값은 서버에서 주입**하고, 쿠키 `set`은 **Server Action**에서만 수행합니다(서버 컴포넌트 불가).

### 단계 E — 정리 (작업 12)

`/protected` 참조 7개소 교체 → 잔재물 삭제 → 랜딩·`metadata`·`README.md` 재작성 → 최종 검증

---

## 6. 검증 절차

테스트 프레임워크와 CI가 없습니다. **각 작업 종료 시 아래 3단계를 순서대로** 실행합니다 (`/verify` 스킬).

```bash
npm run lint          # 1
npx tsc --noEmit      # 2
npm run build         # 3  ← Suspense 누락은 여기서만 잡힘
```

- 앞 단계 실패 시 거기서 멈추고 고친 뒤 **처음부터 다시** 실행
- **3단계를 생략하지 마세요.** `cacheComponents: true` 위반은 `dev`와 `tsc`를 통과합니다
- `npm audit fix --force` **절대 금지** (`next@9.3.3` 다운그레이드)

---

## 7. 완료 기준 (PRD 11.1 조정본)

- [ ] `events`·`rsvps` 테이블, RLS 정책, RPC 3종이 적용되어 있다
- [ ] `database.types.ts`가 재생성되어 있다
- [ ] `get_advisors` 보안 경고가 **신규 스키마 기인 0건**이다 *(§1.2 참고 — 기존 1건은 대시보드 설정)*
- [ ] F-01 ~ F-08의 모든 수용 기준이 통과한다
- [ ] **시크릿 창(비로그인)에서 공유 링크로 응답이 저장된다** ← 가장 중요한 검증
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run build` 3개 모두 통과한다
- [ ] 모바일 뷰포트(375px)에서 레이아웃이 깨지지 않는다
- [ ] `/protected` 참조가 저장소에 0건이다

---

## 8. 참고

| 문서 | 용도 |
|---|---|
| `docs/PRD.md` | 제품 요구사항·수용 기준의 원본 |
| `shrimp-rules.md` | AI Agent 운영 규칙, 파일 상호작용 매트릭스 |
| `CLAUDE.md` | 저장소 개요와 함정 |
| `.claude/skills/verify/SKILL.md` | 검증 3단계 |
| `.claude/skills/db-types/SKILL.md` | 타입 재생성 절차 |

## 부록 · 변경 이력

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| v1.0 | 2026-08-01 | 최초 작성. PRD v1.0 기반 12개 작업 분해, 실측 보정 사항 10건 반영 |
