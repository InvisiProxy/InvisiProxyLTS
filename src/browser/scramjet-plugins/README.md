# scramjet-plugins

Controller plugins from [scramjet](https://github.com/MercuryWorkshop/scramjet)'s
`packages/utils` (`@mercuryworkshop/scramjet-utils`), vendored from the v2.1.0
release. The npm 0.0.3 build predates the v2.1.0 controller API and breaks at
runtime against scramjet 2.1.0, so the sources are built with the site instead.

AGPL-3.0-only, like this repo. Only the plugins the site uses are kept; when
scramjet publishes a compatible utils release, this folder can go away.
