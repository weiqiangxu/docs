---
title: DNS配置
tags:
  - network
categories:
  - network
---


### 一、什么是DNS

1. DNS（Domain Name System）是一个用于将域名转换为与之关联的IP地址的分布式系统。

在Linux上，有几个与DNS相关的配置：

### 二、Linux与DNS相关命令

1. `/etc/resolv.conf`文件：这个文件包含了DNS服务器的配置信息，如名称服务器的IP地址、搜索域等。

``` bash
# 未配置DNS Server的
[root@i-62BEC048 ~]# cat /etc/resolv.conf
# Generated by NetworkManager


# 已经配置了DNS Server的
[root@i-62BEC048 ~]# cat /etc/resolv.conf
# Generated by NetworkManager
nameserver 114.114.114.114
```

2. Ubuntu 下 DNS 解析相关的命令`systemd-resolve`


``` bash
# 1.查看 DNS 服务状态
$ systemd-resolve --status

# 2.解析域名的的 IP
$ systemd-resolve DOMAIN

# 3.nslookup 解析domain
$ nslookup baidu.com

# 4.设置网卡的 DNS Server
$ systemd-resolve --set-dns={DNS_SERVER_IP} --interface {ITERFACE_NAME}

# 5.重置网卡DNS配置
$ systemd-resolve --revert --interface {ITERFACE_NAME}

# 6.刷新网卡DNS缓存
$ systemd-resolve --flush-caches

# 7.查看DNS相关配置
$ systemd-resolve --statistics
```

3. hosts文件

``` bash
$ cat /etc/hosts
```

### Q&A

1. nameserver 114.114.114.114是什么来的

114.114.114.114是中国电信运营商提供的公共的DNS服务器。DNS服务器用于转换域名（如www.google.com）和IP地址之间的对应关系，以便让计算机能够在互联网上进行通信。通过指定114.114.114.114作为DNS服务器，可以使用中国电信的DNS服务来解析域名。


2. server 8.8.8.8

`dns-nameservers 8.8.8.8`是用来指定DNS服务器的IP地址，其中8.8.8.8是Google提供的公共DNS服务器的IP地址。DNS服务器用于将域名解析为对应的IP地址。

在Linux上，可以通过设置`dns-nameservers`来指定所使用的DNS服务器。在上述示例中，`dns-nameservers 8.8.8.8`表示使用Google的DNS服务器进行域名解析。

在与`nameserver 114.114.114.114`的关系上，`nameserver 114.114.114.114`是指定的另一个DNS服务器的IP地址，由中国电信提供。不同的`nameserver`配置指定了不同的DNS服务器，用于解析域名。根据需要，可以根据实际情况选择使用不同的DNS服务器进行域名解析。

- VPC

- overlay

- VXLAN和VLAN

- CIDR地址是什么意思

- NAT

- iptable和NAT是什么关系

- 如何查看linux的NAT规则

 iptables -t nat -L
 iptables -t nat -nvL

- 来个nat的quickstart试试

- 来个vlan的quickstart试试

- Trunk是什么和VLAN什么关系

- 有没有实验试试VLAN和Trunk

- 什么叫局域网，和子网什么关系

- osi七层的二层为什么有的叫网络链路有的叫数据链路

- 和openvswich有类似功能的还有哪些 Linux Bridge

- linux bridge实现vlan怎么做

- linux bridge可以实现带宽控制吗

使用tc

- TCP/IP 4层和OSI 7层的差异是什么

- 本机有两个网卡，各自的ip分别是192.168.2.1和172.45.6.7，使用go实现web服务，如何写go代码监听不同的网卡

- 使用NAT让8989端口流量转发到ip 172.114.2.5的80端口，怎么做，用iptable

要使用iptables将8989端口的流量转发到IP 172.114.2.5的80端口，可以按照以下步骤进行设置：

1. 确保操作系统中已经安装了iptables，如果没有安装，可以使用以下命令进行安装：
  ```
  sudo apt-get update
  sudo apt-get install iptables
  ```

2. 打开终端或SSH连接，使用root或具有sudo权限的用户进行以下步骤。

3. 检查当前的iptables配置，可以使用以下命令查看：
  ```
  sudo iptables -L
  ```

  如果该命令显示的链策略默认为ACCEPT，那么你可以继续下一步。如果默认链策略是DROP，那么你需要添加相应的规则以允许转发流量。

