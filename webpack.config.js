const path = require('path');

const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const ExtractTextPlugin = require('extract-text-webpack-plugin');

const isDebug = !process.argv.includes('--release');
const isVerbose = process.argv.includes('--verbose');

console.log("isDebug: ", isDebug);
console.log("isVerbose: ",isVerbose);

module.exports = {
    entry: ['./src/main.js', './index.css'],
    output: {
        path: path.resolve(__dirname, './dist'),
        filename: isDebug ? '[name].js' : '[name].[hash].js',
        chunkFilename: isDebug ? '[name].[id].js?[chunkhash]' : '[name].[id].[chunkhash].js',
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
                loader: ExtractTextPlugin.extract({fallback: 'style-loader', use: 'css-loader'}),
            },
            {
                test: /\.jpe?g$|\.gif$|\.png$|\.wav$|\.mp3$/,
                loader: "file-loader"
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2)$/,
                loader: 'file-loader?name=public/fonts/[name].[ext]'
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
        new CopyWebpackPlugin([
            {from: 'audio', to: 'public/audio'}
        ]),

        // new webpack.optimize.OccurrenceOrderPlugin(true),
        //
        // ...isDebug ? [] : [
        //     new webpack.optimize.DedupePlugin(),
        //     new webpack.optimize.UglifyJsPlugin({
        //         compress: {
        //             screw_ie8: true,
        //             warnings: isVerbose,
        //         }
        //     })
        // ],

        new HtmlWebpackPlugin({
            hash: true,
            filename: 'index.html',
            template: __dirname+'/index.html',
            environment: process.env.NODE_ENV
        }),

    ]
};