**(Optional)**

**Type:** string

Run the command in the context of this service.
Specifically, inherit its environment variables, user/group
settings, and working directory. The check's context (the
settings in this section) will override the service's; the check's
environment map will be merged on top of the service's.