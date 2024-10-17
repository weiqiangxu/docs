---
title: flannel接入k8s
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - flannel
categories:
  - kubernetes
date: 2023-07-05 18:40:12
excerpt: kubernetes网络解决方案flannel如何使用，拓扑图理解
sticky: 1
---

### 1.kubernetes如何接入flannale

[k8s/概念/扩展/网络插件](https://kubernetes.io/zh-cn/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)
[k8s/概念/扩展/网络插件/containerd安装网络插件](https://github.com/containerd/containerd/blob/main/script/setup/install-cni)
[k8s/概念/扩展/网络插件/CRI-O安装网络插件](https://github.com/cri-o/cri-o/blob/main/contrib/cni/README.md)
[k8s/概念/集群管理/安装扩展](https://kubernetes.io/zh-cn/docs/concepts/cluster-administration/addons/#networking-and-network-policy)
[deploying-flannel-with-kubectl](https://github.com/flannel-io/flannel#deploying-flannel-with-kubectl)
[deploying-flannel-with-helm](https://github.com/flannel-io/flannel#deploying-flannel-with-helm)

> 安装 cni-plugins 网络插件，然后安装 flannel


### 2.flannel通信原理简述

1. 同一个Pod内的所有容器就会共享同一个网络命名空间，在同一个Pod之间的容器可以直接使用localhost进行通信；
2. 每宿主机上运行名为flanneld，负责为宿主机预先分配一个子网，并为Pod分配IP地址；
3. 拓扑图来看，同一个宿主机上的pod的网卡查到pair对，pair对端插docker0网桥(或者cni0)
4. 当访问本机的cni0网段的pod的ip的时候，路由表会直接指向本机直接网关cni0
5. 当访问其他宿主机上pod的时候，路由表会将数据指向flannel.1网卡，此时flannale.1网卡会将数据指向flanneld进程
6. Flannel会根据自己的路由表，将数据包封装成特定的协议（如VXLAN或UDP），并通过UDP或者其他方式将数据包发送到目标节点的Flannel网卡；
7. flannel.1网卡接收到数据以后不是通过iptable之类转发数据而是flanneld进程自己通过隧道或者自身的路由转发数据
8. 同一个pod内的所有容器共享网络命名空间

![flannel-docker拓扑图](/images/flannel-docker.webp)

### 3.flannel下网卡网桥查看

###### 1.网卡列表和网段分配

- Cni0网桥
- 每创建一个pod都会创建一对 veth pair，一端是pod中的eth0，另一端在Cni0网桥中的端口 （网卡）
- Flannel.1（overlay网络设备，vxlan报文的处理（封包和解包），node之间pod流量从overlay设备以`隧道的形式`发送到对端）

``` bash
$ ip a

# 宿主机A输出网卡信息
1: enp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether d0:0d:f8:2a:2f:b2 brd ff:ff:ff:ff:ff:ff
    inet 10.16.203.47/21 brd 10.16.207.255 scope global dynamic noprefixroute enp1s0

2: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN group default 
    link/ether d6:62:0a:2f:b4:29 brd ff:ff:ff:ff:ff:ff
    inet 10.244.0.0/32 brd 10.244.0.0 scope global flannel.1

3: cni0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default qlen 1000
    link/ether ae:87:60:9d:63:ac brd ff:ff:ff:ff:ff:ff
    inet 10.244.0.1/24 brd 10.244.0.255 scope global cni0
4: veth6c306fc3@if3:
5: vethda0af07c@if3: 

# 进入宿主机A上的容器
$ kubectl exec -it loki-0 -n loki -- /bin/sh 

# loki的网络是 inet 10.244.0.12 属于宿主机A的网段 10.244.0.1/24
# 而宿主机B的网段是 10.244.1.1/24 很明显不是同一个网段
$ ip a
3: eth0@if18: <BROADCAST,MULTICAST,UP,LOWER_UP,M-DOWN> mtu 1450 qdisc noqueue state UP 
    link/ether 5e:54:5a:33:85:5d brd ff:ff:ff:ff:ff:ff
    inet 10.244.0.12/24 brd 10.244.0.255 scope global eth0


# 宿主机B网卡信息
1: enp1s0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether d0:0d:29:05:8f:ed brd ff:ff:ff:ff:ff:ff
    inet 10.16.203.55/21 brd 10.16.207.255 scope global dynamic noprefixroute enp1s0

2: flannel.1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UNKNOWN group default 
    link/ether 0e:99:60:d8:96:e6 brd ff:ff:ff:ff:ff:ff
    inet 10.244.1.0/32 brd 10.244.1.0 scope global flannel.1

3: cni0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc noqueue state UP group default qlen 1000
    link/ether e2:e2:ee:49:c5:c8 brd ff:ff:ff:ff:ff:ff
    inet 10.244.1.1/24 brd 10.244.1.255 scope global cni0

# 很多pair对的对端插到网桥cni0上面 | 如果containerd runtime是docker那么这个是docker0
# 宿主机上的pod的ip都会属于网段 cni0 cidr 10.244.0.1/24
$ brctl show

bridge name     bridge id               STP enabled     interfaces
cni0            8000.ae87609d63ac       no              veth6c306fc3
                                                        vethda0af07c
```

###### 2.宿主机B访问宿主机A上面的pod数据流转

``` bash
# 登陆宿主机B
$ ip route

# 默认路由，所有无法匹配其他路由表项的数据包将通过网卡enp1s0发送到IP地址10.16.207.254。
default via 10.16.207.254 dev enp1s0 proto dhcp metric 100 
# 直连路由，表示该主机与子网10.16.200.0/21直接相连，本地IP地址为10.16.203.55。
10.16.200.0/21 dev enp1s0 proto kernel scope link src 10.16.203.55 metric 100 
# 静态路由，所有目标为10.244.0.0/24的数据包将通过接口flannel.1发送到目标地址10.244.0.0。
10.244.0.0/24 via 10.244.0.0 dev flannel.1 onlink 
# 直连路由，表示该主机与子网10.244.1.0/24直接相连，本地IP地址为10.244.1.1
10.244.1.0/24 dev cni0 proto kernel scope link src 10.244.1.1 


# 第一步数据会一句静态路由 10.244.0.0/24 流转到flannel.1
$ ping 10.244.0.12
```


### 4.flannel网络通信原理实验

1. 同节点的pod之间通信

   在容器启动前，会为容器创建一个虚拟Ethernet接口对，这个接口对类似于管道的两端，其中一端在主机命名空间中，另外一端在容器命名空间中，并命名为eth0。
   在主机命名空间的接口会绑定到网桥。网桥的地址段会取IP赋值给容器的eth0接口。

> 利用nodeName特性将Pod调度到相同的node节点上（亲和性）

``` yml
# p1.yml
apiVersion: v1
kind: Pod
metadata:
  labels:
    run: nginx
  name: p1
  namespace: default
spec:
  nodeName: k8s-node1
  containers:
  - image: busybox
    name: c1
    command: 
    - "ping"
    - "baidu.com"
```

``` yml
# p2.yaml
apiVersion: v1
kind: Pod
metadata:
  labels:
    run: busybox
  name: p2
  namespace: default
spec:
  nodeName: k8s-node1
  containers:
  - image: busybox
    name: c2
    command: 
    - "ping"
    - "baidu.com"
```

``` bash
$ kubectl apply -f p1.yaml -f p2.yaml
$ kubectl get pod p{1,2}
$ kubectl get pod p{1,2} -o wide

# p1 ping p2
$ kubectl exec -it p1 -- ping 10.244.1.230

# 源容器向目标容器发送数据，数据首先发送给 cni0 网桥

$ kubectl exec -it p1 -c c1 -- ip route
$ kubectl exec -it p2 -c c2 -- ip route

# cni0 网桥接受到数据后，将其转交给 flannel.1 虚拟网卡处理

# flannel.1 接受到数据后，对数据进行封装，并发给宿主机的 ens33，再通过ens33出外网，或者访问不同node节点上的pod
```

![想同节点的不同pod之间的通信-基于flannel](/images/flannel-same-pod.png)

### 5.flannel网络之中service是如何转发数据的

![service-flannel](/images/service-flannel.webp)

1. service提供DNS解析、pod动态追踪更新转发表，域名规则为{服务名}.{namespace}.svc.{集群名称}，iptables维护和转发。
2. 仅支持udp和tcp协议，所以ping的icmp协议是用不了的。

``` bash
# 查看DNS
$ kubectl get endpoints x -n x
```

![nodePort svc](/images/node-port-svc.png)

### Q&A

##### 1. 什么叫做直连路由

1. 目的地与源地址直接相连的路由。
2. 同一个子网中，可直发送到目的地，不需要任何中转设备或路由器。
3. 在物理层或链路层上直接相连。
4. 示例：`173.8.8.0/24 dev br2 proto kernel scope link src 173.8.8.1`因为本机网桥br2就是`inet 173.8.8.1`。

##### 2. ip route和route -n区别是什么

`route -n`和`ip route`命令都是用于查看和管理系统的路由表，但有一些区别：
1. 语法：`route -n`是基于`net-tools`软件包的命令，而`ip route`是基于`iproute2`软件包的命令。`iproute2`是较新的工具集，可以提供更多的功能和选项。
2. `ip route`命令的输出格式更为规范，以CIDR表示法显示网络和子网掩码，而不显示目标网络的广播地址。
3. `ip route`命令更推荐使用。


##### 3. flannel.1网卡接收到的流量会发给谁

1. 在flannel中，flannel.1网卡是用于虚拟网络通信的网络接口。
2. 当flannel.1网卡接收到流量时，它会将流量转发给flannel进程。
3. flannel进程负责将流量封装并发送到其他节点上的flannel进程，以便在不同节点之间建立覆盖网络。
4. 流量会达到目标节点的flannel进程，并被解封装并交给目标节点上的网络接口进行处理


##### 4. flannel.1接收到的流量不会根据iptable或者其他的转发吗

1. Flannel不会根据iptables或其他转发规则对流量进行处理;
2. Flannel通过隧道技术发送数据包;
3. 容器发送网络请求时，数据包会经过容器的网卡（容器内部会根据iptable转发）然后数据包会到达宿主机的Flannel网卡(flannel.1)；
4. Flannel.1收到数据会到flanneld，根据自己路由表，将数据包封装成特定的协议（如VXLAN或UDP），并通过UDP或者其他方式将数据包发送到目标节点的Flannel网卡；

##### 5. kube-proxy在flannel网络之中有什么用

1. 提供服务的负载均衡和网络代理功能;
2. 负载均衡：Service和其对应的多个Endpoint使用kube-proxy；
3. 网络代理：将集群外部的请求转发到内部的服务（kube-proxy为Service创建虚拟IP并监听该IP）；
4. kube-proxy可以选择使用IPVS模式(比默认iptables性能更高)；

##### 6. kube-proxy 为每个Service创建一个虚拟IP是什么意思

1. kube-proxy负责实现服务发现和负载均衡功能。
2. kube-proxy会为Service创建虚拟IP（Virtual IP），这个虚拟IP是由kube-proxy自动生成的，用于代表该Service在集群内的访问地址。
3. pod访问svc域名时候会转发到该虚拟IP上，kube-proxy监听该IP并转发数据到svc的Endpoint；
4. svc的虚拟IP可以实现后端Pod的变动与Service的访问地址解耦，Pod的变化不会影响到虚拟IP；

##### 7. ipvsadm -Ln是什么意思，flannel和ipvs什么关系

linux系统上IPVS（IP Virtual Server）的配置和状态信息;
IPVS是Linux内核提供的一种高性能负载均衡技术，它可以在Linux系统上进行网络流量的分发和负载均衡。
IPVS可以作为kube-proxy的一种模式来实现负载均衡和代理转发功能。

##### 8. flannel和kube-proxy是什么关系

1. Flannel（容器间的网络通信）和kube-proxy（服务发现和负载均衡功能）
3. Pod的IP分配：Flannel为每个Pod分配一个唯一的虚拟IP地址，并使用网络隔离技术（如VXLAN、UDP封装等）实现容器之间的通信。
4. 跨节点通信：Flannel还负责将节点的主机网络连接起来，以便跨节点的Pod可以相互通信。
5. kube-proxy在service上创建虚拟IP并监听，并负载均衡转发backend的Pod。


### 相关资料

- [Kubernetes（k8s）CNI（flannel）网络模型原理](https://mp.weixin.qq.com/s/18bMpQjXFodfegWH3xNeKQ)
- [《蹲坑学K8S》之19-3：Flannel通信原理](https://baijiahao.baidu.com/s?id=1677418078665703072)
- [ Kubernetes 网络模型和网络通信](https://atbug.com/deep-dive-k8s-network-mode-and-communication/)
- [从 Flannel 学习 Kubernetes overlay 网络 - 写的非常好](https://atbug.com/cross-node-traffic-on-flannel-vxlan-network/)
