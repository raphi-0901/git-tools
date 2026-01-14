# Auto Commit (`commit`)

Generate clean, conventional Git commit messages automatically from your staged changes — with an interactive feedback loop when you want fine-tuning.

---

## 📦 Installation

Install the CLI globally:

npm install -g git-tools

Or use it via npx:

npx git-tools auto-commit

---

## 🧩 Prerequisites

- 🟢 **Node.js** >= 22
- 🧰 **Git** >= 2.30
- 🌐 Active internet connection
- 🔑 **Groq API key**

---

## ✨ Features

- 🤖 AI-generated commit messages from staged diffs
- 🔁 Reword existing commits
- ✍️ Edit or give feedback before committing
- ⚙️ Global and per-repository configuration
- 🚀 Works directly in your terminal

---

## 🚀 Usage

Generate a commit message:

git add -A
git-tools auto-commit

Reword an existing commit:

git-tools auto-commit --reword <commit-hash>

You can accept, edit, give feedback, or cancel — all interactively.

---

## ⚙️ Configuration (Global vs Repository)

Configuration can be overwritten per repository.

To locate or edit the config, run this inside a repository:

git-tools auto-commit config

You can choose between:
- 🌍 Global config (shared across all repositories)
- 📦 Repository config (only for the current repository)

### ✅ Recommended setup

Global config:
- 🔑 GROQ_API_KEY
- 📝 your default instructions

Repository config:
- 📐 overrides for special commit conventions
- 🧩 repository-specific examples or wording rules

This keeps sensitive data and defaults in one place, while allowing fine-grained control per project.

---

Happy committing 🚀
