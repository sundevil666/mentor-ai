module.exports = {
  extends: ['../../.eslintrc.cjs', 'plugin:vue/vue3-recommended'],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    extraFileExtensions: ['.vue'],
  },
};
