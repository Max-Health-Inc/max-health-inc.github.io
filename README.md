# max-health-inc.github.io

Forwards project sites that moved out of the Max-Health-Inc organization.

| Old path | New location |
| --- | --- |
| `/BabelFHIR-TS/` | https://babelfhir-ts.github.io/parity-report/ |

GitHub Pages cannot send HTTP redirects, so this site forwards in two ways:

- **Redirect pages** at the known URLs (pages listed in `redirects.json`, plus every URL in the new site's sitemaps). Each one has a `canonical` link and a `meta refresh`, which search engines treat as a permanent move.
- **`404.html`** catches every other path under a moved prefix and forwards it in the browser, keeping the rest of the path, the query string and the anchor.

Non-browser clients get no redirect. Shields.io badge endpoints, for example, have to point at the new URL directly.

## Adding a move

1. Add an entry to `redirects.json`. `from` is the old path prefix, `to` is the new base URL, `pages` lists extra paths to give their own redirect page, and `sitemaps` are fetched relative to `to`.
2. Run `node build.mjs` (Node 20+) and commit the generated files.

Pages is served straight from the `main` branch, so no Actions run is needed.
