``build-base``
--------------

**Type**: One of ``ubuntu@20.04 | ubuntu@22.04``

**Required**: Yes, if ``base`` is ``bare``

The system and version that will be used during the rock's build, but not
included in the final rock itself. It comprises the set of tools and libraries
that Rockcraft will use when building the rock's contents. This field is
mandatory if ``base`` is ``bare``, but otherwise it is optional and defaults to
the value of ``base``.

> The notation "ubuntu:<channel>" is also supported for some channels, but this
> format is deprecated and should be avoided.