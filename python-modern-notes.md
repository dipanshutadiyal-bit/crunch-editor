# Modern Python Support Notes

Crunch's modern syntax completion update is based on the current official Python documentation.

Python 3.15 is the latest stable Python release listed by python.org at the time of this update. Python 3.15 adds explicit lazy imports through the `lazy` soft keyword, `frozendict`, a `sentinel` built-in, unpacking in comprehensions, and additional typing and standard-library updates. Python 3.14 adds template string literals using the `t` prefix and related `string.templatelib` support.

Crunch now suggests the `lazy` soft keyword, modern built-ins such as `frozendict` and `sentinel`, and modules such as `annotationlib`, `string.templatelib`, `compression`, and `compression.zstd`. The editor labels this as Python 3.15 syntax. The local execution environment remains Python 3.12.3, so modern syntax completion and local execution are intentionally represented separately.

Sources:
- https://www.python.org/downloads/
- https://docs.python.org/3/whatsnew/3.15.html
- https://docs.python.org/3/whatsnew/3.14.html
- https://peps.python.org/pep-0810/
