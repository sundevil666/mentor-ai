module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['dist', '.quasar', 'node_modules'],
};
