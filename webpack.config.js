const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  // Entry point of your application
  entry: './src/main.js',
  mode: 'development',

  // Output configuration for Webpack
  output: {
    // Output directory as an absolute path
    path: path.resolve(__dirname, 'public/dist'),
    // Filename of the bundled file
    filename: 'bundle.js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // path to your original index.html
      filename: 'index.html' // name of the file to be created in dist
    })
    // ... any other plugins you are using
  ],
  // Loaders and plugins configuration would go here
  module: {
    rules: [
      // ... other rules ...

      // Rule for CSS files
      {
        test: /\.css$/, // Targets all .css files
        use: [
          'style-loader', // Injects CSS into the DOM
          'css-loader'    // Resolves @import and url() in your CSS
        ]
      }
    ]
  },

  // Development tools (source maps, etc.)
  devtool: 'inline-source-map',

  // Development server configuration
  devServer: {
    // The directory where webpack-dev-server will serve files from
    static: path.join(__dirname, 'public'),
    // Specify the port on which the server will listen
    port: 3000
  }
};
