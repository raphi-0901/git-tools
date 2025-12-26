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
            '@stylistic/brace-style': ['error', '1tbs', {
                allowSingleLine: false,
            }],
            '@stylistic/comma-dangle': ['error', 'only-multiline'],
            '@stylistic/comma-spacing': ['error', {
                after: true,
                before: false,
            }],
            '@stylistic/indent': ['error', 4],
            '@stylistic/key-spacing': ['error', {
                beforeColon: false,
            }],
            '@stylistic/max-len': ['warn', {
                code: 150,
            }],
            '@stylistic/max-statements-per-line': ['error', {
                max: 1
            }],
            '@stylistic/no-confusing-arrow': 'error',
            '@stylistic/no-mixed-spaces-and-tabs': 'error',
            '@stylistic/no-multi-spaces': 'error',
            '@stylistic/no-multiple-empty-lines': 'error',
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/no-whitespace-before-property': 'error',
            '@stylistic/object-curly-newline': ['error', {
                ExportDeclaration: {
                    minProperties: 3,
                    multiline: true,
                },
                ImportDeclaration: 'never',
                ObjectExpression: 'always',
                ObjectPattern: {
                    minProperties: 3,
                    multiline: true,
                },
            }],
            '@stylistic/object-curly-spacing': ['error', 'always'],
            '@stylistic/object-property-newline': 'error',
            '@stylistic/operator-linebreak': ['error', 'before'],
            '@stylistic/quote-props': ['error', 'as-needed'],
            '@stylistic/quotes': ['error', 'single'],
            '@stylistic/rest-spread-spacing': ['error', 'never'],
            '@stylistic/semi': ['error', 'never'],
            '@stylistic/space-before-blocks': 'error',
            '@stylistic/space-in-parens': ['error', 'never'],
            '@stylistic/space-infix-ops': 'error',
            '@stylistic/spaced-comment': ['error', 'always'],
            '@stylistic/switch-colon-spacing': 'error',
            '@stylistic/template-curly-spacing': 'error',
            '@stylistic/template-tag-spacing': 'error',
            '@stylistic/type-annotation-spacing': 'error',
            '@stylistic/type-generic-spacing': ['error'],
            'arrow-body-style': ['error', 'as-needed'],
            curly: ['error', 'all'],
            'no-await-in-loop': 'off',
            'no-console': 'warn',
            'no-nested-ternary': 'error',
            'prefer-const': ['error', {
                destructuring: 'all',
                ignoreReadBeforeAssign: true,
            }],

            'unicorn/filename-case': 'off',
            'unicorn/no-array-reduce': 'off',
            'unicorn/prevent-abbreviations': 'off',
        },
    }
]
