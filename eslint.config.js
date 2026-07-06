import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default defineConfig(
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  globalIgnores(['**/dist/**', '**/node_modules/**', 'scripts']),
  {
    rules: {
      'no-console': 'warn',
    },
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  prettier,
);
