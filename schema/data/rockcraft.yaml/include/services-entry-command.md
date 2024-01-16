**(Required)**

**Keys:** string

The command to run the service. It is executed
directly, not interpreted by a shell, and may be optionally suffixed by default
arguments within `[` and `]` which may be overridden via `--args`.

**Example:** `/usr/bin/somedaemon --db=/db/path [ --port 8080 ]`