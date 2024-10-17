---
title: 如何构建vxlan网络
index_img: /images/bg/network.png
banner_img: /images/bg/computer.jpeg
tags:
  - network
categories:
  - network
date: 2023-08-20 15:40:12
excerpt: 使用network namespace构建vxlan网络
sticky: 1
hide: false
---

### 一、概念

1. 什么是VXLAN

一种网络虚拟化技术。

2. GRE隧道是什么

一种隧道协议，将原始的数据包封装在一个新的IP头中实现跨越多个网络端口传输。

3. 两者之间的关系是什么

在VXLAN网络中，通过使用GRE隧道技术可以实现虚拟网络之间的隔离。

4. 原理

GRE协议将原始的数据包封装在一个新的IP头中，使得数据包能够跨越多个网络端口传输，借助IP协议中的IP数据报文来传输数据。要实现VXLAN网络隔离，需要使用Linux中的网络命名空间来创建多个隔离的虚拟网络环境，并将VXLAN设备连接到相应的命名空间。

### 二、使用vxlan建立点对点通信

![点对点隧道通讯拓扑图](/images/dianduidian.jpeg)

1. 创建两个命名空间通过bridge和veth pair对让其网络可以互相通讯

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

2. 两个容器网络分配vxlan设备

``` bash
# container1
ip netns exec container1 ip link add vxlan0 type vxlan \
    id 42 \
    dstport 4789 \
    remote 10.1.1.7 \
    local 10.1.1.5 \
    dev veth2
ip netns exec container1 ip -d link 
ip netns exec container1 ip addr add 172.1.1.2/24 dev vxlan0
ip netns exec container1 ip link set vxlan0 up

# container2
ip netns exec container2 ip link add vxlan0 type vxlan \
    id 42 \
    dstport 4789 \
    remote 10.1.1.5 \
    local 10.1.1.7 \
    dev veth4
ip netns exec container2 ip -d link 
ip netns exec container2 ip addr add 172.1.1.3/24 dev vxlan0
ip netns exec container2 ip link set vxlan0 up

# ping test
ip netns exec container1 ping 172.1.1.3
```

### 多播vxlan

![多播网络拓扑](/images/duobovxlan.jpeg)

1. 宿主机上创建两个容器网络

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

2. 创建多播组实现多个同组vxlan互相通讯

``` bash
# contianer1
ip netns exec container1 ip link add vxlan0 type vxlan \
    id 42 \
    dstport 4789 \
    group 239.1.1.1 \
    dev veth2
ip netns exec container1 ip -d link 
ip netns exec container1 ip addr add 172.1.1.2/24 dev vxlan0
ip netns exec container1 ip link set vxlan0 up

# container2
ip netns exec container2 ip link add vxlan0 type vxlan \
    id 42 \
    dstport 4789 \
    group 239.1.1.1 \
    dev veth4
ip netns exec container2 ip -d link 
ip netns exec container2 ip addr add 172.1.1.3/24 dev vxlan0
ip netns exec container2 ip link set vxlan0 up

# test
ip netns exec container1 ping 172.1.1.3
```

3. 备注

``` bash
# 如何删除vxlan设备
ip netns exec [namespace] ip link delete [vxlan name]

# 如何查看ip路由
ip netns exec [namespace] ip route

# 查看fdb表
ip netns exec [namespace] bridge fdb
```

#### 三、生产环境下常用的多bridge多vxlan多播网络

其实就是上面的，在一个宿主机上可以建设多个bridge，每个bridge上面负责一个vxlan的网络。

![多VXLAN下面的网络拓扑](/images/duovxlanwangluo.jpeg)

1. 上面添加type vxlan的时候填写的remote最终会配置到 FDB 表之中,这表的VTEP 的地址可以决定arp查找mac地址的数据走向
2. 可以手动维护 fdb 表 `bridge fdb append 52:5e:55:58:9a:ab dev vxlan0 dst 192.168.8.101`
3. 手动维护 ARP 表 `ip neigh add 10.20.1.3 lladdr d6:d9:cd:0a:a4:28 dev vxlan0`


> 主机会根据 VNI 来区别不同的 vxlan 网络，不同的 vxlan 网络之间不会相互影响。如果再加上 network namespace，就能实现更复杂的网络结构。

### 相关文档

- [https://cizixs.com/2017/09/28/linux-vxlan/](https://cizixs.com/2017/09/28/linux-vxlan/)
- [如何利用GRE隧道建立VXLAN](https://www.wxkcg.com/gre/greb74bf1660464437abf112f3752358332)