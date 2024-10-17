---
title: 什么是CNI
index_img: /images/bg/cni.png
banner_img: /images/bg/5.jpg
tags:
  - kubernetes
categories:
  - kubernetes
date: 2023-06-05 18:40:12
excerpt: 理解什么是CNI，k8s的网络模型是什么，实现的插件有哪些，相关的openvswitch又是什么
sticky: 1
---

### 一、简短描述

1. CNCF项目;
2. 标准化的网络接口规范;
3. CNI规范定义了"容器运行时"如何与"网络插件"进行通信，并且规定了插件必须实现的功能和接口;
3. 第三方插件: 
     [calico](https://github.com/projectcalico/calico)
     [cilium](https://github.com/cilium/cilium)

### 二、k8s和CNI是什么关系

- Kubernetes遵循CNI（Container Networking Interface）规范；
- 使用CNI插件来实现容器间通信和与外部网络通信，定义和管理容器的网络配置；
- Kubernetes提供了一些默认的CNI网络插件，例如Flannel和Calico等；
- CNI网络抽象层


### 三、k8s如何集成flannel

- Kubernetes文档[使用kubeadm引导集群](https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/);
- Kubernetes文档[安装Pod网络附加组件](https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#pod-network)
- Kubernetes文档[概念/扩展/计算存储和网络扩展/网络插件](https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)选择使用containerd\CRI-O

``` bash
# 在控制平面节点或具有 kubeconfig 凭据的节点上安装 Pod 网络附加组件
# 每个集群只能安装一个 Pod 网络
$ kubectl apply -f <add-on.yaml>
```

### 四、CNI标准和CNI提供的二进制程序(什么关系)

> CNI插件是符合CNI规范的二进制程序

### 五、只有 [CNI/plugins](https://github.com/containernetworking/plugins) 可以安装好k8s的网络吗

   不是的，除了 https://github.com/containernetworking/plugins 还有很多其他的网络插件可以用于Kubernetes，比如：Calico、Flannel、Weave Net、Cilium等等。可以根据自己的需求选择适合的网络插件来部署Kubernetes集群。

### 六、CNI如何工作的

参考[万字总结体系化带你全面认识容器网络接口(CNI)](https://mp.weixin.qq.com/s/gWPZKz9Z4gCoZRFX8dvr6w)

CNI的接口并不是指HTTP，gRPC接口，CNI接口是指对可执行程序的调用（exec）。

``` bash
$ ls /opt/cni/bin/  

bandwidth  bridge  dhcp  firewall  flannel  host-device  host-local  ipvlan  
loopback  macvlan  portmap  ptp  sbr  static  tuning  vlan
```

![容器运行时执行CNI插件 - 调用二进制脚本方式](/images/cni-pod.png)

> libcni（胶水层）是CNI提供的一个go package，封装了一些符合CNI规范的标准操作，便于容器运行时和网络插件对接。

1. JSON格式的配置文件来描述网络配置;
2. 容器运行时负责执行CNI插件，并通过CNI插件的标准输入（stdin）来传递配置文件信息，通过标准输出（stdout）接收插件的执行结果;
3. 环境变量:
    CNI_COMMAND：定义期望的操作，可以是ADD，DEL，CHECK或VERSION。
    CNI_CONTAINERID：容器ID，由容器运行时管理的容器唯一标识符。
    CNI_NETNS：容器网络命名空间的路径。（形如 /run/netns/[nsname]）。
    CNI_IFNAME：需要被创建的网络接口名称，例如eth0。
    CNI_ARGS：运行时调用时传入的额外参数，格式为分号分隔的key-value对，例如FOO=BAR;ABC=123
    CNI_PATH：CNI插件可执行文件的路径，例如/opt/cni/bin。
4. 通过链式调用的方式来支持多插件的组合使用;

``` bash
# 调用bridge插件将容器接入到主机网桥

# CNI_COMMAND=ADD 顾名思义表示创建。
# XXX=XXX 其他参数定义见下文。
# < config.json 表示从标准输入传递配置文件
CNI_COMMAND=ADD XXX=XXX ./bridge < config.json
```

### 七、使用CNI用于Docker容器网络建设

##### 1.安装runc和cni plugins

- runc 
- docker
- cni plugins
- golang
- git

##### 2.quickStart

``` bash
# 宿主机上
$ CNI_PATH=/opt/cni/bin
$ cd /home && git clone https://github.com/containernetworking/cni.git
$ CNI_PATH=$CNI_PATH /home/cni/scripts/priv-net-run.sh ifconfig
```

##### 3.docker

``` bash
$ docker save -o busybox.tar busybox:latest
$ docker load -i busybox.tar
```

``` bash
$ CNI_PATH=/opt/cni/bi
$ echo $CNI_PATH
$ cd /home/cni/scripts && CNI_PATH=$CNI_PATH ./docker-run.sh --rm busybox:latest ifconfig
```

[dasblinkenlichten.com/深入理解CNI](http://www.dasblinkenlichten.com/understanding-cni-container-networking-interface/)

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

``` bash
$ sudo ip netns add 1234567890
$ sudo CNI_COMMAND=ADD CNI_CONTAINERID=1234567890 CNI_NETNS=/var/run/netns/1234567890 CNI_IFNAME=eth12 CNI_PATH=`pwd` ./bridge <mybridge.conf
# 查看我们的主机 iptables 规则，我们将看到伪装和接受规则.
$ sudo iptables-save | grep mybridge
# 通常情况下，容器运行时会创建netns，这里我们手动创建
$ sudo ip netns exec 1234567890 ifconfig
#　设备eth12的IP地址配置为10.15.20.2，子网掩码为255.255.255.0（/24表示子网掩码），并将该设备的网络范围设置为本地链接（scope link）
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
default via 10.15.20.1 dev eth12                                 #  "dev" 是指指定该路由器的出口网络接口，即数据包是从哪个网络接口发送出去的, 默认路由通过 eth12 网络接口，经过 10.15.20.1 这个下一跳地址进行转发
1.1.1.1 via 10.15.20.1 dev eth12                                 #  "via" 是指默认路由的下一跳地址，即数据包需要经过哪个路由器进行转发
10.15.20.0/24 dev eth12 proto kernel scope link src 10.15.20.2   #  "src" 是指源IP地址，即指定该路由器发送数据包的源IP地址

# 查看网桥配置可以看到netns内部网卡eth12的veth pair对端网卡是vethb4336cfa
$ brctl show
bridge name     bridge id               STP enabled     interfaces
cni_bridge0     8000.127bceaee96d       no              vethb4336cfa
```

##### 4.配置解析

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

##### 5.CNI扩展插件

``` bash
$ tree /opt/cni/bin/
/opt/cni/bin/
├── bandwidth       # 提供带宽限制功能，用于限制容器的网络带宽使用
├── bridge          # 用于创建和管理 Linux 桥接网络，使容器可以与宿主机以及其他容器进行通信
├── dhcp            # 用于在容器启动时为其分配 IP 地址和其他网络配置信息，使容器能够与网络相连并进行通信
├── dummy           # 创建虚拟网络接口，用于将本地流量重定向到远程主机或者其它容器，以便进行容器之间的通信
├── firewall        # 用于在容器之间设置网络防火墙规则，保护容器免受网络攻击或恶意流量的侵害
├── host-device     # 用于将宿主机的物理网络设备（例如网卡）直接绑定到容器中，以提高网络性能和可靠性
├── host-local      # 用于容器内部的通信，提供方便的主机名解析和网络配置
├── ipvlan          # 使用现有接口创建虚拟接口，以增加容器的网络隔离性
├── loopback        # 提供一个本地环回接口，用于本地进程与网络的通信
├── macvlan         # 将容器连接到物理网络，使其可以使用独立的MAC地址和IP地址
├── portmap         # 提供端口映射功能，将容器内部的端口映射到宿主机的端口上
├── ptp             # 提供时间同步功能，确保容器中的网络设备具有相同的时间戳
├── sbr             # 提供基于软件的路由功能，用于将容器连接到不同的网络
├── static          # 提供静态IP地址配置功能，用于固定给容器分配IP地址
├── tuning          # 提供网络优化功能，用于调整容器网络性能的参数
├── vlan            # 提供虚拟局域网功能，用于将容器分组成不同的虚拟网络
└── vrf             # 提供虚拟路由功能，用于将容器连接到不同的路由域
```

### Q&A

##### 1.k8s使用ovs通信的时候，当pod与pod之间通信，数据流向怎么样的

> OVS充当着虚拟交换机的角色，Kubernetes网络模型插件协调多个节点上不同的OVS实现容器之间通信。

- 1.应用程序在一个pod中生成数据包，数据包被发送到pod的网络接口;
- 2.Kubernetes网络模型插件（例如：Flannel等）将数据包封装在一个Overlay协议中;
- 3.CNI插件比如flannel将数据包发送到虚拟交换机（OVS）;
- 4.OVS使用VXLAN或者Geneve等封装技术，将数据包发送到另一个pod的OVS;
- 5.另一个pod的OVS解开数据包，将数据包发送到目标pod的网络接口;
- 6.应用程序在目标pod中接收到数据包。

##### 2.单价的kubernetes如何运行非控制平面的pod

默认情况下，出于安全原因，你的集群不会在控制平面节点上调度 Pod。 参考官方手册[控制平面节点隔离](https://kubernetes.io/zh-cn/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)，如果你希望能够在控制平面节点上调度 Pod，例如单机 Kubernetes 集群：

``` bash
$ kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

##### 3.kubelet管理CNI插件吗

- Kubernetes 1.24 之前，CNI 插件也可以由 kubelet 使用命令行参数 cni-bin-dir 和 network-plugin 管理;
- Kubernetes 1.24 移除了这些命令行参数， CNI 的管理不再是 kubelet 的工作;

##### 4.如何安装和管理CNI插件

理解[网络模型](https://kubernetes.io/zh-cn/docs/concepts/cluster-administration/networking/#how-to-implement-the-kubernetes-networking-model) - 如何实现网络模型 - [安装扩展](https://kubernetes.io/zh-cn/docs/concepts/cluster-administration/addons/#networking-and-network-policy) - [使用helm or kubectl 安装 flannel](https://github.com/flannel-io/flannel#deploying-flannel-manually)

##### 5.CNI插件和flannel什么关系

- cni插件和flannel都是用于容器网络的技术。
- cni插件用于管理容器网络，flannel则是一种网络解决方案，可以提供容器间的通信。
- cni插件可以与flannel结合使用，以管理flannel提供的网络。在使用kubernetes等容器编排工具时，通常都会使用cni插件和flannel进行容器网络的管理。

##### 6.kube-proxy和flannel是什么关系

   kube-proxy和flannel可以说是两个不同的组件，但它们是紧密相关的。
   kube-proxy作为Kubernetes中的一种网络代理，负责管理集群内部的网络连接。
   flannel则是一种网络解决方案，用于管理容器之间的通信。
   在一个Kubernetes集群中，flannel会被作为网络解决方案被部署，并使用kube-proxy来实现网络代理的功能。
   flannel和cni也有关系。cni是Container Network Interface的缩写，是用于实现容器网络的通用API规范。
   而flannel则是cni规范的一个实现。也就是说，在一个Kubernetes集群中，flannel可以被作为cni规范的一个实现来使用，以实现容器网络的功能。

##### 7.kube-proxy是每个节点都有吗，控制节点还是工作节点，独立进程还是pod内还是二进制程序而已

   kube-proxy是每个工作节点都有的，它作为一个独立的进程运行在每个节点上。
   它的主要作用是实现Kubernetes服务发现和负载均衡机制，为Service对象提供集群内服务的访问入口。
   kube-proxy会在节点上创建iptables规则或操作网络设备，以实现Service IP的转发和负载均衡。

##### 8.flannel是CNI的实现吗

   flannel是一种CNI（Container Networking Interface）的实现，用于容器之间的网络通信。
   它使用覆盖网络的技术来实现容器之间的通信，支持多种网络模型，如host-gw、vxlan、ipip等，可以在不同节点之间建立虚拟网络。
   flannel的主要作用是为容器提供独立的IP地址，并实现跨节点的通信，让容器能够像在一个本地网络中一样相互通信。

##### 9.CNI仓库之中有CNI规范库\CNI插件是什么关系，CNI插件(bridge\firewall\ptb等)和flannel是什么关系

- CNI规范是一种容器网络接口规范，定义了容器运行时与网络插件之间的接口规范;
- CNI插件(轻量级网络插件)是遵循CNI规范定义的一种网络插件，用于在容器中创建和管理网络接口;
- Flannel是一个常用的CNI插件之一，用于创建虚拟网络，并为容器提供IP地址，管理集群网络和跨节点通信;
- 在使用Flannel时，可以选择使用CNI插件作为网络接口与容器运行时交互，以实现跨主机容器的网络通信；

> CNI插件和Flannel是互补的关系

##### 10.kube-proxy原理是什么

[k8s/参考/组件工具/kube-proxy](https://kubernetes.io/zh-cn/docs/reference/command-line-tools-reference/kube-proxy/)

- 网络代理在每个节点上运行；
- 执行 TCP、UDP 和 SCTP 流转发；
- 转发是基于iptables的（用iptables规则来实现Kubernetes Service的负载均衡和端口转发功能），每个Service创建一条iptables规则；


#### 11.演示如何使用CNI插件来为Docker容器设置网络

- docker指定网络`--net=none`的容器，容器内只有网卡lo无法通信；
- 调用CNI插件，为容器设置eth0接口，为其分配IP地址，并接入主机网桥mynet0；

1. 容器中新增eth0网络接口：使用Bridge插件为容器创建网络接口，并连接到主机网桥(bridge.json)；
2. 为容器所在的网段添加路由: `ip route add 10.10.0.0/16 dev mynet0 src 10.10.0.1 `;
3. 访问容器内

``` bash
$ curl -I 10.10.0.2 # IP换成实际分配给容器的IP地址
HTTP/1.1 200 OK
```

#### 12.如何方便快捷查看网卡 

``` bash
$ nsenter -t $pid -n ip a
```

#### 13.删除网桥

``` bash 
$ ip link delete mynet0 type bridge
```

#### 14.路由规则default via 10.15.20.1 dev eth12是什么意思

``` bash
default              # 默认路由，如果未知的ip（ip route无匹配规则）则流量从这个规则走
via 10.15.20.1       # 下一跳地址，即数据包需要经过哪个路由器进行转发
dev eth12            # 出口网络接口，即数据包是从哪个网络接口发送出去的
```


#### 15.10.16.200.0/21 的 IP 范围是如何计算的呢

``` bash
转32位二进制: 00001010 00010000 11001000 00000000
因为是21位，所以前面21位不能更改，剩下的后面的二进制
转十进制最小的是
00001010 00010000 11001000 00000000  也就是 10.16.200.0
转十进制最大的是
00001010 00010000 11001111 11111111  也就是 10.16.207.255
所以 IP 范围是 10.16.200.0 ～ 10.16.207.255
```

### 相关资料

[官方手册 https://github.com/containernetworking/cni](https://github.com/containernetworking/cni)
[官方手册 CNI/plugins && https://github.com/containernetworking/plugins](https://github.com/containernetworking/plugins)
[k8s/概念/扩展/网络插件](https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)
[k8s/概念/扩展/网络插件/containerd安装网络插件](https://github.com/containerd/containerd/blob/main/script/setup/install-cni)
[k8s/概念/扩展/网络插件/CRI-O安装网络插件](https://github.com/cri-o/cri-o/blob/main/contrib/cni/README.md)
[k8s/概念/集群管理/集群网络系统/网络模型 && 如何实现网络模型](https://kubernetes.io/zh-cn/docs/concepts/cluster-administration/networking/#how-to-implement-the-kubernetes-networking-model)
[k8s/概念/集群管理/安装扩展](https://kubernetes.io/zh-cn/docs/concepts/cluster-administration/addons/#networking-and-network-policy)
[万字总结，体系化带你全面认识容器网络接口(CNI)](https://mp.weixin.qq.com/s/gWPZKz9Z4gCoZRFX8dvr6w)