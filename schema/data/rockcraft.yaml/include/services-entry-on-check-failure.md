**(Optional)**

**Type:** map

**Keys:** `checks` entry names

**Values:** `restart` | `shutdown` | `success-shutdown` | `ignore`

Defines what happens when each of the named health checks
fail. Possible values are:
  - `restart` (default): restart the service once
  - `shutdown`: shut down and exit the Pebble daemon (with exit code 11)
  - `success-shutdown`: shut down and exit Pebble with exit code 0
  - `ignore`: do nothing further