4. 添加转发规则，使用以下命令：
  ```
  sudo iptables -t nat -A PREROUTING -p tcp --dport 8989 -j DNAT --to-destination 172.114.2.5:80
  ```

  这条规则将所有目标端口为8989的TCP流量转发到IP 172.114.2.5的80端口。

5. 启用转发功能，使用以下命令：
  ```
  sudo echo 1 > /proc/sys/net/ipv4/ip_forward
  ```

6. 确保iptables保存规则并在启动时加载规则，使用以下命令：
  ```
  sudo sh -c "iptables-save > /etc/iptables.rules"
  ```

7. 编辑网络设置文件以在启动时加载iptables规则，使用以下命令：
  ```
  sudo nano /etc/network/interfaces
  ```

  在文件末尾添加以下行：
  ```
  pre-up iptables-restore < /etc/iptables.rules
  ```

  保存并关闭文件。

8. 重新启动网络服务，使用以下命令：
  ```
  sudo service networking restart
  ```

  这将应用新的iptables规则并重新启动网络服务。

现在，8989端口的流量应该会被转发到IP 172.114.2.5的80端口。请注意，这些设置将在重新启动后保持，除非手动更改iptables规则，否则将一直生效。同时，确保网络安全性和合规性是非常重要的，请谨慎操作并考虑所需的安全设置。

- VLAN和子网

子网通过不同ip网段隔离，但是有路由就可以互相访问，VLAN通过报文的Tag区分，不同直接互相访问，即使有配置路由

- 二层网络和三层网络、

在OSI模型之中，2层是数据链路层，也就是网卡交换机之间，没有路由器，他们之间是MAC地址通讯，MAC地址作为识别彼此，局域网（LAN）内的通信，二层网络设备有交换机；
3层是网络层，IP、ICMP协议基于这一层实现，他们识别彼此是用IP，广域网（WAN）上进行通信，设备使用IP地址来识别彼此，并且他们可以不在同一个局域网，这一层有路由器，路由器（Router）将数据包从一个网络发送到另一个网络；


二层网络和三层网络是网络世界中常用的两个术语，它们描述了不同层次上进行网络通信的方式。

1. 二层网络（Layer 2 Network）：
  二层网络基于数据链路层（Layer 2，链路层）进行通信。数据链路层负责在物理网络中直接连接的两个设备之间传输数据。在二层网络中，设备通过MAC地址（媒体访问控制地址）来识别彼此，并使用MAC地址表来决定数据包应该从哪个接口发送或转发。二层网络主要侧重于局域网（LAN）内的通信，常用的二层设备包括交换机（Switch）。

2. 三层网络（Layer 3 Network）：
  三层网络基于网络层（Layer 3）进行通信。网络层负责在整个网络中为数据包提供逻辑寻址和路由功能。在三层网络中，设备使用IP地址来识别彼此，并通过路由器（Router）将数据包从一个网络发送到另一个网络。网络层还支持跨网络的通信，使得设备可以在广域网（WAN）上进行通信。三层网络通常使用IP协议来进行数据传输。

简而言之，二层网络主要关注局域网内设备之间的直接通信，而三层网络则更注重不同网络之间的通信和路由。通常情况下，较小的网络可以使用二层网络，而更复杂或跨越多个网络的场景则需要使用三层网络。

