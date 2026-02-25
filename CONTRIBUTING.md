# Contributing to FREE6

Thank you for considering contributing to FREE6! 🎉

## How to Contribute

### Reporting Bugs

Before filing a bug report, please:
1. Check existing [issues](https://github.com/jasonzli-DEV/FREE6/issues) to avoid duplicates.
2. Use the **Bug Report** template when creating a new issue.
3. Include as much detail as possible: OS, Node.js version, error messages, and steps to reproduce.

### Suggesting Features

1. Check the [roadmap/issues](https://github.com/jasonzli-DEV/FREE6/issues) to see if already requested.
2. Use the **Feature Request** template.
3. Explain the use case clearly and how it improves FREE6.

### Pull Requests

1. **Fork** the repository and create a new branch:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Follow the **code style** — ES modules, async/await, meaningful variable names.
3. Run the bot locally and test your changes.
4. Write or update documentation comments where relevant.
5. Open a PR against `main` using the PR template.
6. Be responsive to review feedback.

### Development Setup

```bash
git clone https://github.com/jasonzli-DEV/FREE6.git
cd FREE6
npm install
cp .env.example .env
# Fill in your .env with a test bot token
npm run deploy  # Deploy slash commands to your test server
npm run dev     # Start with auto-restart
```

### Code Style Guidelines

- Use **ES Modules** (`import`/`export`)
- Use **async/await** for all async operations
- Each plugin lives in `src/plugins/<name>/`
- Commands in `src/commands/<category>/`
- Follow the existing file structure
- Keep lines under 120 characters
- Use descriptive variable names (no single-letter variables outside loops)

### Commit Message Format

```
type(scope): short description

Examples:
feat(leveling): add double-XP weekends
fix(automod): correctly ignore bot messages
docs(readme): update setup instructions
refactor(economy): simplify coin calculation
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

## Code of Conduct

By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
