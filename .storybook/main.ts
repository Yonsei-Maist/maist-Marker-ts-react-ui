import type { StorybookConfig } from "@storybook/react-webpack5";
import webpack from 'webpack';
const path = require('path');

const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    addons: [
        "@storybook/addon-webpack5-compiler-swc",
        "@storybook/addon-onboarding",
        "@storybook/addon-links",
        "@storybook/addon-essentials",
        "@chromatic-com/storybook",
        "@storybook/addon-interactions",
    ],
    framework: {
        name: "@storybook/react-webpack5",
        options: {},
    },
    webpackFinal: async (config) => {
        let custom_plugins = [
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
            }),
            new webpack.ProvidePlugin({
                process: 'process/browser',
            })
        ]

        if (config.plugins) {
            config.plugins = config.plugins.concat(custom_plugins)
        } else {
            config.plugins = custom_plugins
        }
        if (config.resolve) {

            config.resolve.alias = {
                ...(config.resolve.alias || {}),
                '@': path.resolve(__dirname, '../core/src')
            };
        }

        return {
            ...config,
            resolve: {
                ...config.resolve,
                fallback: {
                    ...config.resolve?.fallback,
                    "stream": require.resolve("stream-browserify"),
                    "buffer": require.resolve("buffer/")
                }
            }
        }
    },
};
export default config;
