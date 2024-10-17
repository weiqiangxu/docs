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
    {
      text: "Docker",
      icon: "book",
      prefix: "posts/docker/",
      children: "structure",
      collapsible: true
    },
    {
      text: "网络",
      icon: "book",
      prefix: "posts/network/",
      children: "structure",
      collapsible: true
    },

    "intro"
  ],
});
