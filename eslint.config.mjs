import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next 16부터는 flat config 배열을 직접 export하므로
// FlatCompat(@eslint/eslintrc) 없이 스프레드해서 사용합니다.
const eslintConfig = [
  // 빌드 산출물 및 생성 파일은 검사 대상에서 제외
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "database.types.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default eslintConfig;
