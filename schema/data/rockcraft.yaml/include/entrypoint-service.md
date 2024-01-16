``entrypoint-service``
------------------------

**Type**: string

**Required**: No

The optional name of the Pebble service to serve as the OCI entrypoint. If set,
this makes Rockcraft extend ``["/bin/pebble", "enter", "--verbose"]`` with
``["--args", "<serviceName>"]``. The command of the Pebble service must
contain an optional argument that will become the OCI CMD.

> **Warning:** This option must only be used in cases where the targeted deployment
> environment has unalterable assumptions about the container image's
> entrypoint.