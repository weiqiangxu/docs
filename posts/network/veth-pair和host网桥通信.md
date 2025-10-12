---
title: veth-pair和host网桥通信
tags:
  - network
categories:
  - network
---

> 使用 host bridge 和 veth pair 实现两个网络命名空间下的网卡通信

### 1.网络命名空间创建

``` bash
$ ip netns list
$ ip netns add ns1
$ ip netns add ns2
```

### 2.创建网桥

``` bash
$ brctl addbr br0
$ brctl show
```

### 3.创建veth pair对

``` bash
$ ip link add veth1 type veth peer name peer-veth1
$ ip link add veth2 type veth peer name peer-veth2
```

### 4.将veth pair对的一端插入网桥br0 

``` bash
$ brctl addif br0 veth1
$ brctl addif br0 veth2i
```

### 5.将veth pair对的另一端插入网络命名空间 ns1 ns2

``` bash
$ ip link set peer-veth1 netns ns1
$ ip link set peer-veth2 netns ns2
```

### 6.分配ip给 ns1 和 ns2 的网卡

``` bash
$ ip netns exec ns1 ip addr add 10.1.1.2/24 dev peer-veth1
$ ip netns exec ns2 ip addr add 10.1.1.3/24 dev peer-veth2
```

### 7.启动所有网桥和网卡

``` bash
$ ip netns exec ns1 ip link set peer-veth1 up
$ ip netns exec ns2 ip link set peer-veth2 up
$ ip link set veth1 up
$ ip link set veth2 up
$ ip link set br0 up
```

### 8.测试网络是否连通

``` bash
$ ip netns exec ns1 ping 10.1.1.3
```

> 结论：可以使用 host 上的网桥和 veth pair 实现两个 network namespace 的连接

### Q&A

##### 1.如何删除网卡和网络命名空间 

``` bash
# 网络命名内部网卡必须全部已经删除否则无法删除该网络命名空间
$ ip netns delete ns1
$ ip netns exec ns1 ip link delete veth1-peer
$ ip link delete veth1-peer
```

##### 2.网络中 10.16.198.8/23 是什么意思

1. 这是一个IP地址和子网掩码的组合，也叫做 CIDR地址 （IP地址和一个斜线后跟一个数字）
2. ip地址是 10.16.198.8，前23位是网络位，剩下的9位是主机位
3. 子网掩码： 255.255.254.0 (前面23位全位1后面23位全为0的值)
3. 主机位：10.16.198.1 ～ 10.16.199.254 （通常主机地址范围是从网络地址加1开始到广播地址减1结束）