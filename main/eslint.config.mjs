// eslint-config-next 16 ships native flat configs, so they are imported
// directly. The previous FlatCompat("next/core-web-vitals", "next/typescript")
// bridge crashed on load ("Converting circular structure to JSON") against
// this version, which made `npm run lint` unusable.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
