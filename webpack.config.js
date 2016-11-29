const path = require('path');

const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');

const combineLoaders = require('webpack-combine-loaders');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const isDebug = !process.argv.includes('--release');
const isVerbose = process.argv.includes('--verbose');

console.log("isDebug: ", isDebug);
console.log("isVerbose: ",isVerbose);

module.exports = {
    //context: path.resolve(__dirname, './src'),
    entry: ['./src/mandelbrot.js', './index.css'],
    output: {
        path: path.resolve(__dirname, './dist'),
        publicPath: './',
        filename: isDebug ? '[name].js' : '[name].[hash].js',
        chunkFilename: isDebug ? '[name].[id].js?[chunkhash]' : '[name].[id].[chunkhash].js',
    },
    target: 'web',
    cache: isDebug,
    debug: isDebug,
    stats: {
        colors: true,
        reasons: isDebug,
        hash: isVerbose,
        version: isVerbose,
        timings: true,
        chunks: isVerbose,
        chunkModules: isVerbose,
        cached: isVerbose,
        cachedAssets: isVerbose,
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /\.js?$/,
                loader: 'babel-loader',
                include: [ path.resolve(__dirname, './src')],
                exclude: '/node_modules/',
                query: {
                    babelrc: false,
                    cacheDirectory: isDebug,
                    presets: ['latest', 'stage-0']
                }
            },
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract('style-loader' ,
                    combineLoaders([
                        {
                            loader: 'css-loader',
                             query: {
                                modules: false,
                                localIdentName: '[name]',
                                //modules: true,
                                //localIdentName: '[name]__local__[hash:base64:5]',
                                exclude: '/node_modules/',
                             }
                         }
                     ])
                )
             },
            {
                test: /\.jpe?g$|\.gif$|\.png$|\.wav$|\.mp3$/,
                loader: "file"
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                loader: 'file?name=public/fonts/[name].[ext]'
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': isDebug ? '"development"' : '"production"',
            //'process.env.BROWSER': true,
            __DEV__: isDebug,

        }),
        new CleanWebpackPlugin(['dist'], {
            root: path.resolve(__dirname, '.'),
            verbose: true,
            dry: false
        }),
        new ExtractTextPlugin('styles.css'),

        new webpack.optimize.OccurrenceOrderPlugin(true),

        ...isDebug ? [] : [
            new webpack.optimize.DedupePlugin(),
            new webpack.optimize.UglifyJsPlugin({
                compress: {
                    screw_ie8: true,
                    warnings: isVerbose,
                }
            })
        ],

        new HtmlWebpackPlugin({
            hash: true,
            filename: 'index.html',
            template: __dirname+'/index.html',
            environment: process.env.NODE_ENV
        }),

        new WebpackBuildNotifierPlugin({
            title: "z2pc",
            logo: path.resolve("./img/favicon.png"),
            suppressSuccess: true
        }),

    ]
};