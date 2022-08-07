let path = require('path');

module.exports = {
    "stories": [
        "../src/**/*.stories.mdx",
        "../src/**/*.stories.@(js|jsx|ts|tsx)"
    ],
    "addons": [
        "@storybook/addon-links",
        "@storybook/addon-essentials",
        "@storybook/addon-interactions"
    ],
    "webpackFinal": async (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            'fs': path.resolve(__dirname, 'fsMock.js')
        };

        // Return the altered config
        return config
    },
    "framework": "@storybook/react"
}