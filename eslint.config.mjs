import { includeIgnoreFile } from '@eslint/compat'
import oclif from 'eslint-config-oclif'
import prettier from 'eslint-config-prettier'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gitignorePath = path.resolve(__dirname, '.gitignore')

export default [
  includeIgnoreFile(gitignorePath),
  ...oclif,
  prettier,
  {
    files: ['*.ts', '*.tsx'],
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'none',
          requireLast: false,
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false,
        },
      }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
      }],
      '@typescript-eslint/strict-boolean-expressions': 'warn',
    },
  },

  {
    files: ['**/*'],
    rules: {
      '@stylistic/comma-dangle': ['error', 'only-multiline'],
      '@stylistic/comma-spacing': ['error', {
        'after': true,
        'before': false,
      }],
      '@stylistic/key-spacing': ['error', {
        'beforeColon': false,
      }],
      '@stylistic/object-curly-newline': ['error', {
        'ExportDeclaration': {
          'minProperties': 3,
          'multiline': true,
        },
        'ImportDeclaration': 'never',
        'ObjectExpression': 'always',
        'ObjectPattern': {
          'minProperties': 3,
          'multiline': true,
        },
      }],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/object-property-newline': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'brace-style': ['error', '1tbs', {
        allowSingleLine: false,
      }],
      'curly': ['error', 'all'],
      'max-len': ['warn', {
        code: 150,
      }],
      'no-await-in-loop': 'off',
      'no-console': 'warn',
      'no-nested-ternary': 'error',
      'prefer-const': ['error', {
        destructuring: 'all',
        ignoreReadBeforeAssign: true,
      }],
      'quotes': ['error', 'single'],
      'semi': ['error', 'never'],
      'unicorn/filename-case': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
]
