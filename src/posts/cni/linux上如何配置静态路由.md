---
title: 如何配置静态路由
tags:
  - kubernetes
categories:
  - kubernetes
---

> 熟悉常用的指令比如ip\route\ping\telnet\netestat等

### 一、什么是静态路由

通过手动配置路由表的方式，在网络中设置`固定的路由路径`以实现数据包的转发和路由选择的方法；

### 二、使用route配置静态路由

1. 将 169.254.0.0/16 网络的数据包转发到 10.16.200.0/21 子网中：

``` bash
# 将目标网络为169.254.0.0，子网掩码为255.255.0.0的数据包通过网关10.16.200.1进行路由转发
# 当本机需要访问169.254.0.0/16网络的时候，会直接通过10.16.200.1这个网关进行路由转发
# -net 169.254.0.0：指定要添加路由的网络地址。
# netmask 255.255.0.0：指定网络掩码。
# gw 10.16.200.1：指定网关 IP 地址。

$ route add -net 169.254.0.0 netmask 255.255.0.0 gw 10.16.200.1
```

2. 验证路由是否添加成功：

``` bash
$ route -n
```

### 三、使用ip命令配置静态路由

1. 添加静态路由

``` bash
# 将目标网络为169.254.0.0，子网掩码为255.255.0.0的数据包通过网关10.16.200.1进行路由转发
# 当本机需要访问169.254.0.0/16网络的时候，会直接通过10.16.200.1这个网关进行路由转发
# 将 169.254.0.0/16 网络的数据包转发到 10.16.200.0/21 子网中
# add 169.254.0.0/16：指定要添加路由的网络地址和掩码。
# via 10.16.200.1：指定网关 IP 地址。

$ ip route add 169.254.0.0/16 via 10.16.200.1
```

2. 验证路由是否添加成功：

``` bash
$ ip route
```


### 四、ping演示数据包流转

``` bash
$ ip route
# 默认网关是 10.16.207.254
default via 10.16.207.254 dev enp1s0 proto dhcp metric 100 
10.16.200.0/21 dev enp1s0 proto kernel scope link src 10.16.203.189 metric 100 
# （本机无法获取到有效IP地址时，会自动分配一个169.254.x.x的IP地址，并可以在enp1s0接口上进行通信）
169.254.0.0/16 dev enp1s0 scope link 
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 
192.168.122.0/24 dev virbr0 proto kernel scope link src 192.168.122.1 linkdown 

# 因为169.254.0.0/16是一个保留的私有IP地址范围，通常被用于自动配置设备的IP地址，例如当DHCP服务器不可用时。
# 在该路由表中，169.254.0.0/16 dev enp1s0 scope link被定义为本地链接，因此ping 169.254.1.1时
# 系统会尝试与本地连接的设备通信，但目标设备不可达，因此会返回"Destination Host Unreachable"。
$ ping 169.254.1.1
PING 169.254.1.1 (169.254.1.1) 56(84) bytes of data.
From 10.16.203.189 icmp_seq=1 Destination Host Unreachable
From 10.16.203.189 icmp_seq=2 Destination Host Unreachable
From 10.16.203.189 icmp_seq=3 Destination Host Unreachable

# 没有静态路由
$ ping 189.12.0.1 
PING 189.12.0.1 (189.12.0.1) 56(84) bytes of data.
64 bytes from 189.12.0.1: icmp_seq=1 ttl=52 time=368 ms
64 bytes from 189.12.0.1: icmp_seq=2 ttl=52 time=367 ms
64 bytes from 189.12.0.1: icmp_seq=3 ttl=52 time=366 ms


# 下一跳是网关 10.16.200.1
$ ip route add 189.12.0.0/16 via 10.16.200.1
$ ip route
default via 10.16.207.254 dev enp1s0 proto dhcp metric 100 
10.16.200.0/21 dev enp1s0 proto kernel scope link src 10.16.203.189 metric 100 
169.254.0.0/16 dev enp1s0 scope link 
172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 
189.12.0.0/16 via 10.16.200.1 dev enp1s0 
192.168.122.0/24 dev virbr0 proto kernel scope link src 192.168.122.1 linkdown 

$ ping 189.12.0.1  
```


如果需要通过ping演示，则需要满足以下条件：

1. 本机的IP地址不属于169.254.0.0/16网络；
2. 网络中存在一个IP地址为10.16.200.1的网关；
3. 目标主机的IP地址属于169.254.0.0/16网络。

假设目标主机的IP地址为169.254.1.1，可以通过以下命令进行ping测试：

``` bash
# 根据路由表，数据包将通过enp1s0网络接口发送，首先发送到10.16.200.1
# 然后到达目标地址189.12.0.1。如果没有其他的网络配置或防火墙规则阻止，数据包应该能够到达并从目标地址返回。
ping 169.254.1.1
```

如果静态路由配置正确，且网络中存在可达目标主机的路径，那么ping应该可以正常回应。