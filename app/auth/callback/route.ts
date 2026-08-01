import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

/**
 * OAuth(PKCE) 콜백 라우트.
 *
 * 흐름: 브라우저 signInWithOAuth() → 구글 동의 화면
 *      → Supabase(/auth/v1/callback) → 이 라우트로 ?code=... 반환
 *      → exchangeCodeForSession() 으로 세션 쿠키 발급
 *
 * @supabase/ssr 의 브라우저 클라이언트는 flowType "pkce" 가 강제되어 있고
 * code verifier 를 쿠키에 저장하므로, 서버에서 이 교환을 수행할 수 있습니다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // 사용자가 동의 화면에서 취소했거나 공급자 측 오류가 난 경우
  const providerError = searchParams.get("error");
  const providerErrorDescription = searchParams.get("error_description");

  // 오픈 리디렉트 방지: next 는 반드시 사이트 내부 절대 경로여야 합니다.
  // "//evil.com" 은 프로토콜 상대 URL 이므로 함께 차단합니다.
  const nextParam = searchParams.get("next") ?? "/protected";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/protected";

  if (providerError) {
    redirect(
      `/auth/error?error=${encodeURIComponent(
        providerErrorDescription ?? providerError,
      )}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    // redirect() 는 NEXT_REDIRECT 에러를 throw 하므로 try/catch 로 감싸면 안 됩니다.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 상대 경로를 넘기면 Location 헤더도 상대 경로가 되어,
      // 로드밸런서 뒤에서도 브라우저가 올바른 호스트로 해석합니다.
      // 세션 쿠키는 Next 가 리디렉트 응답에 자동으로 붙여 줍니다.
      redirect(next);
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/error?error=${encodeURIComponent("No code provided")}`);
}
