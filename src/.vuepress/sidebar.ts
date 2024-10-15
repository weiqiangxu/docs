import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    "",
    {
      text: "Linux",
      icon: "laptop-code",
      prefix: "posts/linux",
      link: "/posts/linux/常用命令.md",
      children: "structure",
      collapsible: true,
      expanded: false
    },
    {
      text: "Golang",
      icon: "book",
      prefix: "posts/go/",
      children: "structure",
      collapsible: true
    },
    "intro"
  ],
});
