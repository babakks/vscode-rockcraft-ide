``platforms.<entry>.build-on``
------------------------------

**Type**: list[string]

**Required**: Yes, if ``build-for`` is specified *or* if ``<entry>`` is not a
supported architecture name.

Host architectures where the rock can be built. Defaults to ``<entry>`` if that
is a valid, supported architecture name.