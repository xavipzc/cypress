/* eslint-disable arrow-body-style */

const la = require('lazy-ass')
const fs = require('fs-extra')
const _ = require('lodash')
const glob = require('glob')
const chalk = require('chalk').default
const Promise = require('bluebird')
const { stripIndent } = require('common-tags')

const globAsync = Promise.promisify(glob)

const testStaticAssets = async (buildResourcePath) => {
  await Promise.all([
    testPackageStaticAssets({
      assetGlob: `${buildResourcePath}/packages/runner/dist/*.js`,
      badStrings: [
        // should only exist during development
        'webpack-livereload-plugin',
        // indicates eval source maps were included, which cause crossorigin errors
        '//# sourceURL=cypress://',
      ],
      goodStrings: [
        // indicates inline source maps were included
        '//# sourceMappingURL=data:application/json;charset=utf-8;base64',
      ],
      minLineCount: 5000,
    }),
    testPackageStaticAssets({
      assetGlob: `${buildResourcePath}/packages/runner/dist/reporter.css`,
      goodStrings: [
        // indicates css autoprefixer is correctly appending vendor prefixes (e.g -moz-touch)
        ['-ms-', 20],
      ],
    }),

    testPackageStaticAssets({
      assetGlob: `${buildResourcePath}/packages/desktop-gui/dist/index.html`,
      goodStrings: [
        // we're not setting NODE_ENV to production for some reason
        // TODO: probably change this by using the build-prod script
        'window.env = \'development\'',
      ],
    }),
  ])
}

const testPackageStaticAssets = async (options = {}) => {
  la(options.assetGlob, 'missing resourcePath')
  const opts = _.defaults(options, {
    assetGlob: '',
    goodStrings: [],
    badStrings: [],
    minLineCount: 0,
  })

  const foundAssets = await globAsync(opts.assetGlob)
  .map(async (path) => {
    const fileStr = (await fs.readFile(path)).toString()

    opts.goodStrings.forEach((str) => {
      const [passed, count, atLeast] = includesString(fileStr, str)

      la(passed, stripIndent`
      Error in ${path}: expected to find at least ${atLeast} strings of ${chalk.bold(str)}
      contained: ${count}
    `)

    })
    opts.badStrings.forEach((str) => {
      const [passed, count, atLeast] = includesString(fileStr, str)

      la(!passed, stripIndent`
        Error in ${path}: expected ${chalk.bold('not')} to find more than ${atLeast - 1} strings of ${chalk.bold(str)}
        contained: ${count}
      `)
    })

    if (opts.minLineCount) {
      const lineCount = (fileStr.match(/\n/g) || '').length + 1

      la(lineCount > opts.minLineCount, stripIndent`
      Error in ${chalk.red(path)}: Detected this file was minified, having fewer than ${opts.minLineCount} lines of code.
      Minified code takes longer to inspect in browser Devtools, so we should leave it un-minified.
      `)
    }

    return path
  })

  la(!!foundAssets.length, stripIndent`
  expected assets to be found in ${chalk.green(opts.assetGlob)}
  `)

}

module.exports = {
  testStaticAssets,
  testPackageStaticAssets,
}

function includesCount (string, subString) {

  string += ''
  subString += ''
  if (subString.length <= 0) return (string.length + 1)

  let n = 0
  let pos = 0
  let step = subString.length

  // eslint-disable-next-line
  while (true) {
    pos = string.indexOf(subString, pos)
    if (pos >= 0) {
      ++n
      pos += step
    } else {
      break
    }
  }

  return n
}

const includesString = (fileStr, options) => {
  const opts = _.isArray(options) ? options : [options, 1]

  const [substr, atLeast] = opts

  const count = includesCount(fileStr, substr)

  const passed = count >= atLeast

  return [passed, count, atLeast]

}