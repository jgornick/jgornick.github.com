---
title: "yarn with private npm registries and authentication"
date: 2019-04-15T13:00:06-05:00
tags: [yarn, npm]
categories: []
---

We recently switched over a project from npm to yarn. Our existing project npm configuration (i.e. npmrc) specified private registries with authentication. I assumed that yarn would use existing npm configurations. However, after following [this yarn issue thread](https://github.com/yarnpkg/yarn/issues/4451), **you must have a project yarnrc with the custom registries specified**. Once the registries are defined, the existing npm configurations are used for authentication.

For example, the project folder already had the following `.npmrc`:

```
registry=https://npm.joegornick.com
@foo:registry=https://npm.foo.com

_auth={token}
//npm.foo.com/:_authToken={token}
```

I then added the following `.yarnrc` to the project:

```
registry "https://npm.joegornick.com"
"@foo:registry" "https://npm.foo.com"
```

## References

[yarn does not honor authentication settings in .npmrc](https://github.com/yarnpkg/yarn/issues/4451)
