const ClosurePlugin = require('closure-webpack-plugin');

module.exports = {
    optimization: {
        minimizer: [
            new ClosurePlugin({
                platform: "native",
                mode: 'AGGRESSIVE_BUNDLE'
            }, {
                // compiler flags here
                //
                // for debugging help, try these:
                //
                // formatting: 'PRETTY_PRINT'
                // debug: true,
                // renaming: false
            })
        ]
    }
};