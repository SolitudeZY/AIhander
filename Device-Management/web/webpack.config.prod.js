var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
// const SemiWebpackPlugin = require('@douyinfe/semi-webpack-plugin').default; // 已移除Semi Design

const PATHS = {
    app: path.join(__dirname, 'client/src'),
    build: path.join(__dirname, 'client/build')
};

module.exports = {
    mode: "production",
    entry: {
        app: ["babel-polyfill", PATHS.app]
    },
    output: {
        path: PATHS.build,
        publicPath: '/build',
        filename: '[name].[hash:5].js'
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
        new HtmlWebpackPlugin({
            filename: '../index.html',
            template: './client/index.ejs'
        }),
        // new SemiWebpackPlugin({ // 已移除Semi Design
        //    theme: {
        //       name: '@semi-bot/semi-theme-fscamera',
        //       include: '~@semi-bot/semi-theme-fscamera/scss/local.scss'
        //   }
        // }),
    ],
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    name: "vendors",
                    chunks: "all"
                }
            }
        }
    },
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
            use: ['style-loader', 'css-loader',
                {
                    loader: 'less-loader', options: {
                        lessOptions: {
                            javascriptEnabled: true
                        }
                    }
                }]
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
        },{
            test: /\.(eot|woff|woff2|svg|ttf)([\?]?.*)$/,
            loader: "file-loader"
        }]
    }
};
