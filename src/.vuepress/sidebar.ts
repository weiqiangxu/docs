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
      text: "prometheus",
      icon: "book",
      prefix: "posts/prometheus/",
      children: "structure",
      collapsible: true
    },
    {
      text: "java",
      icon: "book",
      prefix: "posts/java/",
      children: "structure",
      collapsible: true
    },
    {
      text: "Etcd",
      icon: "book",
      prefix: "posts/etcd/",
      children: "structure",
      collapsible: true
    },
    {
      text: "Nginx",
      icon: "book",
      prefix: "posts/nginx/",
      children: "structure",
      collapsible: true
    },
    {
      text: "Kubernetes",
      icon: "book",
      prefix: "posts/kubernetes/",
      children: "structure",
      collapsible: true
    },
    {
      text: "Network",
      icon: "book",
      prefix: "posts/network/",
      children: "structure",
      collapsible: true
    },
    {
      text: "Git",
      icon: "book",
      prefix: "posts/git/",
      children: "structure",
      collapsible: true
    },
    "intro"
  ],
});
