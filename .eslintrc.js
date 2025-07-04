module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: ['plugin:react/recommended', 'plugin:jsx-a11y/recommended', 'plugin:react-hooks/recommended', 'next/core-web-vitals', 'prettier', 'plugin:storybook/recommended', 'plugin:storybook/recommended'],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json']
  },
  plugins: ['react', '@typescript-eslint', 'jsx-a11y', 'react-hooks'],
  rules: {
    'react/jsx-filename-extension': [1, {
      extensions: ['.tsx']
    }],
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off'
  }
};