/// <reference path="../../../../../../cli/types/index.d.ts" />
// @ts-check
/* eslint-disable @cypress/dev/skip-comment,mocha/no-exclusive-tests */

const { _ } = Cypress
const _it = it

function overrideIt (fn) {
  it = fn()
  it['only'] = fn('only')
  it['skip'] = fn('skip')
}

overrideIt(function (subFn) {
  return function (...args) {

    const origIt = subFn ? _it[subFn] : _it

    if (args.length > 2 && _.isObject(args[1])) {
      const opts = _.defaults({}, args[1], {
        browsers: '*',
      })

      const mochaArgs = [args[0], args[2]]

      // return origIt.apply(this, mochaArgs)

      if (!shouldRunBrowser(opts.browsers, Cypress.browser.family)) {
        mochaArgs[0] = `[browser skip (${opts.browsers})]${mochaArgs[0]}`

        if (subFn === 'only') {
          mochaArgs[1] = function () {
            // @ts-ignore
            this.skip()
          }

          return origIt.apply(this, mochaArgs)
        }

        return _it['skip'].apply(this, mochaArgs)

      }

      return origIt.apply(this, mochaArgs)
    }

    return origIt.apply(this, args)

  }
})

const shouldRunBrowser = (browserlist, browser) => {

  // return true
  let allEnabled = false
  const exclude = []
  const include = []

  browserlist.split(/\s+,\s+/).forEach((v) => {

    if (v === '*') {
      allEnabled = true

      return
    }

    if (v.includes('!')) {
      allEnabled = true
      exclude.push(v.slice(1))

      return
    }

    include.push(v)
  })

  if (!allEnabled) {
    return include.includes(browser)
  }

  return !exclude.includes(browser)

}

describe('foo', () => {
  it('bar', {
    defaultCommandTimeout: 200,
  }, () => {
    // test body
  })
})

describe('foo', () => {
  it.only('bar', {
    defaultCommandTimeout: 200,
  }, () => {
    // test body

  })
})

describe('foo', () => {
  it.skip('bar', {
    defaultCommandTimeout: 200,
  }, () => {
    // test body
  })
})

describe('foo', {
  defaultCommandTimeout: 200,
}, () => {
  it('bar', {
    defaultCommandTimeout: 200,
  }, () => {
    // test body
  })
})
