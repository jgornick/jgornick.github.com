---
title: "Publish a scoped package to a custom registry"
date: 2019-05-01T20:57:27-05:00
draft: false
tags: [npm]
categories: []
---

When publishing a npm package, npm will use your [configuration sources](https://docs.npmjs.com/misc/config) for a destination registry. npm also provides an ability to override configuration via the [`publishConfig`](https://docs.npmjs.com/files/package.json#publishconfig) field in `package.json`.

If your package is non-scoped, then you can override the publish npm registry:

```json
{
  "publishConfig": {
    "registry": "https://npm.joegornick.com"
  }
}
```

However, if your package is [**scoped**](https://docs.npmjs.com/misc/scope), then there's an [undocumented ability to override the publish npm registry](https://github.com/npm/npm/issues/10117#issuecomment-209732223) by prefixing `registry` with the `@scope`:

```json
{
  "publishConfig": {
    "@foo:registry": "https://npm.foo.com"
  }
}
```

## References

[No way to override registry in .npmrc for scoped packages w/--registry flag](https://github.com/npm/npm/issues/10117#)
