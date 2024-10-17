---
title: openvswitch与环状拓扑
index_img: /images/bg/network.png
banner_img: /images/bg/computer.jpeg
tags:
  - openvswitch
  - docker
categories:
  - openvswitch
date: 2023-06-15 18:40:12
excerpt: openvswitch使用隧道GRE和VXLAN构建环状网络，认识广播风暴，使用STP消除环路
sticky: 1
---


### 1.准备linux环境

- [openvswitch如何安装](https://weiqiangxu.github.io/2023/06/02/cni/openvswitch%E5%AE%89%E8%A3%85/)
- [docker离线安装](https://weiqiangxu.github.io/2023/04/18/%E8%AF%AD%E9%9B%80k8s%E5%9F%BA%E7%A1%80%E5%85%A5%E9%97%A8/docker%E7%A6%BB%E7%BA%BF%E5%AE%89%E8%A3%85/)也可以直接使用yum等包管理工具在线安装


### 2.host1

``` bash
$ systemctl stop firewalld
$ ovs-vsctl add-br br1
$ ifconfig br1 192.168.222.11/24 up
$ ip route
```

### 3.host2

``` bash
$ systemctl stop firewalld
$ ovs-vsctl add-br br1
$ ifconfig br1 192.168.222.12/24 up
$ ip route
```

### 3.host3

``` bash
$ systemctl stop firewalld
$ ovs-vsctl add-br br1
$ ifconfig br1 192.168.222.13/24 up
$ ip route
```

### 4.host1 ping host2

``` bash
# host1
$ ping 192.168.222.12
```

### 5.在host1和host2之间建设GRE隧道

``` bash
# host1
$ ovs-vsctl add-port br1 gre1 -- set interface gre1 type=gre option:remote_ip=${host2_ip}
$ ovs-vsctl show
```

``` bash
# host2
$ ovs-vsctl add-port br1 gre1 -- set interface gre1 type=gre option:remote_ip=${host1_ip}
$ ovs-vsctl show
```

### 6.host1 ping host2

``` bash
# host1
# 此时可以通讯
$ ping 192.168.222.12
```

### 7.在host1和host3之间建设VXLAN隧道

``` bash
# host1
ovs-vsctl add-port br1 vxlan1 -- set Interface vxlan1 type=vxlan options:remote_ip=${host3_ip}

# host3
ovs-vsctl add-port br1 vxlan1 -- set Interface vxlan1 type=vxlan options:remote_ip=${host1_ip}

# host1 ping host3 会自动使用 vxlan隧道通讯
$ ping 192.168.222.13
```

### 6.在host2和host3之间建立GRE OVER IPSec隧道

``` bash
# host2
ovs-vsctl add-port br1 ipsec2 -- set Interface ipsec2 type=gre options:remote_ip=${host3_ip} options:psk=password

# host3
ovs-vsctl add-port br1 ipsec3 -- set Interface ipsec3 type=gre options:remote_ip=${host2_ip} options:psk=password
```

``` bash
# host1 ping host2 提示 From 192.168.222.11 icmp_seq=261 Destination Host Unreachable
# 网络出现了环，打开STP即可解决
# 4789 udp对于vxlan来说极为重要,安全组之中必须打开 4789 udp
ovs-vsctl set bridge ${br_name} stp_enable=true
```

![vxlan和gre构建一个环状拓扑](/images/experiment11_2.png)

###  7.网桥的 Spanning Tree Protocol(STP)功能

> STP 是一种用于在拓扑结构中防止环路出现的协议

三台机器查看`ovs-vsctl list bridge`可以发现，host2是root bridge，host1 ping host2是不经过host3的，实验host1 ping host2经过host3。

- 实现ns1 ping ns2时，经过ns3

``` bash
# ns1
$ ovs-vsctl set Port gre1 other_config:stp-path-cost=190
$ ovs-appctl stp/show
```

- 重新设置stp-path-cost，使ns1 ping ns2不经过ns3

``` bash
#ns1
$ ovs-vsctl set Port gre1 other_config:stp-path-cost=10
```

### Q&A

1. 如何删除隧道

``` bash
# 因为Tunnel(GRE、VXLAN)也是openvswitch Port的一种类型
ovs-vsctl del-port br1 vxlan1
```

### 相关资料

[图解 STP ：你可能不用，但是不能不懂](https://mp.weixin.qq.com/s/Mpng0TAAK2st9v2N1RxNdA)