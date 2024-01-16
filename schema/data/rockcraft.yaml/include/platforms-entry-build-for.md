``platforms.<entry>.build-for``
-------------------------------

**Type**: string | list[string]

**Required**: Yes, if ``<entry>`` is not a supported architecture name.

Target architecture the rock will be built for. Defaults to ``<entry>`` that
is a valid, supported architecture name.

> At the moment Rockcraft will only build for a single architecture, so
> if provided ``build-for`` must be a single string or a list with exactly one
> element.
