---
name: db-types
description: Supabase MCP로 루트의 database.types.ts를 재생성합니다. DB 스키마를 변경했거나(테이블/컬럼 추가·수정), 타입이 실제 스키마와 안 맞을 때 사용하세요.
disable-model-invocation: true
---

`database.types.ts`는 프로젝트 루트에 있고 `@/database.types`로 import됩니다. **재생성 스크립트가 `package.json`에 없고 로컬 Supabase CLI 설정도 없으므로**, Supabase MCP를 통해서만 갱신할 수 있습니다.

## 절차

1. `mcp__supabase__list_projects`로 프로젝트 목록을 확인하고 대상 project id를 정합니다. 후보가 여러 개면 사용자에게 어느 것인지 물어보세요.
2. `mcp__supabase__list_tables`로 현재 스키마를 확인합니다 (schema: `public`).
3. `mcp__supabase__generate_typescript_types`로 타입을 생성합니다.
4. 결과를 `D:\Users\inflearn\nextjs-supabase-app\database.types.ts`에 **전체 덮어쓰기** 합니다.
5. `npx tsc --noEmit`으로 기존 코드가 새 타입과 맞는지 확인합니다.
6. 타입 변경으로 깨진 곳이 있으면 어디가 왜 깨졌는지 보고하고 수정안을 제시합니다.

## 주의

- 덮어쓰기 전에 기존 파일을 읽어서 **무엇이 달라지는지 요약**해 주세요 (테이블/컬럼 추가·삭제·타입 변경). 사용자가 예상하지 못한 스키마 변경을 눈치챌 수 있어야 합니다.
- 삭제된 테이블·컬럼이 있으면 그것을 참조하는 코드가 없는지 먼저 확인하세요.
- 세 Supabase 클라이언트(`lib/supabase/client.ts`, `server.ts`, `proxy.ts`)가 모두 `<Database>` 제네릭을 쓰므로, 타입이 바뀌면 전체 쿼리에 영향이 갑니다.

$ARGUMENTS
