---
title: kube-proxy设计与实现
tags:
  - kubernetes
categories:
  - kubernetes
---

> 理解kube-proxy在Flannel网络之中充当什么角色，底层的负载均衡算法是如何实现，相关的Service如何使用该插件的。

### 相关文档

- [一文看懂 Kube-proxy](https://zhuanlan.zhihu.com/p/337806843)