const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
// const SemiWebpackPlugin = require('@douyinfe/semi-webpack-plugin').default; // 已移除Semi Design
const PATHS = {
    app: path.join(__dirname, 'client/src'),
    build: path.join(__dirname, 'client/build')
};

module.exports = {
    mode: "development",
    context: __dirname,
    devtool: 'source-map',
    watchOptions: {
        // Resolver ancestor watches can reach a Windows drive root. These
        // system directories are unrelated to the app and reject lstat.
        ignored: /(?:^|[\\/])(?:System Volume Information|\$RECYCLE\.BIN|\.svn)(?:[\\/]|$)/i,
    },
    devServer: {
        historyApiFallback: true,
        // 为 MicroApp 配置跨域
        // 'Access-Control-Allow-Origin': '*',
        // allowedHosts: ['127.0.0.1:5100'],
    },
    entry: {
        app: ["@babel/polyfill", PATHS.app]
    },
    output: {
        publicPath: '/client/build/',
        path: PATHS.build,
        filename: '[name].js'
    },
    resolve: {
        modules: [path.resolve(__dirname, 'client/src'), path.resolve(__dirname, 'node_modules')],
        extensions: ['.js', '.jsx'],
        alias: {
            crypto: false,
            $utils: path.resolve(__dirname, 'client/src/utils/'),
            $components: path.resolve(__dirname, 'client/src/components/'),
        }
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new BundleAnalyzerPlugin({
            analyzerPort: 8600,
        }),
        // new SemiWebpackPlugin({ // 已移除Semi Design
        //     theme: {
        //         name: '@semi-bot/semi-theme-fscamera',
        //         include: '~@semi-bot/semi-theme-fscamera/scss/local.scss'
        //     }
        // }),
    ],
    module: {
        rules: [{
            test: /\.css$/,
            use: ['style-loader', {
                loader: 'css-loader',
                options: {
                    modules: true
                }
            }]
        },
        {
            test: /\.less$/,
            use: ['style-loader', 'css-loader', {
                loader: 'less-loader',
                options: {
                    lessOptions: {
                        javascriptEnabled: true
                    }
                }
            }]
        },
        {
            test: /\.(scss|sass)$/,
            use: [
              'style-loader', // 将JS字符串生成为style节点
              'css-loader',   // 将CSS转化成CommonJS模块
              {
                loader: 'sass-loader',
                options: {
                  api: 'modern', // 或者 'modern-compiler'
                },
              },
            ]
          },
        {
            test: /\.(js|jsx)$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['@babel/preset-react', { runtime: 'automatic' }],
                        ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }]
                    ],
                    plugins: [
                        require.resolve('./build/peace-antd-compat'),
                        '@babel/plugin-proposal-class-properties',
                        '@babel/plugin-proposal-object-rest-spread',
                        '@babel/plugin-syntax-jsx'
                    ]
                }
            },
            include: [PATHS.app, path.resolve(__dirname, 'node_modules', '@peace')],
        },
        {
            test: /\.(eot|woff|woff2|svg|ttf)([\?]?.*)$/,
            loader: "file-loader"
        }
        ]
    }
};
