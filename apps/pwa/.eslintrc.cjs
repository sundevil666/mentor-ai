module.exports = {
  extends: ['../../.eslintrc.cjs', 'plugin:vue/vue3-recommended', 'prettier'],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    extraFileExtensions: ['.vue'],
  },
};
