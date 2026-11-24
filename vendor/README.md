# vendor

Prebuilt scramjet packages from the upstream [continuous build releases]
(https://github.com/MercuryWorkshop/scramjet/releases), vendored because v3 is
not published to npm. The 2.1.0 release ships from npm
(`@mercuryworkshop/scramjet`, `@mercuryworkshop/scramjet-controller`) instead.

| package | upstream release | source tarball sha256 |
|---|---|---|
| `scramjet-3.0.0-alpha` | [latest](https://github.com/MercuryWorkshop/scramjet/releases/tag/latest) (`mercuryworkshop-scramjet-3.0.0-alpha.tgz`) | `8310c4c3a445de1fc90d74a88a4f324e54c45d4678013cd17d169bc940872864` |
| `scramjet-controller-0.0.15` | same (`mercuryworkshop-scramjet-controller-0.0.15.tgz`) | `2817ff1d33a055bff19a7550dc217441aa806b417eb33b1eab2d4be41ee797bf` |

To update: download the release tarballs, verify the checksums, extract and
replace the directories here, then re-record the checksums above.
