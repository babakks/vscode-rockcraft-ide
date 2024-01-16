**(Optional)**

**Type:** duration string (e.g., `100ms`, `10s`, `1m`)

If this time elapses before a single check operation has
finished, it is cancelled and considered an error. Must be less
than the `period`, and must not be zero. Default is "3s".