organize
--------
**Type:** ordered dictionary mapping strings to strings

**Step:** stage

Describes how files in the building area should be represented in the staging
area.

In the following example, the ``hello.py`` file in the build area is copied
to the ``bin`` directory in the staging area and renamed to ``hello``:

```yaml
organize:
 hello.py: bin/hello
```