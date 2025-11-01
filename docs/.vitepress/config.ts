import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Envi",
  description:
    "Environment file management tool - Capture, store, and restore .env files across your projects",
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "Commands", link: "/commands/capture" },
      { text: "API", link: "/api/reference" },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is Envi?", link: "/" },
          { text: "Getting Started", link: "/getting-started" },
        ],
      },
      {
        text: "Commands",
        items: [
          { text: "capture", link: "/commands/capture" },
          { text: "restore", link: "/commands/restore" },
          { text: "global", link: "/commands/global" },
        ],
      },
      {
        text: "Guides",
        items: [
          { text: "GitHub Integration", link: "/guides/github-integration" },
          { text: "Using with Monorepos", link: "/guides/monorepo" },
        ],
      },
      {
        text: "Reference",
        items: [{ text: "API Reference", link: "/api/reference" }],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/codecompose/envi" },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2025",
    },
  },
});
