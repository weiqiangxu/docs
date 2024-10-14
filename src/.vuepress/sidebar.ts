import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    {
      text: "Linux",
      icon: "laptop-code",
      prefix: "demo/",
      link: "demo/",
      children: "structure",
      collapsible: true,
      expanded: false
    },
    {
      text: "文章",
      icon: "book",
      prefix: "posts/",
      children: "structure",
      collapsible: true
    },
    "intro"
  ],
});
