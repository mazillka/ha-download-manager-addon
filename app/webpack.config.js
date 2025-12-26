import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: 'production',
  entry: './frontend/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'frontend/tsconfig.json'),
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist/frontend'),
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "frontend",
          to: ".",
          globOptions: {
            ignore: ["**/*.ts", "**/*.tsx", "**/tsconfig.json", "**/*.css", "**/index.html"],
          },
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './frontend/index.html',
    }),
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    }),
  ],
};