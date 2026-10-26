# Translations

Translations are done on [Crowdin][crowdin]. No GitHub account or coding needed.

## Contributing

1. Join the [Crowdin project][crowdin].
2. Pick a language and open `en.yaml`.
3. Translate strings or vote on suggestions.

Missing a language? Open an issue or ask in the Discord.

Finished translations are synced here automatically via a PR from the `translations` branch.

## Rules

- Leave `{placeholders}` as-is. In `Found {count} sites`, `{count}` stays `{count}`.
- Leave `<tags>` as-is and translate only the text inside them.
- `language.name` is your language's native name (`Français`, `日本語`), not the English one.
- `language.maskedTerms` lists words web filters look for (Proxy, Unblock, VPN). Add your language's equivalents, e.g. `Прокси`. English terms are already included.
- Untranslated strings fall back to English, so partial translations are fine.

Crowdin will flag mismatched placeholders or tags. Fix those before saving.

## Maintainers

- `en.yaml` is the source. Edit English here; Crowdin picks it up on the next sync.
- Other `*.yaml` files are managed by Crowdin and will be overwritten if edited directly.
- Crowdin names files by its locale code, so variants get their own file: `zh-Hans.yaml` (Simplified), `zh-Hant.yaml` (Traditional), `zh_HK.yaml`
- Visitors get the closest match by script and region: `zh-HK` and `zh-TW` get Traditional, `zh` and `zh-SG` get Simplified
- Run `pnpm test:unit` before merging a Crowdin PR. It checks every file against `en.yaml` for missing placeholders and tags.
- Intergration lives in [`crowdin.yml`](../crowdin.yml).

[crowdin]: https://crowdin.com/project/invisiproxy
