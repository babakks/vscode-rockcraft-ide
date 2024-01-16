``parts``
---------

**Type**: dict

**Required**: Yes

The set of parts that compose the rock's contents
(see [Parts](https://canonical-rockcraft.readthedocs-hosted.com/en/latest/reference/part_properties/#ref-parts)).


> The fields ``entrypoint``, ``cmd`` and ``env`` are not supported in
> Rockcraft. All rocks have Pebble as their entrypoint, and thus you must use
> ``services`` to define your container application.

Summary of keys and steps
-------------------------

The following table shows the keys that are used in each build step.
The ``plugin`` and ``parse-info`` keys apply to all steps.

| Pull              | Build             | Stage          | Prime          |
| ----------------- | ----------------- | -------------- | -------------- |
| source            | after             | stage          | prime          |
| source-checksum   | build-attributes  | stage-snaps    |                |
| source-branch     | build-environment | stage-packages |                |
| source-commit     | build-packages    |                |                |
| source-depth      | build-snaps       |                |                |
| source-submodules | organize          |                |                |
| source-subdir     |                   |                |                |
| source-tag        |                   |                |                |
| source-type       |                   |                |                |
| override-pull     | override-build    | override-stage | override-prime |
