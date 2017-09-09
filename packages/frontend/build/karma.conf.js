import { argv } from 'yargs'
import _debug from 'debug'
import configGen from '../config'
import webpackConfigGen from '../build/webpack.config'

const config = configGen()
const webpackConfig = webpackConfigGen(config)

const debug = _debug('app:karma')
debug('Create configuration.')

const karmaConfig = {
  basePath: '../',
  files: [
    {
      pattern: `./${config.dir_test}/test-bundler.js`,
      watched: false,
      served: true,
      included: true
    }
  ],
  singleRun: !argv.watch,
  frameworks: ['mocha'],
  reporters: ['mocha'],
  preprocessors: {
    [`${config.dir_test}/test-bundler.js`]: ['webpack']
  },
  browsers: ['Electron'],
  customLaunchers: {
    'PhantomJS_custom': {
      base: 'PhantomJS',
      options: {
        windowName: 'test-window',
        settings: {
          webSecurityEnabled: false
        }
      },
      flags: ['--load-images=true', '--debug=yes'],
      debug: true
    }
  },
  webpack: {
    devtool: 'cheap-module-source-map',
    resolve: {
      ...webpackConfig.resolve,
      alias: {
        ...webpackConfig.resolve.alias,
        sinon: 'sinon/pkg/sinon.js'
      }
    },
    plugins: webpackConfig.plugins,
    module: {
      noParse: [
        /\/sinon\.js/
      ],
      rules: webpackConfig.module.rules.concat([
        {
          test: /sinon(\\|\/)pkg(\\|\/)sinon\.js/,
          loader: 'imports-loader?define=>false,require=>false'
        }
      ])
    },
    // Enzyme fix, see:
    // https://github.com/airbnb/enzyme/issues/47
    externals: {
      ...webpackConfig.externals,
      'react/addons': true,
      'react/lib/ExecutionEnvironment': true,
      'react/lib/ReactContext': 'window'
    },
    sassLoader: webpackConfig.sassLoader
  },
  webpackMiddleware: {
    noInfo: true
  },
  coverageIstanbulReporter: {
    reports: config.coverage_reporters,
    fixWebpackSourcePaths: true
  }
}

if (config.globals.__COVERAGE__) {
  karmaConfig.reporters.push('coverage-istanbul')
  karmaConfig.webpack.module.rules = [{
    test: /\.(js|jsx)$/,
    include: new RegExp(config.dir_client),
    loader: 'istanbul-instrumenter-loader?esModules=true',
    exclude: /(node_modules|tests)/,
    enforce: 'post'
  }]
}

// cannot use `export default` because of Karma.
module.exports = (cfg) => cfg.set(karmaConfig)
