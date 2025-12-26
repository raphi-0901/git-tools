import { includeIgnoreFile } from '@eslint/compat'
import oclif from 'eslint-config-oclif'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gitignorePath = path.resolve(__dirname, '.gitignore')

export default [
    includeIgnoreFile(gitignorePath),
    ...oclif,
    {
        files: ['*.ts', '*.tsx'],
        rules: {
            '@typescript-eslint/consistent-type-assertions': 'error',
            '@typescript-eslint/member-delimiter-style': [
                'error',
                {
                    multiline: {
                        delimiter: 'none',
                        requireLast: false,
                    },
                    singleline: {
                        delimiter: 'semi',
                        requireLast: false,
                    },
                },
            ],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/strict-boolean-expressions': 'warn',
        },
    },
    {
        files: ['**/*'],
        rules: {
            '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
            // Stylistic-Regeln, die NICHT mit Prettier kollidieren
            '@stylistic/spaced-comment': ['error', 'always'],
            // Logik-Regeln (bleiben aktiv)
            'arrow-body-style': ['error', 'as-needed'],
            curly: ['error', 'all'],
            'no-await-in-loop': 'off',
            'no-console': 'off',
            'no-nested-ternary': 'error',
            'prefer-const': [
                'error',
                {
                    destructuring: 'all',
                    ignoreReadBeforeAssign: true,
                },
            ],
            'unicorn/filename-case': 'off',
            'unicorn/no-array-reduce': 'off',

            'unicorn/prevent-abbreviations': 'off',
        },
    },
    {
        files: ['**/*'],
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            'prettier/prettier': 'error', // Das erzwingt das Prettier-Format als ESLint-Fehler
        },
    },
    // Deaktiviert alle Formatierungs-Regeln, die Prettier besser kann
    prettierConfig,
]
