---
title: ifconfig怎么读
index_img: /images/bg/linux.jpeg
banner_img: /images/bg/5.jpg
tags:
  - linux
categories:
  - linux
date: 2023-04-12 18:40:12
excerpt: 如何读ifconfig输出
hide: false
---

### 一、实例

``` bash
# ifconfig只能查看本机的网络配置和IP地址
[root@i-33D71DFC ~]# ifconfig

# 网卡名称或者叫网络接口名称: enp1s0
# 后面的<>必须要有UP才表示启用状态 如果没有启用可以使用 ip link set xxx up
enp1s0: flags=4163< UP,BROADCAST 支持广播,RUNNING ,MULTICAST 支持多播 >  mtu 1500 最大传输单元为1500字节（网络接口能够传输的最大数据大小）
        # IP 地址           # 子网掩码              # 当前网络接口的广播地址
        inet 10.16.123.39  netmask 255.255.248.0  broadcast 10.16.207.255
        # ipv6地址
        inet6 fe80::ca83:3404:d922:1960  prefixlen 64  scopeid 0x20<link>
        # ether查看 MAC 地址
        ether d0:0d:33:d7:1d:fc  txqueuelen 1000  (Ethernet)
        # 接受和发送的数据包数量和字节数
        RX packets 34122  bytes 612851235 (584.4 MiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 31682  bytes 5632014 (5.3 MiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 311  bytes 27368 (26.7 KiB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 311  bytes 27368 (26.7 KiB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

virbr0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
        inet 192.168.122.1  netmask 255.255.255.0  broadcast 192.168.122.255
        ether 52:54:00:0a:e9:3a  txqueuelen 1000  (Ethernet)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0
```

### 二、解释

```
执行 "ifconfig" 命令可以查看 Linux 系统上的网络接口信息。以下是该命令输出的一些字段及其含义：

- 网络接口名称（例如 enp0s3）：这是网络接口的名称，每个接口都有一个唯一的名称。
- flags 属性：它告诉您接口的当前状态，如是否启用（UP）、是否支持广播（BROADCAST）、是否运行（RUNNING）和是否支持多播（MULTICAST）。
- inet 属性：它显示分配给接口的 IP 地址。
- netmask 属性：它显示子网掩码。
- ether 属性：它显示该接口的 MAC 地址。
- RX 和 TX 计数器：它们表示接受和发送的数据包数量和字节数。
- 错误计数器：它们表示在传输或接收数据包时发生的错误数量。
- dropped 计数器：它们表示在传输或接收数据包时被丢弃的数据包数量。
- overruns 计数器：它们表示在传输数据包时，以高于接口处理能力的速度到达的数据包的数量。
- collisions 计数器：它们表示在传输数据包时，同一时间有多个设备试图传输数据包的数量。

通过查看这些信息，您可以了解有关每个网络接口及其配置的详细信息。
```

### 相关疑问

- linux如何查看当前机器的局域网ip

``` txt
在Linux系统中，可以使用如下命令查看当前机器的局域网IP：

1. 打开终端，输入命令：ifconfig，查看当前机器的网络信息。

2. 在ifconfig的输出结果中，找到本地连接的IP地址，通常是以“inet”开头的一行，例如：inet 192.168.1.100。

3. 以192.168.1.100为例，该地址是当前机器的IP地址，可以通过它获取当前机器的局域网IP。
    假设子网掩码为255.255.255.0，则将IP地址中的最后一段改为0，即192.168.1.0，这就是当前机器所在的局域网IP地址。

如果想查看当前机器所连接的网络设备的状态，可以使用命令：ip addr show。该命令可以列出当前机器所有的网络设备及其IP地址。
```

