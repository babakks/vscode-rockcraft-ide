**(Optional)**

**Type:** string

**Values:** `restart` | `shutdown` | `failure-shutdown` | `ignore`

Defines what happens when the service exits with a zero
exit code. Possible values are:
  - `restart` (default): restart the service after the backoff delay
  - `shutdown`: shut down and exit the Pebble daemon (with exit code 0)
  - `failure-shutdown`: shut down and exit Pebble with exit code 10
  - `ignore`: do nothing further