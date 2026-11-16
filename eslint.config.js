import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', '.worktrees', '.agent-runs'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression[left.object.object.name='window'][left.object.property.name='location'][left.property.name='href']",
          message: '내부 이동은 React Router의 Link/useNavigate를 사용하세요.',
        },
      ],
    },
  },
  {
    files: ['src/components/three/**/*.tsx'],
    rules: {
      // R3F 씬 그래프는 매 프레임 Three.js 객체를 직접 변경하는 것이 정상 패턴
      'react-hooks/immutability': 'off',
    },
  },
);
