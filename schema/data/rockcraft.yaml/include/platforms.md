``platforms``
-------------

**Type**: dict

**Required**: Yes

The set of architecture-specific rocks to be built. Supported architectures are:
``amd64``, ``arm64``, ``armhf``, ``i386``, ``ppc64el``, ``riscv64`` and ``s390x``.

Entries in the ``platforms`` dict can be free-form strings, or the name of a
supported architecture (in Debian format).

> **Warning:** **All** target architectures must be compatible with the architecture of
> the host where Rockcraft is being executed (i.e. emulation is not supported
> at the moment).