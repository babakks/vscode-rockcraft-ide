``services``
------------

**Type**: dict, following the [Pebble Layer Specification format](https://github.com/canonical/pebble#layer-specification)

**Required**: No

A list of services for the Pebble entrypoint. It uses Pebble's layer
specification syntax exactly, with each entry defining a Pebble service. For
each service, the ``override`` and ``command`` fields are mandatory, but all
others are optional.