---
title: veth-pair和ovs-bridge通讯
tags:
  - network
categories:
  - network
---

> 使用 openvswitch bridge 和 veth pair 实现两个网络命名空间下的网卡通信


### 创建 veth-pair 和 ovs-br

> OVS 是第三方开源的 Bridge，功能比 Linux Bridge 要更强大，对于同样的实验，我们用 OVS 来看看是什么效果

``` bash
# 用 ovs 提供的命令创建一个 ovs bridge
$ ovs-vsctl add-br ovs-br
# 查看 ovs bridge
$ ovs-vsctl show

# 创建两对 veth-pair
# 用于创建一个虚拟以太网接口ovs-veth-a，并生成一个与之相连的对等接口ovs-veth-b
# 用于连接Open vSwitch网络交换机
$ ip link add ovs-veth-a type veth peer name ovs-veth-b
$ ip link add ovs-veth-c type veth peer name ovs-veth-d

# 将 veth-pair 两端分别加入到 ns 和 ovs bridge 中
$ ip link set ovs-veth-a netns ns1
$ ovs-vsctl add-port ovs-br ovs-veth-b
$ ifconfig ovs-veth-b
$ ip link set ovs-veth-b up


$ ip link set ovs-veth-c netns ns2
$ ovs-vsctl add-port ovs-br ovs-veth-d
$ ip link set ovs-veth-d up

# 给 ns 中的 veth 配置 IP 并启用
$ ip netns exec ns1 ip addr add 10.1.1.2/24 dev ovs-veth-a
$ ip netns exec ns1 ip a
$ ip netns exec ns1 ip link set ovs-veth-a up

$ ip netns exec ns2 ip addr add 10.1.1.3/24 dev ovs-veth-c
$ ip netns exec ns2 ip a
$ ip netns exec ns2 ip l s ovs-veth-c up

# veth0 ping veth1
$ ip netns exec ns1 ping 10.1.1.3
PING 10.1.1.3 (10.1.1.3) 56(84) bytes of data.
64 bytes from 10.1.1.3: icmp_seq=1 ttl=64 time=0.586 ms
64 bytes from 10.1.1.3: icmp_seq=2 ttl=64 time=0.066 ms
```

![veth && ovs](/images/veth-ovs.png)

### Q&A

- 如何设置路由表

``` bash
# 在ns1和ns2上分别执行以下命令设置路由表
$ ip route add 10.0.0.0/24 dev <veth-pair-name> # 添加本地子网路由
$ ip route add default via 10.0.0.1 # 添加默认路由

# 显示网络接口的状态和属性，例如接口名称、MAC地址、MTU和状态
$ ip link show
```

[Linux 虚拟网络设备 veth-pair 详解，看这一篇就够了](https://www.cnblogs.com/bakari/p/10613710.html)