---
title: NAT配置公网访问
tags:
  - network
categories:
  - network
---

> 使用NAT实现数据转发其中包括DNAT和SNAT实验实现公网访问后转发到局域网的服务以及从内部网络命名空间配置SNAT访问公网服务

### 一、概念

##### 1.NAT

NAT（网络地址转换）是一种网络技术，一般用于局域网和公网之间IP地址转换，常用iptables实现。

##### 2.DNAT

DNAT（目标网络地址转换）是NAT的一种形式，它将目标IP地址和端口转换为不同的IP地址和端口，通常用于将外部请求转发到内部网络中的特定服务器上。一般通过公网IP进来公网网卡的数据包更改目的ip或端口访问到内部服务。

##### 3.SNAT

SNAT（源网络地址转换）是NAT的另一种形式，它将发送方的IP地址和端口转换为不同的IP地址和端口。主要用于局域网内的多台设备通过同一个公共IP地址访问互联网时，可以使用SNAT将内部设备的源IP地址转换成公共IP地址。这样可以避免互联网上的服务器将响应发送回源IP地址时的冲突。

### 二、配置DNAT规则让外部访问内部网络


1. 购买腾讯云服务器A上安装一个docker，运行一个Nginx服务，配置DNAT可以使用公网IP访问Nginx服务.

``` bash
$ yum install -y docker
$ systemctl start docker
$ docker run -itd --name nginx-test nginx
```

2. 配置NAT使用公网IP与自定义端口可访问Nginx服务

``` bash
# iptables查看NAT规则
$ iptables -t nat -L

# docker容器ip地址
$ docker inspect nginx-test | grep IPAddress

# 配置公网IP与8080端口请求转发到本机80端口
# 10.0.8.4 <公网数据入口网卡IP> 8989 <公网端口号> to-destination <容器IP地址>:<容器端口>
$ iptables -t nat -A PREROUTING -d 10.0.8.4 -p tcp --dport 8989 -j DNAT --to-destination 172.17.0.2:80

# 配置完成后可以通过腾讯云<公网IP>:8989访问到docker服务
# 如何删除iptables规则
$ iptables -t nat -D PREROUTING 1
```

### 三、配置SNAT从容器内部访问外网

1. 查看docker的SNAT的效果如何让容器可以访问外网的

``` bash
# 工具容器
$ docker run -itd --name box-test busybox

# 配置docker容器访问
$ docker exec -it box-test /bin/sh

# 容器内ping baidu.com
# 再次查看POSTROUTING规则发现匹配次数增多
$ iptables -t nat -nvL
```

2. 手动分配网络和SNAT

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
# 检查ipv4转发
sysctl net.ipv4.ip_forward

# 打开ipv4转发
sysctl -w net.ipv4.ip_forward=1
```

``` bash
# 此时没有配置SNAT是无法通讯的
ip netns exec container1 ping baidu.com

# 测试容器之间网络互通
# ip netns exec container1 ping <宿主机eth0>
ip netns exec container1 ping 10.0.8.4

# ip netns exec container1 ping <同交换机switch\bridge网段容器ip>
ip netns exec container1 ping 10.1.1.7

# iptables -t nat -A POSTROUTING -s 10.1.1.0/24 -o <宿主机外网接口> -j MASQUERADE
iptables -t nat -A POSTROUTING -s 10.1.1.0/24 -o eth0 -j MASQUERADE

# 或者(xx是服务器 IP)
iptables -t nat -A POSTROUTING -s 10.1.1.0/24 -o eth0 -j SNAT --to-source x.x.x.x

# 删除NAT规则
iptables -t nat -D POSTROUTING 1
iptables -t nat -nvL

# ping baidu.com
ip netns exec container1 ping baidu.com
```

### 相关疑问

##### 1.iptables常用命令

``` bash
# iptables查看NAT规则
$ iptables -t nat -L

# 查看iptables规则和其匹配次数
$ iptables -t nat -nvL
```

##### 2.iptables的PREROUTING\POSTROUTING\OUTPUT\INPUT分别干嘛的

iptables是一个用于Linux系统的防火墙工具，用于配置和管理网络数据包过滤规则。其中的PREROUTING、POSTROUTING和OUTPUT是iptables的三个不同的表，用于不同的数据包处理阶段。

- PREROUTING表: 进入路由系统的数据包。数据包路由之前进行处理，常用目标地址的修改、端口重定向等。

- POSTROUTING表: 离开路由系统的数据包。数据包路由之后进行处理，常用源地址的修改等。常见的使用场景SNAT等。

- OUTPUT表: 本地产生的数据包。它在数据包从本地应用程序发送出去之前进行处理，可以对数据包进行一些操作，例如目标地址的修改、端口重定向等。常见的使用场景包括阻止/允许本地应用程序访问特定的目标地址/端口等。

- INPUT表: 是 iptables 规则中的一个 chain（链），它用于控制数据包进入系统的行为。当一个数据包进入系统时，它首先会经过 INPUT chain 中的规则进行过滤和处理。

综上所述，PREROUTING表用于处理进入路由系统的数据包，POSTROUTING表用于处理离开路由系统的数据包，OUTPUT表用于处理本地产生的数据包。

##### 3.什么是静态NAT和动态NAT

一个私有IP固定映射一个公有IP地址，提供内网服务器的对外访问服务是静态。动态NAT是私有IP映射地址池中的公有IP，映射关系是动态的，临时的。

##### 4.如何删除iptables NAT规则

```shell
# 数字1是链的index索引
iptables -t nat -D PREROUTING 1

