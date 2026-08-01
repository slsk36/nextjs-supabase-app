"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";

/** 구글 공식 4색 "G" 로고. fill 이 고정색이라 라이트/다크 모드 모두에서 보입니다. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.71v2.98A11.5 11.5 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.67a6.9 6.9 0 0 1 0-4.42V7.27H1.71a11.5 11.5 0 0 0 0 10.38l3.84-2.98z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.24 15.11 0 12 0 7.5 0 3.6 2.58 1.71 6.34l3.84 2.98C6.46 6.78 9 4.75 12 4.75z"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  /** 로그인 성공 후 이동할 사이트 내부 경로 */
  next?: string;
  /** 버튼 문구 (회원가입 페이지에서는 "Sign up with Google") */
  label?: string;
  className?: string;
}

export function GoogleSignInButton({
  next = "/protected",
  label = "Continue with Google",
  className,
}: GoogleSignInButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      // PKCE code verifier 는 브라우저 클라이언트가 쿠키에 저장하고,
      // /auth/callback 라우트 핸들러가 그 쿠키로 code 를 세션으로 교환합니다.
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", next);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });
      if (error) throw error;
      // 성공 시 브라우저가 구글 동의 화면으로 이동합니다.
      // 이동에 수백 ms 가 걸리므로 isLoading 을 되돌리지 않아 중복 클릭을 막습니다.
      // (기존 폼들의 finally 패턴을 쓰지 않는 의도적 예외)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <GoogleIcon />
        {isLoading ? "Redirecting..." : label}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
