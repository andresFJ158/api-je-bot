const webpack = require('webpack');
const path = require('path');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: {
      'bcrypt': 'commonjs bcrypt',
      '@mapbox/node-pre-gyp': 'commonjs @mapbox/node-pre-gyp',
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        resourceRegExp: /^(mock-aws-s3|aws-sdk|nock)$/,
      }),
    ],
  };
};

