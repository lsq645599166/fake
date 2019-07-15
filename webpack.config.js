const path = require('path');

module.exports = {
  mode: 'production',
  entry: './lib/Terminal.js',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre',
        exclude: /node_modules/
      },
    ],
  },
  resolve: {
    modules: ['./node_modules'],
    extensions: ['.js'],
  },
  output: {
    filename: 'fake.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'Terminal',
    libraryTarget: 'umd'
  },
};
