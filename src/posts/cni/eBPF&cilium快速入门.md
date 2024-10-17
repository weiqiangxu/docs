---
title: eBPF&cilium快速入门
index_img: /images/bg/network.png
banner_img: /images/bg/5.jpg
tags:
  - ebpf
categories:
  - kubernetes
date: 2023-07-05 18:40:12
excerpt: 搭建集群使用cilium作为网络解决方案，理解eBPF在其中充当的角色、传统flannel下的集群的优缺点
sticky: 1
---

### 一、概念

eBPF（extended Berkeley Packet Filter）是一种在Linux内核中实现的虚拟机技术

### 二、尝试cilium

``` bash
# 安装Cilium CLI

CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/master/stable.txt)
CLI_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then CLI_ARCH=arm64; fi
curl -L --fail --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
sha256sum --check cilium-linux-${CLI_ARCH}.tar.gz.sha256sum
sudo tar xzvfC cilium-linux-${CLI_ARCH}.tar.gz /usr/local/bin
rm cilium-linux-${CLI_ARCH}.tar.gz{,.sha256sum}
```

``` bash
# 安装Cilium

cilium install

# 验证安装
cilium status --wait

# 验证链接
cilium connectivity test
```

### Q&A

###### 1.Cilium 比 flannel 好在哪儿

Cilium和Flannel是Kubernetes集群中常用的两种网络插件，它们各自有着不同的特点和优势。

1. 性能：Cilium在性能方面表现更好。它使用Linux内核中的eBPF技术，实现了高性能的网络转发和安全功能。相比之下，Flannel使用传统的overlay网络技术，在大规模集群中可能会有性能瓶颈。

2. 安全性：Cilium提供了更强大的网络安全功能。它可以通过定义丰富的网络策略，对容器之间的通信进行细粒度的控制和保护，包括L3/L4层的过滤规则、应用层的协议解析和控制等。而Flannel则主要集中在网络互联的功能，安全性方面的支持相对较弱。

3. 可观测性：Cilium提供了更丰富的可观测性功能。它可以生成详细的网络流量日志，并提供基于时间序列的指标监控。这些功能对于排查网络问题和性能优化非常有帮助。Flannel则相对简单，提供的可观测性功能较为有限。

综上所述，Cilium相对于Flannel在性能、安全性和可观测性方面都有着更好的表现。但需要注意的是，选择网络插件应该根据具体需求和环境条件进行评估和权衡。


##### 2.网络的L3/L4层是什么意思

L3和L4层是网络通信中的两个不同层次。
L3层，也称为网络层，是OSI（开放系统互联）模型中的第三层。它负责在不同网络之间进行数据包的路由和转发。L3层主要使用IP协议，通过IP地址来标识和寻址不同的主机和网络。
L4层，也称为传输层，是OSI模型中的第四层。它负责在源主机和目标主机之间提供端到端的数据传输控制和管理。L4层主要使用传输层协议（如TCP、UDP）来实现数据分段、可靠性控制、连接管理等功能。
在网络安全领域，L3/L4层通常被用于网络策略和防火墙规则的制定。通过在L3/L4层对网络数据包进行过滤和控制，可以实现对网络流量的分类、限制和保护。例如，可以根据源IP地址、目标IP地址、端口号等信息来定义规则，限制特定的网络通信或阻止潜在的恶意流量。

### 相关文档

[https://ebpf.io/what-is-ebpf/](https://ebpf.io/what-is-ebpf/)
[BPF（Berkeley Packet Filter）](https://www.kernel.org/doc/html/latest/bpf/index.html)
[Cilium作为K8s网络的解决方案](https://mp.weixin.qq.com/s/WHoSyXMiaazxPhN9LXiwHg)
[CNI基准：了解Cilium网络性能](https://cilium.io/blog/2021/05/11/cni-benchmark/)
[https://docs.cilium.io/en/stable/](https://docs.cilium.io/en/stable/)
[使用 eBPF 技术实现更快的网络数据包传输](https://atbug.com/accelerate-network-packets-transmission/)
[追踪 Kubernetes 中的数据包 - 宝藏博主](https://atbug.com/tracing-network-packets-in-kubernetes/)