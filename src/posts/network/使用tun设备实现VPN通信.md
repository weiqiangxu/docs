---
title: 使用tun设备隧道通信
index_img: /images/bg/network.png
banner_img: /images/bg/computer.jpeg
tags:
  - network
categories:
  - network
date: 2023-08-25 18:40:12
excerpt: 部署多个网络命名空间并使用GRE隧道通讯
sticky: 1
hide: false
---

### 一、概念

##### 1.什么是TUN设备

在计算机网络中，TUN 与 TAP 是操作系统内核中的虚拟网络设备。

- tun是网络层的虚拟网络设备，可以收发第三层数据报文包，如IP封包，因此常用于一些点对点IP隧道等。

- tap是链路层的虚拟网络设备，等同于一个以太网设备，它可以收发第二层数据报文包，如以太网数据帧。Tap最常见的用途就是做为虚拟机的网卡，因为它和普通的物理网卡更加相近，也经常用作普通机器的虚拟网卡。

用户空间的程序可以通过 TUN/TAP 设备发送数据。常见于基于TUN/TAP设备实现的VPN。比如VPN软件在用户空间创建一个TUN/TAP设备，并将其配置为将网络流量导入到VPN隧道中。然后，VPN软件可以通过TUN/TAP设备读取和写入数据，将它们加密并通过隧道发送到VPN服务器。在服务器端，VPN软件将收到的数据解密并通过TUN/TAP设备发送到网络接口，从而实现了VPN连接。

##### 2.特点

TUN：三层设备、IP数据包、实现三层的ip隧道
TAP：二层设备、MAC地址、通常接入到虚拟交换机(bridge)上作为局域网的一个节点

##### 3.隧道

Linux 原生支持多种多种层隧道，大部分底层实现原理都是基于 tun 设备。我们可以通过命令 ip tunnel help 查看 IP 隧道的相关操作。

Linux 原生一共支持 5 种 IP 隧道（常见的隧道协议）。

ipip：即 IPv4 in IPv4，在 IPv4 报文的基础上再封装一个 IPv4 报文。
gre：即通用路由封装（Generic Routing Encapsulation），定义了在任意一种网络层协议上封装其他任意一种网络层协议的机制，IPv4 和 IPv6 都适用。
sit：和 ipip 类似，不同的是 sit 是用 IPv4 报文封装 IPv6 报文，即 IPv6 over IPv4。
isatap：即站内自动隧道寻址协议（Intra-Site Automatic Tunnel Addressing Protocol），和 sit 类似，也是用于 IPv6 的隧道封装。
vti：即虚拟隧道接口（Virtual Tunnel Interface），是 cisco 提出的一种 IPsec 隧道技术。

##### 4.用途

