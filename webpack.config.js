const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    main: './public/js/main.js',
    auth: './public/js/auth.js',
    api: './public/js/api.js',
    chatbot: './public/js/chatbot.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'public/dist'),
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
    splitChunks: {
      chunks: 'all',
      name: 'vendor'
    }
  },
  performance: {
    hints: false
  }
};