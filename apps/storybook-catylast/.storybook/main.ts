import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(ts|tsx)",
    "../../../packages/**/src/**/*.mdx",
    "../../../packages/**/src/**/*.stories.@(ts|tsx)",
  ],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
  viteFinal: async (viteConfig) => {
    const { vanillaExtractPlugin } = await import(
      "@vanilla-extract/vite-plugin"
    );
    viteConfig.plugins = [...(viteConfig.plugins ?? []), vanillaExtractPlugin()];
    return viteConfig;
  },
};

export default config;
