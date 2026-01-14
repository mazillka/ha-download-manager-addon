import path from "path";
import { fileURLToPath } from "url";
import CopyPlugin from "copy-webpack-plugin";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { VueLoaderPlugin } from "vue-loader";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: "production",
  entry: "./frontend/main.ts",

  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: "vue-loader",
      },
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            appendTsSuffixTo: [/\.vue$/],
            configFile: path.resolve(__dirname, "tsconfig.json"),
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
    extensions: [".tsx", ".ts", ".js", ".vue"],
    alias: {
      vue$: "vue/dist/vue.esm-bundler.js",
    },
  },

  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "../dist/frontend"),
    clean: true,
  },

  plugins: [
    new VueLoaderPlugin(),

    new CopyPlugin({
      patterns: [
        {
          from: "frontend",
          to: ".",
          globOptions: {
            ignore: [
              "**/*.ts",
              "**/*.tsx",
              "**/*.vue",
              "**/tsconfig.json",
              "**/*.css",
              "**/index.html",
            ],
          },
        },
      ],
    }),

    new HtmlWebpackPlugin({
      template: "./frontend/index.html",
    }),

    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    }),
  ],
};