iptables -t nat -D OUTPUT 1
```

##### 5.本机器curl本机器网卡会经过iptables吗

在本机上使用curl命令访问IP地址为本机网卡IP`10.0.8.4`的服务端口8989，那么这个请求不会经过iptables防火墙。iptables是Linux操作系统中的一个防火墙管理工具，在本机上进行网络请求，请求的目标IP地址是本机的网卡IP地址，那么这个请求是走本机的网络协议栈直接发送和接收的，不会经过iptables的过滤。iptables主要针对通过本机的网络数据流量进行过滤和管理。

##### 6.output\input表常用规则

``` bash
# 允许所有出站数据包
iptables -A OUTPUT -j ACCEPT

# 允许源IP地址为192.168.1.100的出站数据包
iptables -A OUTPUT -s 192.168.1.100 -j ACCEPT

# 拒绝目标端口为80的出站数据包
iptables -A OUTPUT -p tcp --dport 80 -j REJECT

# 重定向目标端口为8080的出站数据包到本地的1234端口
# 所有从系统中发出的目标端口为 8080 的 TCP 连接重定向到端口号为 1234 的端口
iptables -A OUTPUT -p tcp --dport 8080 -j REDIRECT --to-ports 1234

# 允许所有来源地址的 SSH 连接进入系统
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

##### 7.output和postrouting之间的区别是什么

1. output链：
- 位置：output链是在数据包被`本地计算机发出之前`执行的。
- 功能：output链用于处理从本地计算机发出的数据包，常用于对本地出站流量进行过滤和控制。
- 示例：限制本地计算机上的某个应用程序只能访问特定的目的地地址和端口(linux用户访问端口\SSH访问限制等)。

2. postrouting链：
- 位置：postrouting链是在数据包`离开本地计算机之前`执行的。
- 功能：postrouting链用于对数据包进行NAT操作，主要是对数据包的源地址或目标地址进行转换。
- 示例：配置网络地址转换以实现多台内部主机共享一个公共IP地址(SNAT)。

```bash
# 限制username用户只能访问80端口的HTTP服务，其他端口将被丢弃
iptables -A OUTPUT -p tcp --dport 80 -m owner --uid-owner username -j DROP

# 将内部网络192.168.0.0/24的源地址转换为本地计算机上eth0接口的IP地址
iptables -t nat -A POSTROUTING -s 192.168.0.0/24 -o eth0 -j MASQUERADE
```

##### 8.MASQUERADE是什么意思

MASQUERADE是一种网络地址转换（NAT）技术，在iptables中表示对源IP地址进行伪装的操作。当数据包从内部网络转发到外部网络时，使用MASQUERADE可以将源IP地址替换为出口接口的IP地址，常使用MASQUERADE来处理出站流量。

``` bash
# 当数据包源IP是192.168.0.0/24网段内的IP，并且从eth0接口发送出去时，将源IP地址进行伪装（使用eth0接口的IP地址）
# 从内部网络发出的数据包都会经过MASQUERADE操作，并将源IP地址替换为eth0接口的IP地址，从而隐藏了内部网络的真实IP地址
# 就是对ip段192.168.0.0/24进行SNAT
iptables -t nat -A POSTROUTING -s 192.168.0.0/24 -o eth0 -j MASQUERADE
```

##### 9.读懂iptables的意思

``` bash
# 创建docker之后有这样一条规则，当docker内容器访问外网的时候匹配次数pkts会增大
# 用于将来自docker0接口以外的172.17.0.0/16子网的流量进行MASQUERADE伪装处理（SNAT操作）
# 允许从docker0接口以外发出的流量通过iptables进行NAT
Chain POSTROUTING (policy ACCEPT 339 packets, 21398 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    6   417 MASQUERADE  all  --  *      !docker0  172.17.0.0/16        0.0.0.0/0
```

##### 10.docker如何让容器可访问外部网络的

``` bash
# SNAT
iptables -t nat -A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
```

##### 11.tcpdump如何指定目标和源

``` bash
tcpdump -nei br-link src <source ip>
tcpdump -nei br-link dst <destination ip>
tcpdump -nei eth0 src <src ip> and dst <dst ip>
tcpdump -nei eth0 port <port>
```

##### 12.net.ipv4.ip_forward和iptables的snat有什么关系

`net.ipv4.ip_forward`和`iptables`的SNAT（Source Network Address Translation）功能是网络中的两个不同的概念，但它们在实现网络转发和网络地址转换方面存在一定的关系。

1. `net.ipv4.ip_forward`：此参数用于控制Linux系统是否启用IPv4转发功能。通过将其值设置为1，可以启用IPv4转发，从而允许Linux系统作为路由器来转发数据包。当数据包到达Linux系统时，但不是目标主机的地址时，如果IPv4转发已打开，系统将尝试将数据包转发到正确的目标地址。

2. `iptables`的SNAT：SNAT是一种网络地址转换技术，用于修改数据包的源IP地址。在Linux系统中，可以使用`iptables`命令来配置SNAT规则。通过配置适当的SNAT规则，您可以将源IP地址从内部网络转换成外部网络的IP地址，从而实现内部网络与外部网络之间的通信。

关系：
- 当启用了`net.ipv4.ip_forward`参数，Linux系统将充当路由器，并根据路由表将数据包转发到正确的目标地址。
- 当数据包在转发过程中经过Linux系统时，`iptables`的SNAT规则可以用于修改数据包的源IP地址，以便正确进行地址转换，从而实现数据包在不同网络之间的传递。

总结来说，`net.ipv4.ip_forward`参数用于启用Linux系统的IPv4转发功能，而`iptables`的SNAT功能则涉及修改数据包的源IP地址，以便进行网络地址转换。这两者一起使用可以实现跨网络的数据包转发和地址转换。