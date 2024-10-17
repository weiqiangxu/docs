---
title: 如何使用GRE隧道通信
index_img: /images/bg/network.png
banner_img: /images/bg/computer.jpeg
tags:
  - network
categories:
  - network
date: 2023-07-06 18:40:12
excerpt: 部署多个网络命名空间并使用GRE隧道通讯
sticky: 1
hide: false
---

### 一、概念

1. 什么是VXLAN

一种网络虚拟化技术

2. GRE隧道是什么

一种隧道协议。（将原始的数据包封装在一个新的IP头中实现跨越多个网络端口传输）

3. 两者之间的关系是什么

在VXLAN网络中，通过使用GRE隧道技术可以实现虚拟网络之间的隔离。

4. 原理

GRE协议将原始的数据包封装在一个新的IP头中，使得数据包能够跨越多个网络端口传输。（借助IP协议中的IP数据报文来传输数据）



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

### 三、配置GRE隧道

``` bash
# ip tunnel add gre1 mode gre remote <B的IP地址> local <A的IP地址> ttl 255
ip netns exec container1 ip tunnel add gre1 mode gre remote 10.1.1.7 local 10.1.1.5 ttl 255

ip netns exec container1 ip link set gre1 up

# ip netns exec container1 ip addr add <A的隧道IP地址>/24 dev gre1
ip netns exec container1 ip addr add 172.16.0.2/24 dev gre1
```

``` bash
# ip tunnel add gre1 mode gre remote <A的IP地址> local <B的IP地址> ttl 255
ip netns exec container2 ip tunnel add gre1 mode gre remote 10.1.1.5 local 10.1.1.7 ttl 255

ip netns exec container2 ip link set gre1 up

# ip addr add <B的隧道IP地址>/24 dev gre1
ip netns exec container2 ip addr add 172.16.0.8/24 dev gre1
```

``` bash
# ping <B的隧道IP地址>
# 验证container1和container2之间通讯
ip netns exec container1 ping 172.16.0.8
```

> 通过GRE隧道，计算机A和B可以在公网上建立一个私有网络，安全地进行通信。注意要配置正确的IP地址和子网掩码，以及在防火墙中允许GRE流量通过。


### 相关文档

[https://cizixs.com/2017/09/28/linux-vxlan/](https://cizixs.com/2017/09/28/linux-vxlan/)