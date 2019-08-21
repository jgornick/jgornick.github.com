---
title: "How to test and wait for React async events"
date: 2019-08-21T15:07:19-05:00
tags: []
categories: []
---

If you are trying to [`simulate`](https://airbnb.io/enzyme/docs/api/ShallowWrapper/simulate.html) an event on a React component, and that event's handler is an `async` method, it's not clear how to wait for the handler to finish before making any assertions.

Initially, one would think that because `simulate` simply calls the prop on the component, that it would return the result from the handler. However, `simulate` returns the `Wrapper` instance for continued chaining.

After doing some initial searches, a couple of proposed approaches would be to wait for the event loop to finish with the async event hander:

[Simulate events returning promises?](https://github.com/airbnb/enzyme/issues/823#issuecomment-384401360)

```typescript
it('...', () => {
    wrapper.find('...').simulate('change')

    setImmediate(() => {
        wrapper.update()
        expect(...).toBe(...)
    })
})
```

[Wes Bos Tweet for Simulating Async Events](https://twitter.com/wesbos/status/973646077802041345)

```typescript
it('...', async () => {
  wrapper.find(...).simulate('change')

  await new Promise(setImmediate)

  expect(...).toBe(...)
})
```

Another approach is to use Jest's [timer mocks](https://jestjs.io/docs/en/timer-mocks.html):

```typescript
it('...', () => {
  jest.useFakeTimers()

  wrapper.find(...).simulate('change')

  jest.runAllTimers()

  expect(...).toBe(...)
})
```

A solution that seemed to be a little more in line with existing testing patterns is to [`spyOn`](https://jestjs.io/docs/en/jest-object#jestspyonobject-methodname) the handler in the React component and wait for it to resolve:


```typescript
const waitForSpy = async (spy: jest.SpyInstance<Promise<unknown>>) => {
  expect(spy).toHaveBeenCalledTimes(1)
  await spy.mock.instances[0]
}

it('...', async () => {
  const spy = jest.spyOn(wrapper.instance(), 'handleChange')

  wrapper.find(...).simulate('change')

  await waitForSpy(spy)

  expect(...).toBe(...)
}

```

The `waitForSpy` method first expects the spy to have been called at least once. This allows the next line to safely run waiting for the mocked instance returned `Promise` to resolve.
