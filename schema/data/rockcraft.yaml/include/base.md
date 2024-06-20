``base``
--------

**Type**: One of ``ubuntu@20.04 | ubuntu@22.04 | ubuntu@24.04 | bare``

**Required**: Yes

The base system image that the rock's contents will be layered on. This is also
the system that will be mounted and made available when using Overlays. The
special value ``bare`` means that the rock will have no base system at all,
which is typically used with static binaries or
[Chisel slices](https://canonical-rockcraft.readthedocs-hosted.com/en/latest/explanation/chisel/#chisel-explanation).

> The notation "ubuntu:<channel>" is also supported for some channels, but this
> format is deprecated and should be avoided.
