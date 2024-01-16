**(Optional)**

**Type:** string

**Values:** `restart` | `shutdown` | `success-shutdown` | `ignore`

Defines what happens when the service exits with a nonzero
exit code. Possible values are:
  - `restart` (default): restart the service after the backoff delay
  - `shutdown`: shut down and exit the Pebble daemon (with exit code 10)
  - `success-shutdown`: shut down and exit Pebble with exit code 0
  - `ignore`: do nothing further