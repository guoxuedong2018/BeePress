# Contributing

Thanks for taking the time to contribute.

## Setup

```bash
git clone https://github.com/guoxuedong2018/builder-kit.git
cd builder-kit
npm install
npm run check
```

`npm run check` is dependency-free and runs in CI.

## Scope

Builder Kit is intentionally small and local-first:

- No hosted service, no telemetry, no account system.
- Dev-only middleware; never ship the toolkit to production.
- Markdown is the single source of truth. Do not add a second copy of the content graph.
- The toolkit must not import product code. Business data crosses the boundary through `virtual:builder-kit/host`.

## Pull requests

- Keep changes surgical and explain the user-visible behaviour.
- Add or update documentation when the integration surface changes.
- Run `npm run check` before opening a PR.
- For UI changes, include a screenshot or a short description of the before/after.

## Reporting bugs

Open an issue with:

- Node, Vite and Vue versions;
- the host framework and adapter used;
- a minimal reproduction or the relevant slice of `vite.config.js`;
- the expected and actual behaviour.

## License

By contributing, you agree that your contributions are licensed under the MIT License.
