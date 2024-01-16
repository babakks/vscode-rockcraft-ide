``checks``
------------

**Type**: dict, following the [Pebble Layer Specification format](https://github.com/canonical/pebble#layer-specification)

**Required**: No

A list of health checks that can be configured to restart Pebble services
when they fail. It uses Pebble's layer specification syntax, with each
entry corresponding to a check. Each check can be one of three types:
``http``, ``tcp`` or ``exec``.