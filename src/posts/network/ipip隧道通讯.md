---
title: ipip隧道通讯
tags:
  - network
categories:
  - network
---


### 一、概念

1. IP 隧道

Linux 原生支持多种三层隧道，其底层实现原理都是基于 tun 设备。

``` bash
# 查看tunnel操作指引
ip tunnel help
[ mode { ipip | gre | sit | isatap | vti } ] [ remote ADDR ] [ local ADDR ]
```

2. Linux 原生一共支持 5 种 IP 隧道。

- ipip：即 IPv4 in IPv4，在 IPv4 报文的基础上再封装一个 IPv4 报文。
- gre：即通用路由封装（Generic Routing Encapsulation），定义了在任意一种网络层协议上封装其他任意一种网络层协议的机制，IPv4 和 IPv6 都适用。
- sit：和 ipip 类似，不同的是 sit 是用 IPv4 报文封装 IPv6 报文，即 IPv6 over IPv4。
- isatap：即站内自动隧道寻址协议（Intra-Site Automatic Tunnel Addressing Protocol），和 sit 类似，也是用于 IPv6 的隧道封装。
- vti：即虚拟隧道接口（Virtual Tunnel Interface），是 cisco 提出的一种 IPsec 隧道技术。

### 二、初始化环境

``` bash
yum install -y bridge-utils
ip netns add container1
ip netns add container2
ip netns list
ip link add veth1 type veth peer name veth2
ip link add veth3 type veth peer name veth4
ip link set veth2 netns container1
ip link set veth4 netns container2
ip netns exec container1 ip addr add 10.1.1.5/24 dev veth2
ip netns exec container1 ip link set veth2 up
ip netns exec container1 ip route add default via 10.1.1.1
ip netns exec container2 ip addr add 10.1.1.7/24 dev veth4
ip netns exec container2 ip link set veth4 up
ip netns exec container2 ip route add default via 10.1.1.1
brctl addbr br-link
brctl addif br-link veth1
brctl addif br-link veth3
ip link set veth1 up
ip link set veth3 up
ip addr add 10.1.1.1/24 dev br-link
ip link set br-link up
```

``` bash
# 验证环境已经配置好
# 检查ipv4转发
sysctl net.ipv4.ip_forward

# 打开ipv4转发
sysctl -w net.ipv4.ip_forward=1

# 测试容器之间网络互通
# ip netns exec container1 ping <宿主机eth0>
ip netns exec container1 ping 10.0.8.4

# ip netns exec container1 ping <同交换机switch\bridge网段容器ip>
ip netns exec container1 ping 10.1.1.7
```

``` bash
# 加载内核模块
modprobe ipip
lsmod | grep ipip
```

### 三、配置TUN的IP隧道

``` bash
ip netns exec container1 ip tunnel add tun1 mode ipip remote 10.1.1.7 local 10.1.1.5

ip netns exec container1 ip link set dev tun1 up

ip netns exec container1 ip addr add 172.16.0.6 peer 172.16.0.8 dev tun1
```

``` bash
ip netns exec container2 ip tunnel add tun2 mode ipip remote 10.1.1.5 local 10.1.1.7

ip netns exec container2 ip link set dev tun2 up

ip netns exec container2 ip addr add 172.16.0.8 peer 172.16.0.6 dev tun2
```

``` bash
# 测试
ip netns exec container1 ping 172.16.0.8 -c 3
```

> 通过TUN的IP隧道，在物理网络上构建一条加密隧道。


### 相关疑问

- ip route 操作
- 
``` bash
# 查看ip route
ip netns exec container1 ip route
# 清除ip route
ip netns exec container1 ip route help
ip netns exec container1 ip route del <router>
```

### 相关文档

- [什么是 IP 隧道，Linux 怎么实现隧道通信？](https://cloud.tencent.com/developer/article/1432489)
- [揭秘 IPIP 隧道](https://morven.life/posts/networking-3-ipip/)