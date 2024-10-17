---
title: openvswitch隧道GRE&VXLAN
index_img: /images/bg/network.png
banner_img: /images/bg/5.jpg
tags:
  - GRE
  - VXLAN
categories:
  - kubernetes
date: 2023-04-23 18:40:12
excerpt: openvswitch的gre隧道\xxlan隧道，隧道技术的应用
sticky: 1
---


1. 准备linux环境

- [openvswitch如何安装](https://weiqiangxu.github.io/2023/06/02/cni/openvswitch%E5%AE%89%E8%A3%85/)
- [docker离线安装](https://weiqiangxu.github.io/2023/04/18/%E8%AF%AD%E9%9B%80k8s%E5%9F%BA%E7%A1%80%E5%85%A5%E9%97%A8/docker%E7%A6%BB%E7%BA%BF%E5%AE%89%E8%A3%85/)也可以直接使用yum等包管理工具在线安装


2. host1 (ip 10.16.203.35)

``` bash
$ systemctl stop firewalld
$ ovs-vsctl add-br ovs-test-br1
$ ifconfig ovs-test-br1 192.168.4.10/24 up
$ ip route
```

3. host2 (ip 10.16.203.32)

``` bash
$ systemctl stop firewalld
$ ovs-vsctl add-br ovs-test-br1
$ ifconfig ovs-test-br1 192.168.4.11/24 up
$ ip route
```

4. host1 ping host2

``` bash
$ ping 192.168.4.11
```

5. 建设GRE隧道

``` bash
# host1
$ ovs-vsctl add-port ovs-test-br1 gre1 -- set interface gre1 type=gre option:remote_ip=10.16.203.32
$ ovs-vsctl show
```

``` bash
# host2
$ ovs-vsctl add-port ovs-test-br1 gre1 -- set interface gre1 type=gre option:remote_ip=10.16.203.35
$ ovs-vsctl show
```

6. host1 ping host2

``` bash
# host1
# 此时可以通讯
$ ping 192.168.4.11
```

``` bash
# host1
$ ovs-vsctl del-port ovs-test-br1 gre1
# host2 
$ ovs-vsctl del-port ovs-test-br1 gre1
$ ovs-vsctl show
# host1 ping host2 
# 此时已经无法通讯
$ ping 192.168.4.11
```

7. 建设VXLAN隧道

``` bash
# host1
ovs-vsctl add-port ovs-test-br1 vxlan1 -- set Interface vxlan1 type=vxlan options:remote_ip=10.16.203.32

# host2
ovs-vsctl add-port ovs-test-br1 vxlan1 -- set Interface vxlan1 type=vxlan options:remote_ip=10.16.203.35

# host1 
# 此时可以通讯
$ ping 192.168.4.11
```

### Q&A

##### 1.如何删除下面的所有关于 ovs-test-br0的路由规则

``` bash
$ ip route

default via 10.16.207.254 dev br-ext
10.16.200.0/21 dev br-ext proto kernel scope link src 10.16.203.160
169.254.0.0/16 dev br-ext scope link
192.168.4.0/24 dev ovs-test-br0 proto kernel scope link src 192.168.4.10
192.168.5.0/24 dev ovs-test-br1 proto kernel scope link src 192.168.5.23
192.168.122.0/24 dev virbr0 proto kernel scope link src 192.168.122.1 linkdown

# 注意删除规则是: ip route delete <route> 
# <route>指要删除的路由。该命令用于删除一个已存在的路由
# 192.168.4.0/24 dev ovs-test-br0 就是<route>
$  ip route delete 192.168.4.0/24 dev ovs-test-br0
```

##### 2.route add default gw 192.168.5.1 dev ovs-test-br1 和 route add 192.168.5.1 dev ovs-test-br1有什么区别

   route add default gw 192.168.5.1 dev ovs-test-br1 是将默认路由设置为通过 ovs-test-br1 网桥连接至 192.168.5.1 网关，所有未知目标 IP 地址的流量都将通过该网关路由出去。
   route add 192.168.5.1 dev ovs-test-br1 是将指定 IP 地址 192.168.5.1 的路由设置为通过 ovs-test-br1 网桥连接，所有目标为该 IP 地址的流量将通过该网桥路由出去。
   两者的区别在于默认路由是指定了所有未知目标 IP 地址的流量都将通过该网关路由出去，而指定一个具体的 IP 地址的路由则只会影响到指定的 IP 地址的流量。


##### 3.什么是网络出现了环

   网络出现了环指网络拓扑中出现了连接成环状的情况。
   在一个网络中，环路会导致数据包在网络中无限循环，造成网络拥塞和性能下降。
   拓扑图是`1 -> 2 -> 3 -> 5 -> 4 -> 1`表示出现了环。


##### 4. ovs-vsctl set bridge ${br_name} stp_enable=true

   这句命令是用来设置 Open vSwitch 网桥的 Spanning Tree Protocol (STP) 功能是否启用。
   STP 是一种用于在拓扑结构中防止环路出现的协议。当多个交换机互连形成网络时，可能会出现环路，导致网络出现广播风暴等问题。为了避免这种情况，可以使用 STP 协议计算出一个最佳拓扑结构，并通过阻塞某些端口来避免环路的产生。
   该命令中的 `${br_name}` 是要设置的网桥的名称。将 `stp_enable` 参数设置为 `true`，表示启用 STP 功能。如果该参数设置为 `false`，则表示禁用 STP 功能。