# Contributing

Thanks for contributing.

## Getting Started

1. Fork the repository.
2. Create a feature branch from `main`.
3. Install dependencies with `npm install`.
4. Copy `.env.example` to `.env.local` and configure your local services.
5. Run the app with `npm run dev`.

## Development Guidelines

- Keep changes focused and minimal.
- Follow the existing TypeScript and Next.js patterns.
- Prefer secure-by-default changes.
- Do not commit secrets, API keys, or real `.env` files.
- Update documentation when behavior or setup changes.

## Before Opening a Pull Request

- Run `npm run build`
- Run `npm run test`
- Verify the affected inbox flows manually if your change touches Appwrite or Mailgun handling

## Pull Requests

- Use a clear title and description.
- Include screenshots for UI changes.
- Explain any schema, environment, or deployment implications.

## Reporting Issues

Open a GitHub issue with:

- expected behavior
- actual behavior
- reproduction steps
- logs or screenshots when relevant

