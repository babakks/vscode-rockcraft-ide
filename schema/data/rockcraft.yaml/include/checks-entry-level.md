**(Optional)**

**Type:** string

**Values:** `alive` | `ready`

Check level, which can be used for filtering checks when
calling the checks API or health endpoint.
For the health endpoint, ready implies alive. In other words, if all
the `ready` checks are succeeding and there are no `alive` checks,
the `/v1/health` API will return success for `level=alive`.