[OSI](https://zhuanlan.zhihu.com/p/143654140)

- 二层交换机L2 switch\三层交换机L3 switch

二层交换机（L2 switch）是一种网络设备，它工作在OSI模型的第二层（数据链路层），主要用于在局域网内进行数据转发和转接。二层交换机通过学习MAC地址，为不同设备之间建立连接，并在接收到数据包时根据目标MAC地址选择转发端口，实现快速的数据交换。

三层交换机（L3 switch）是一种功能更为复杂的网络设备，它不仅能够在OSI模型的第二层进行数据转发，还能在第三层（网络层）进行路由的功能。三层交换机集成了路由器的部分功能，能够根据IP地址进行数据转发和路由选择。它可以根据数据包中的目标IP地址，通过查找路由表来选择最佳转发路径，从而实现不同子网之间的通信和互联。

[华为-VLAN vs 子网](https://info.support.huawei.com/info-finder/encyclopedia/zh/VLAN.html)

- route -n 指令如何解析结果

- Trunk是什么和VLAN什么关系

Trunk在计算机网络中是指能够同时传输多个VLAN（Virtual Local Area Network，虚拟局域网）的网络链路或端口。它是一种物理链路或逻辑链路，可以在网络设备之间传送多个VLAN的数据。

VLAN是一种逻辑上的概念，可以将一个物理局域网划分成多个逻辑子网，使得不同的子网可以独立于彼此工作。VLAN通过在网络交换机上进行配置，将不同的端口划分到不同的VLAN中，实现逻辑上的隔离。在VLAN中，不同VLAN的设备之间通常是无法直接通信的。

而Trunk端口能够同时传输多个VLAN的数据，使得不同VLAN的设备之间可以进行通信。通过将Trunk端口连接到另一个支持Trunk功能的设备上，可以实现不同VLAN之间的通信和互联。Trunk端口在网络设备之间传输VLAN标签，使得数据可以在不同VLAN之间传输。这样，Trunk和VLAN的关系就是Trunk端口提供了VLAN之间的数据传输功能。


- 交换机和路由器分别是什么网桥又是什么


交换机是一种用于在局域网内进行数据交换的网络设备，交换机通过物理地址（MAC地址）来识别和转发数据。
路由器是一种用于在不同网络之间转发数据的网络设备，连接不同的局域网、广域网或互联网，并根据目标IP地址进行数据包转发。
网桥（Bridge）是一种用于连接和转发局域网数据的网络设备，可以理解为具有多个端口的交换机，但它主要侧重于数据链路层（第二层）的转发。也是通过MAC地址转发数据包。

``` bash
[root@i-7B581709 ~]# route -n
# 查看到默认网关数据转发通过 br-ext 网桥转发流量
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         10.16.207.254   0.0.0.0         UG    0      0        0 br-ext  （当前系统默认的网关）
10.16.200.0     0.0.0.0         255.255.248.0   U     0      0        0 br-ext   （目标网络）
169.254.0.0     0.0.0.0         255.255.0.0     U     0      0        0 br-ext    （目标网络）
192.168.122.0   0.0.0.0         255.255.255.0   U     0      0        0 virbr0    （本地网络）


这是一份路由表，显示了当前系统的网络路由信息。具体解析如下：

- 第一列 Destination： 目标网络或主机的IP地址或地址范围，0.0.0.0 表示默认的路由，即默认的网关。
- 第二列 Gateway：下一跳路由器的IP地址，用于将数据包转发到目标网络或主机。
- 第三列 Genmask：子网掩码，用于指定目标网络或主机的范围（即该地址范围所包含的IP地址）。
- 第四列 Flags：路由标志，用于标识路由的属性和状态。
- 第五列 Metric：路由的距离度量值，用于指定优先级，通常是跃点数或延迟等。
- 第六列 Ref：路由的引用计数，表示有多少个套接字正在使用这个路由。
- 第七列 Use：路由的使用计数，表示已经经过该路由的数据包数量。
- 第八列 Iface：该路由所对应的网络接口。

根据这份路由表，可以知道
当前系统默认的网关是 10.16.207.254，
目标网络为 10.16.200.0/21 和 169.254.0.0/16
以及本地网络 192.168.122.0/24 所对应的网络接口为 virbr0。

- Flags的UG和U的意思：
  UG 表示为 Up/下一跳为网关
  U 表示Up/可用
```

- ip route 结果解析

``` bash
[root@i-7B581709 ~]# ip route
# 默认路由，目标IP转发到固定网关 - 主要为了查看这个
default via 10.16.207.254 dev br-ext 
10.16.200.0/21 dev br-ext proto kernel scope link src 10.16.203.160 
169.254.0.0/16 dev br-ext scope link 
192.168.122.0/24 dev virbr0 proto kernel scope link src 192.168.122.1 linkdown 

# 路由表信息
- "default via 10.16.207.254 dev br-ext" 表示默认路由，即如果目标IP地址没有匹配到任何已知的路由，则会将数据包发送到10.16.207.254网关设备，通过br-ext接口发送出去。
- "10.16.200.0/21 dev br-ext proto kernel scope link src 10.16.203.160" 表示直接连通网络，即10.16.200.0/21这个子网段可以直接通过br-ext接口访问，本机IP地址是10.16.203.160。
- "169.254.0.0/16 dev br-ext scope link" 表示自动配置IPv4地址（APIPA地址）的网络，即当本机无法获取到有效IP地址时，会自动分配一个169.254.x.x的IP地址，并可以在br-ext接口上进行通信。
- "192.168.122.0/24 dev virbr0 proto kernel scope link src 192.168.122.1 linkdown" 表示在虚拟网络设备virbr0上的子网，本机通过这个设备连接到虚拟机。但是因为该设备处于linkdown（未连接）状态，无法进行通信。
```

- 查看防火墙服务是否开启

``` bash
$ systemctl -l | grep firewalk
$ systemctl stop firewalld
```

- 查看某一个ip是否可以访问

``` bash
$ ping 192.168.1.23
```

- 查看某一个ip的某一个端口是否可以访问

``` bash
$ telnet 127.0.0.1 8881
Trying 127.0.0.1...
Connected to 127.0.0.1.
Escape character is '^]'.
```

- 端口是否有服务在监听

``` bash
$ netstat -tunlp | grep 8881
tcp 0 0 0.0.0.0:8881 0.0.0.0:* LISTEN 21748/ovsdb-server 

-t：显示TCP协议的连接情况
-u：显示UDP协议的连接情况
-n：显示IP地址和端口号，而不是域名和服务名
-l：显示监听状态的连接情况
-p：显示与连接相关的进程PID和进程名

$ netstat -nl | grep 8881
tcp 0 0 0.0.0.0:8881 0.0.0.0:* LISTEN
```


- iptables是干嘛的，来个小实验试试iptables的功能

``` bash
# 查看当前的iptables规则
$ iptables --list

# 阻止所有对SSH端口（默认为22）的入站请求
$ iptables -A INPUT -p tcp --dport 22 -j DROP

# 查看刚刚添加的规则
$ iptables --list

# 允许某些IP访问SSH端口
$ iptables -A INPUT -s 192.168.1.100 -p tcp --dport 22 -j ACCEPT

# 删除添加的规则
$ iptables -D INPUT -p tcp --dport 22 -j DROP
$ iptables -D INPUT -s 192.168.1.100 -p tcp --dport 22 -j ACCEPT
```


- 不同的网段 ip 之间如何通信

``` bash
在不同的网段中，通信需要经过路由器进行转发。
路由器在不同的网段之间建立连接，使得数据包可以被正确转发到目标网络中。
通常，路由器会将其接收到的数据包进行分析，判断目标网络的地址和源网络的地址，然后将数据包转发到相应的网络中。
经过多跳路由转发，最终数据包会到达目标主机，实现网段之间的通信。


$ ip route
default via 10.16.207.254 dev br-ext
10.16.200.0/21 dev br-ext proto kernel scope link src 10.16.203.160
169.254.0.0/16 dev br-ext scope link
192.168.122.0/24 dev virbr0 proto kernel scope link src 192.168.122.1 linkdown

在上面这个环境下，169.254.0.1 和 10.16.200.2 如何通信？


它们处于不同的子网中无法直接通信。

其中，169.254.0.1 是一个特殊的自动分配 IP 地址，通常用于本地连接测试和临时使用，而 10.16.200.2 则是一个正式的 IP 地址。
要实现这两个 IP 地址之间的通信，需要配置一个路由器来进行转发。
路由器需要同时连接这两个子网，并具有相应的路由配置。
在这种情况下，可以在路由器上添加一个静态路由，将目标地址 169.254.0.1 的数据包转发到 10.16.200.0/21 子网中。

具体步骤如下：
1. 找到可用的路由器，将其连接到 169.254.0.0/16 和 10.16.200.0/21 子网中。
2. 在路由器上添加一个静态路由，将目标地址 169.254.0.1 的数据包转发到 10.16.200.0/21 子网中。
3. 在源主机上添加一个默认路由，将所有未知的数据包转发到路由器。
这样，当源主机发送数据包到目标地址 169.254.0.1 时，数据包会先被发送到路由器。
路由器会检查目标地址，发现它不在本地子网中，然后将数据包转发到 10.16.200.0/21 子网中。
最终，数据包到达目标主机，完成通信。

# 在Linux上如何配置静态路由呢
$ route add -net destination_network netmask subnet_mask gw next_hop_ip_address

# linux 上如何配置静态路由将 169.254.0.1 的数据包转发到 10.16.200.0/21 子网中
```

- 如何查看网段与网卡之间的关系

``` bash
$ ip route

# 目标IP地址没有匹配到任何已知的路由那么就会走这个默认路由 br-ext
default via 10.16.207.254 dev br-ext
# （10.16.200.0/21这个子网段可以直接通过br-ext接口访问 本机器IP是10.16.203.160）
10.16.200.0/21 dev br-ext proto kernel scope link src 10.16.203.160  
# （本机无法获取到有效IP地址时，会自动分配一个169.254.x.x的IP地址，并可以在br-ext接口上进行通信）
169.254.0.0/16 dev br-ext scope link   
# 虚拟网络设备virbr0子网通过设备192.168.122.1连接到虚拟机且linkdown（未连接）状态无法通信
192.168.122.0/24 dev virbr0 proto kernel scope link src 192.168.122.1 linkdown  
```
- 相同网段的ip如何通信的

``` bash
相同网段的IP地址可以通过交换机或者路由器相互通信。
如果是在同一局域网内，则直接通过交换机进行通信。交换机根据每个主机的MAC地址，将数据包传递到目标主机。


如果是不在同一局域网内，则需要通过路由器进行通信。
路由器将不同网段的数据包转发到目标主机所在的网段。
在这个过程中，路由器会根据路由表匹配目标IP地址，然后将数据包转发到合适的下一跳路由器或者主机。
最终将数据包传递到目标主机。

无论是通过交换机还是路由器，相同网段的主机之间的通信都是基于MAC地址的。
每个主机都会有一个唯一的MAC地址，交换机和路由器都会使用这个地址进行数据包转发。
```


- ping的原理

1. 基于ICMP协议的网络工具;
2. 测试网络连接和诊断网络问题;
3. 原理是向目标主机发送数据包并等待该主机返回响应;
4. 发送附加时间戳，目标主机也会记录接收到的时间戳从而计算网络延迟;

- veth pair是什么

1. 一种Linux内核网络设备;
2. 用于创建一对虚拟的网络接口设备;
3. Docker中veth pair用来连接宿主机和容器网络;

- VLAN是什么

1. VLAN（Virtual Local Area Network，虚拟局域网）是一种将局域网分割成多个逻辑上的子网的技术。
2. 实现逻辑隔离：不同VLAN之间的设备之间无法直接通信，实现逻辑上的隔离。
3. 管理网络流量：可以根据需要将不同VLAN的流量进行不同的QoS(Quality of Service)策略处理。
4. 简化网络管理：可以按照业务需要、设备类型、用户等不同维度对网络进行管理，便于管理和维护。
5. 提高网络安全性：可以将安全要求较高的设备分配到单独的VLAN中，实现更为严格的安全控制。

- 虚拟交换机 Virtual Switch 是什么

1. 软件定义的网络交换机;
2. 运行在虚拟化平台上;
3. 管理虚拟机之间的网络通信;
4. 虚拟机之间进行流量转发，并提供通用网络服务;
5. 虚拟网络和物理网络之间的桥梁;

- 交换机是什么

1. 一种网络设备;
2. 在计算机网络中将数据包从一个端口转发到另一个端口;
3. 根据目的地址转发数据包;
4. 设备有普通交换机、三层交换机、四层交换机、光纤交换机等;

- 什么叫广播风暴

广播风暴（Broadcast Storm）是指在计算机网络中，某个节点广播数据包或消息时，其他节点因无法处理而继续向其他节点广播，从而形成的一种网络问题。当网络中的广播数据包或消息数量过多时，网络将会被占满，网络流量将急剧增加，导致网络严重拥堵、延迟增加、数据丢失等问题。广播风暴通常是由于网络中出现了网络环路、网络设备故障、算法错误等原因而引起的。为避免广播风暴的发生，可以采用限制广播域的方法、配置合理的网络拓扑结构、使用网络设备的广播抑制功能等措施来解决。

1. 建立连接后双方持有socket，在linux文件系统上的表现是什么
2. 如果一直保持连接，中间的路由器离线了会怎么样
3. kubernetes的controller的watch机制，http2.0协议下保持连接，有没有保活机制
4. 服务端的连接已经释放了，客户端还是established继续发送数据会怎么样

### 相关资料

[深入K8S组网架构和Flannel原理](https://juejin.cn/post/6884881812145995790)
[https://github.com/cilium](https://github.com/cilium)
[https://cilium.io/](https://cilium.io/)
[https://docs.cilium.io/en/stable/](https://docs.cilium.io/en/stable/)
[https://hub.docker.com/r/cilium/cilium](https://hub.docker.com/r/cilium/cilium)
[使用 Cilium 作为网络插件部署 K8s + KubeSphere](https://zhuanlan.zhihu.com/p/471220158)
[在K8s集群上部署Istio的三种方式](https://zhuanlan.zhihu.com/p/135298580)
[Linux ip 命令](https://www.runoob.com/linux/linux-comm-ip.html)
[VPC浅谈](https://zhuanlan.zhihu.com/p/33658624)
[关于阿里经典网络问题](https://www.sohu.com/a/127408616_465914)