1. VPN连接：可以将tun设备配置为VPN客户端或服务器，并通过该设备在不同网络之间建立安全的隧道连接，实现远程访问或局域网间互通。tun/tap设备最常用的场景是VPN，比较有名的项目有[vTun](https://vtun.sourceforge.net/)、[openVPN](https://openvpn.net/)。
2. 隧道连接：可以将tun设备配置为网络隧道的一部分，用于将数据从一个网络传输到另一个网络，通常用于连接不同物理网络的互联，如通过互联网连接不同地区的局域网。
3. 虚拟化网络：可以使用tun设备实现虚拟化网络，通过创建多个tun设备和对应的网络命名空间，可以将不同容器或虚拟机之间隔离的网络连接起来。
4. 流量监控和过滤：可以使用tun设备来捕获传入和传出的网络流量，并进行流量监控或过滤，例如实现防火墙功能等。


[tun-tap工作层图](/images/Tun-tap-osilayers-diagram.png)

##### 5.图解Tun与应用程序

```txt
+----------------------------------------------------------------+
|                                                                |
|  +--------------------+      +--------------------+            |
|  | User Application A |      | User Application B |<-----+     |
|  +--------------------+      +--------------------+      |     |
|               | 1                    | 5                 |     |
|...............|......................|...................|.....|
|               ↓                      ↓                   |     |
|         +----------+           +----------+              |     |
|         | socket A |           | socket B |              |     |
|         +----------+           +----------+              |     |
|                 | 2               | 6                    |     |
|.................|.................|......................|.....|
|                 ↓                 ↓                      |     |
|             +------------------------+                 4 |     |
|             | Newwork Protocol Stack |                   |     |
|             +------------------------+                   |     |
|                | 7                 | 3                   |     |
|................|...................|.....................|.....|
|                ↓                   ↓                     |     |
|        +----------------+    +----------------+          |     |
|        |      eth0      |    |      tun0      |          |     |
|        +----------------+    +----------------+          |     |
|    10.32.0.11  |                   |   192.168.3.11      |     |
|                | 8                 +---------------------+     |
|                |                                               |
+----------------|-----------------------------------------------+
                 ↓
         Physical Network
```

> tun/tap设备的用处是将协议栈中的部分数据包转发给用户空间的应用程序，给用户空间的程序一个处理数据包的机会(数据压缩，加密)



### 二、VPN

1. 创建Tun设备

``` bash
# 虚拟机 1 作为服务端
sudo ip tuntap add dev tun-server mode tun
sudo ip addr add 172.16.1.1/24 dev tun-server
sudo ip link set tun-server up
gcc ./src/c/05-tun-tap/simpletun.c && sudo ./a.out -d -i tun-server -s


# 虚拟机 2 作为客户端
sudo ip tuntap add dev tun-client mode tun
sudo ip addr add 172.16.1.2/24 dev tun-client
sudo ip link set tun-client up
gcc ./src/c/05-tun-tap/simpletun.c && sudo ./a.out -d -i tun-client -c 192.168.57.3
```

``` bash
# ip tuntap add dev tun2 mode tun
ip netns exec container2 ip tuntap add dev tun2 mode tun

# set up tun2
ip netns exec container2 ip link set dev tun2 up

# ip addr add <IP地址>/<子网掩码> dev tun2
ip netns exec container2 ip addr add 172.16.0.8/24 dev tun2
```

``` bash
# ping <B的隧道IP地址>
# 验证container1和container2之间通讯
ip netns exec container1 ping 172.16.0.8
```

> 通过TUN的IP隧道，在物理网络上构建一条加密隧道。


### 四、程序监听TUN设备数据

``` golang
package main

import (
	"log"
	"os/exec"

	"github.com/songgao/packets/ethernet"
	"github.com/songgao/water"
)

func main() {
	config := water.Config{
		DeviceType: water.TUN,
	}
	config.Name = "tun-client"

	ifCe, err := water.New(config)
	if err != nil {
		log.Fatalf("new err=%s", err)
	}

	log.Printf("name=%s", ifCe.Name())
	if err := exec.Command("ip", "link", "set", ifCe.Name(), "up").Run(); err != nil {
		log.Fatalf("up err=%s", err)
	}
	if err := exec.Command("ip", "addr", "add", "10.0.42.1", "dev", ifCe.Name()).Run(); err != nil {
		log.Fatalf("addr add err=%s", err)
	}

	var frame ethernet.Frame

	for {
		frame.Resize(1500)
		n, err := ifCe.Read([]byte(frame))
		if err != nil {
			log.Fatalf("read catch=%s", err)
		}
		frame = frame[:n]
		log.Printf("Dst: %s\n", frame.Destination())
		log.Printf("Src: %s\n", frame.Source())
		log.Printf("Ethertype: % x\n", frame.Ethertype())
		log.Printf("Payload: %s\n", string(frame.Payload()))
	}
}
```

### 五、tun设备数据转tap经vrouter三层转发

### 相关疑问

- 客户端使用openvpn访问web服务流程

[openvpn访问过程](https://opengers.github.io/openstack/openstack-base-virtual-network-devices-tuntap-veth/)

- ipv4转发打开持久

``` bash
vim /etc/sysctl.conf

net.ipv4.ip_forward=1
```

- 为什么监听container1的网卡veth2时候，container1 ping无输出而container2 ping有输出

``` bash
# veth2 的 ip 10.1.1.5
# listen veth2 
ip netns exec container1 tcpdump -nei veth2

# 无数据包
ip netns exec container1 ping 10.1.1.5

# 有数据包
ip netns exec container2 ping 10.1.1.5

# lo接口本机ping又有
ip netns exec container1 tcpdump -nei lo
ip netns exec container1 ping 127.0.0.1
```

tcpdump 只能捕获进入它所在网络命名空间的接口的数据包，而无法捕获离开它所在网络命名空间的接口的数据包。

- 命名空间的tun设备如何使用`github.com/songgao/water`监听

创建并配置TUN设备：在命名空间中运行以下命令来创建和配置TUN设备：

```shell
# <namespace>是命名空间的名称
# <devicename>是TUN设备的名称
# <ipaddress>和<netmask>是TUN设备的IP地址和子网掩码
# <gateway>是TUN设备的默认网关IP地址
ip netns exec <namespace> ip tuntap add <devicename> mode tun
ip netns exec <namespace> ip addr add <ipaddress>/<netmask> dev <devicename>
ip netns exec <namespace> ip link set <devicename> up
ip netns exec <namespace> ip route add default via <gateway>
```

编写的golang程序在默认命名空间中运行的应用程序。如果要在命名空间中运行该应用程序，请使用`ip netns exec <namespace>`来执行golang程序.

### 相关文档

- [Tun/Tap接口使用指导](https://cloud.tencent.com/developer/article/1680749)
- [云计算底层技术-虚拟网络设备(tun/tap,veth)](https://opengers.github.io/openstack/openstack-base-virtual-network-devices-tuntap-veth/)
- [TUN接口有什么用？](https://www.baeldung.com/linux/tun-interface-purpose)
- [Linux虚拟网络基础——tun](https://blog.csdn.net/weixin_39094034/article/details/103810351)
- [Tun/Tap 接口教程](https://backreference.org/2010/03/26/tuntap-interface-tutorial/index.html)
- [在go中使用TUN/TAP或如何编写VPN](https://nsl.cz/using-tun-tap-in-go-or-how-to-write-vpn/)
- [https://github.com/kanocz/lcvpn](https://github.com/kanocz/lcvpn)
- [Linux 网络虚拟化技术（五）隧道技术](https://www.rectcircle.cn/posts/linux-net-virual-05-tunnel/)
- [Linux虚拟网络设备之tun/tap](https://segmentfault.com/a/1190000009249039)
- [https://github.com/go-gost/gost](https://github.com/go-gost/gost)