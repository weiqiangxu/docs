---
title: 用CNI给docker容器分配网络
tags:
  - kubernetes
categories:
  - kubernetes
---

> 使用docker创建无网络的容器，然后使用CNI插件手动分配网卡和网桥等

### 1.安装docker和cni plugins

- docker
- cni plugins

[本文参考手册CNI README.md](https://github.com/containernetworking/cni/blob/main/README.md)

### 2.脚本创建网络命名空间并分配网络quickStart

``` bash
# 宿主机上验证CNI环境已经装好
# 下面这个脚本执行后会创建net namespace并且分配网络
# 然后打印出网卡信息
$ CNI_PATH=/opt/cni/bin
$ cd /home && git clone https://github.com/containernetworking/cni.git
$ CNI_PATH=$CNI_PATH /home/cni/scripts/priv-net-run.sh ifconfig
```

### 3.对docker创建好的容器分配网络并查看网络配置docker

``` bash
$ docker save -o busybox.tar busybox:latest
$ docker load -i busybox.tar
```

``` bash
# 下面这个脚本会给容器分配网络并且打印出容器内网卡信息
$ CNI_PATH=/opt/cni/bi
$ echo $CNI_PATH
$ cd /home/cni/scripts && CNI_PATH=$CNI_PATH ./docker-run.sh --rm busybox:latest ifconfig
```

### 4.CNI在容器网络分配时候相关配置以及操作描述

##### 1.相关博客

[dasblinkenlichten.com/深入理解CNI](http://www.dasblinkenlichten.com/understanding-cni-container-networking-interface/)

##### 2.cni配置展示

``` bash
$ cd /opt/cni/bin
```

``` bash
$ cat > mybridge.conf <<EOF
{
    "cniVersion": "0.2.0",
    "name": "mybridge",
    "type": "bridge",
    "bridge": "cni_bridge0",
    "isGateway": true,
    "ipMasq": true,
    "ipam": {
        "type": "host-local",
        "subnet": "10.15.20.0/24",
        "routes": [
            { "dst": "0.0.0.0/0" },
            { "dst": "1.1.1.1/32", "gw":"10.15.20.1"}
        ]
    }
}
EOF
```

##### 2.手动创建网络命名空间然后使用CNI手动给该命名空间分配网卡

``` bash
$ sudo ip netns add 1234567890
$ sudo CNI_COMMAND=ADD CNI_CONTAINERID=1234567890 \
    CNI_NETNS=/var/run/netns/1234567890 CNI_IFNAME=eth12 \
    CNI_PATH=`pwd` ./bridge <mybridge.conf
# 查看我们的主机 iptables 规则，我们将看到伪装和接受规则.
$ sudo iptables-save | grep mybridge
# 通常情况下，容器运行时会创建netns，这里我们手动创建
$ sudo ip netns exec 1234567890 ifconfig
# 设备eth12的IP地址配置为10.15.20.2，子网掩码为255.255.255.0（/24表示子网掩码）
# 并将该设备的网络范围设置为本地链接（scope link）
$ sudo ip netns exec 1234567890 ip route

# 命名空间有一个名为“eth12”的接口，IP 地址为 10.15.20.2/24
# IP 地址对应的ipam的子网段地址
eth12: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 10.15.20.2  netmask 255.255.255.0  broadcast 10.15.20.255
        inet6 fe80::44f2:48ff:feb6:b364  prefixlen 64  scopeid 0x20<link>
        ether 46:f2:48:b6:b3:64  txqueuelen 0  (Ethernet)
        RX packets 67  bytes 13007 (12.7 KiB)
        RX errors 0  dropped 3  overruns 0  frame 0
        TX packets 9  bytes 682 (682.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0


# netns内部的网络路由可以看到规则有
# - 所有未知目标IP地址的网络流量都将通过eth12设备，并通过网关10.15.20.1转发到其他网络
# - 将目标IP地址1.1.1.1的网络流量通过eth12设备，并通过网关10.15.20.1转发到其他网络
# - 本地网络10.15.20.0/24的所有流量都通过eth12设备发送，并且源IP地址为10.15.20.2
# "proto kernel"表示该路由是由内核自动生成的。 "scope link" 表示该路由只适用于本地链路
$ sudo ip netns exec 1234567890 ip route

# "dev" 是指指定该路由器的出口网络接口，即数据包是从哪个网络接口发送出去的
# 默认路由通过 eth12 网络接口，经过 10.15.20.1 这个下一跳地址进行转发
default via 10.15.20.1 dev eth12                    
#  "via" 是指默认路由的下一跳地址，即数据包需要经过哪个路由器进行转发             
1.1.1.1 via 10.15.20.1 dev eth12                              
#  "src" 是指源IP地址，即指定该路由器发送数据包的源IP地址   
10.15.20.0/24 dev eth12 proto kernel scope link src 10.15.20.2

# 查看网桥配置可以看到netns内部网卡eth12的veth pair对端网卡是vethb4336cfa
$ brctl show

bridge name     bridge id               STP enabled     interfaces
cni_bridge0     8000.127bceaee96d       no              vethb4336cfa
```

##### 3.配置解析

``` json
{
    "cniVersion": "定义适用的 CNI 规范的版本",
    "name": "网络名称",
    "type": "您希望使用的插件的名称。在这种情况下，插件可执行文件的实际名称",
    "bridge": "创建名为cni_bridge0的网桥接口",
    "isGateway": "如果为真，则为网桥分配一个IP地址，以便连接到它的容器可以将其用作网关",
    "ipMasq": "为此网络配置出站伪装（源 NAT）",
    "ipam": {
        "type": "IPAM 插件可执行文件的名称",
        "subnet": "要分配的子网（这实际上是 IPAM 插件的一部分），这个其实决定了容器内的网址", 
        "routes": [
            { "dst": "您希望访问的子网" },
            { "dst": "您希望访问的子网", "gw":"到达dst的下一跳IP地址。如果未指定，则假定为子网的默认网关"}
        ]
    }
}
```

##### 4.命名描述

``` bash
CNI_COMMAND=ADD – 我们告诉 CNI 我们想要添加一个连接
CNI_CONTAINER=1234567890 – 我们告诉 CNI 我们想要使用的网络命名空间称为“1234567890”（更多内容见下文）
CNI_NETNS=/var/run/netns/1234567890 – 相关命名空间的路径
CNI_IFNAME=eth12 – 我们希望在连接的容器端使用的接口名称
CNI_PATH=`pwd`  – 我们总是需要告诉 CNI 插件可执行文件所在的位置。在这种情况下，
因为我们已经在“cni”目录中，所以我们只有变量引用 pwd（当前工作目录）。
您需要命令 pwd 周围的刻度线才能正确评估。此处的格式似乎正在删除它们，但它们在上面的命令中正确
我们使用 STDIN 将网络配置文件提供给插件
```

[什么是 Service Mesh](https://zhuanlan.zhihu.com/p/61901608)
[istio是什么](https://istio.io/latest/zh/docs/concepts/what-is-istio/)