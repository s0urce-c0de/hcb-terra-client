import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: 'development',
  entry: {
    main: './src/main.js',
    colyseus: '@colyseus/sdk'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    clean: true,
  },
  devtool: 'source-map',
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          sourceMap: true,
          keep_classnames: true, 
          keep_fnames: true,
        },
      }),
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],
  devServer: {
    proxy: [
      {
        context: (pathname) => {
          if (pathname === '/ws'||pathname.endsWith('.js')||pathname.endsWith('.ico'))return false;

          return true;
        },
        target: 'https://game.terra.hackclub.com/',
        changeOrigin: true,
        secure: true,
        ws: true,
      },
    ],
  }
};