``environment``
---------------

**Type**: dict

**Required**: No

A set of key-value pairs specifying the environment variables to be added
to the base image's OCI environment.

> String interpolation is not yet supported so any attempts to dynamically
> define environment variables with ``$`` will end in a project
> validation error.