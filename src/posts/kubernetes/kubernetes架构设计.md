---
title: kubernetes架构设计
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - kubernetes
categories:
  - kubernetes
date: 2023-04-23 18:40:12
excerpt: 架构图解
sticky: 1
hide: false
---

![高级容器运行时](/images/high-OCI.png)

![docker-oci](/images/docker-oci.png)

![docker cri与控制平面](/images/cri-plane.png)

- 拉取镜像 ImageService.PullImage
- 运行容器 RuntimeService.RunPodSandbox
- 创建容器 RuntimeService.CreateContainer
- 启动容器 RuntimeService.StartContainer
- 停止容器 RuntimeService.StopContainer

![containerd发展史](/images/containerd发展史.png)

![kubernetes_diagram-cluster红帽](/images/kubernetes_diagram-cluster.svg)




### 参考文档

[高级容器运行时](https://www.modb.pro/db/407926)
[rehat-k8s的架构设计](https://www.redhat.com/zh/topics/containers/kubernetes-architecture)
[k8s中文社区-k8s的架构设计](https://www.kubernetes.org.cn/kubernetes%e8%ae%be%e8%ae%a1%e6%9e%b6%e6%9e%84)
[k8s中文社区-k8s的设计理念](https://www.kubernetes.org.cn/kubernetes%e8%ae%be%e8%ae%a1%e7%90%86%e5%bf%b5)