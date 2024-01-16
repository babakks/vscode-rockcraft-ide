**(Required)**

**Type:** string

**Values:** `merge` | `replace`

Control how this check definition is combined with any
other pre-existing definition with the same name in the Pebble plan.
The value `merge` will ensure that values in this layer specification
are merged over existing definitions, whereas `replace` will entirely
override the existing check spec in the plan with the same name.