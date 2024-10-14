import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  lang: "zh-CN",
  title: "QuickStart程序员",
  description: "这是一个笔记本",

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
