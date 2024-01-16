**(Optional)**

**Type:** duration string (e.g., `100ms`, `10s`, `1m`)

Limit for the backoff delay: when multiplying by
`backoff-factor` to get the next backoff delay, if the result is
greater than this value, it is capped to this value. Default is
half a minute ("30s").