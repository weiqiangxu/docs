---
title: 如何手动给docker容器分配网络
index_img: /images/bg/network.png
banner_img: /images/bg/computer.jpeg
tags:
  - kubernetes
categories:
  - kubernetes
date: 2023-06-29 18:40:12
excerpt: 创建无网络的docker容器然后手动分配网络
sticky: 1
---

### 一、环境准备

- [docker](https://weiqiangxu.github.io/2023/04/18/%E8%AF%AD%E9%9B%80k8s%E5%9F%BA%E7%A1%80%E5%85%A5%E9%97%A8/docker%E7%A6%BB%E7%BA%BF%E5%AE%89%E8%A3%85/)

### 二、运行

1. 容器创建

``` bash
$ docker run --net=none -itd --name busybox-test busybox
$ docker exec busybox-test ip a
```

2. 创建宿主机的网桥br-test和pair对

``` bash
$ brctl show
$ brctl addbr br-test
$ ip link add veth-test1 type veth peer name veth-test2
$ brctl addif br-test veth-test1
$ ip link set veth-test1 up
```

3. 将pair对端网卡一端放在容器内部网络命名空间，给该网卡分配ip

``` bash

# 获取docker容器内部的网络命名空间net namespace
# docker inspect -f '{{.State.Pid}}' <container_name>
$ proc_id=$(docker inspect -f '{{.State.Pid}}' busybox-test)

# 将容器进程内部namespace链接到宿主机的namespace
$ local_namespace_name=123456789
$ ln -s /proc/$proc_id/ns/net /var/run/netns/$local_namespace_name

# 查看宿主机的namespace list
$ ip netns list

# 将对端网卡插入docker容器命名空间之中
$ ip link set veth-test2 netns $local_namespace_name

# docker容器已经有一个未分配ip和未启用的网卡
$ docker exec busybox-test ip a

# 重命名容器内部的网卡
$ ip netns exec $local_namespace_name ip link set dev veth-test2 name eth0

# 启用
$ ip netns exec $local_namespace_name ip link set eth0 up

# 分配ip
$ ip netns exec $local_namespace_name ip addr add 10.1.1.2/24 dev eth0
$ ip netns exec $local_namespace_name ip a
$ ip netns exec $local_namespace_name ip route

# 添加网关
$ ip netns exec $local_namespace_name ip route add default via 10.1.1.1

# 此时可以看容器的ip自动分配为10.1.1.2
$ docker exec busybox-test ip a

# 使用下面的操作更改IP地址
# sudo ip link set <interface_name> down
$ ip netns exec $local_namespace_name ip link set eth0 down

# 从名为eth0的网络接口上删除IP地址为10.1.1.2/24的配置
$ ip netns exec $local_namespace_name ip addr del 10.1.1.2/24 dev eth0

# 重新分配ip及子网掩码
# sudo ip addr add <ip_address>/<subnet_mask> dev <interface_name>
$ ip netns exec $local_namespace_name ip addr add 10.1.1.8/24 dev eth0

# 启用网卡
# sudo ip link set <interface_name> up
$ ip netns exec $local_namespace_name ip link set eth0 up

# 查看容器内网络
$ docker exec busybox-test ip a

# 进入容器内部
$ docker exec -it busybox-test /bin/sh
```

4. 验证容器网络

``` bash
# 启动网桥br-test并且分配ip以及子网掩码
ip addr add 10.1.1.1/24 dev br-test

# 网桥分配后会自动添加路由
$ ip route 

# 这句话表示在网络设备上配置了一个名为br-test的网桥，其IP地址为10.1.1.1
# 子网掩码为24位（即255.255.255.0）
# 该网桥与内核通信，被用于该设备上的本地通信，在该网桥上的设备可以通过该IP地址进行通信
# 10.1.1.0/24 dev br-test proto kernel scope link src 10.1.1.1

# ping 容器内部网卡ip
$ ping 10.1.1.8

PING 10.1.1.8 (10.1.1.8) 56(84) bytes of data.
64 bytes from 10.1.1.8: icmp_seq=1 ttl=64 time=0.084 ms
64 bytes from 10.1.1.8: icmp_seq=2 ttl=64 time=0.044 ms
```

### Q&A

1. linux的网卡配置路径一般是什么

在Linux系统上，网卡配置文件的路径一般是`cd `。这是一个常用的网卡配置文件路径，适用于大多数基于Debian或Ubuntu的发行版。
但是，需要注意的是，不同的Linux发行版可能会有不同的网络管理工具和配置文件路径。以下是一些其他流行的Linux发行版的网卡配置文件路径：

- CentOS、RHEL、Fedora：`/etc/sysconfig/network-scripts/ifcfg-<interface_name>`
- SUSE：`/etc/sysconfig/network/ifcfg-<interface_name>`
- Arch Linux： `/etc/netctl/<interface_name>`
- Ubuntu 18.04及更高版本：配置文件路径已经从`/etc/network/interfaces`变更为`/etc/netplan/`