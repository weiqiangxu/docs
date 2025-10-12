---
title: 集成kata
category:
  - docker
tag:
  - docker
---

> 理解CRI标准


### 一、离线安装Docker

> https://download.docker.com/linux/static/stable/aarch64/docker-23.0.4.tgz

### 二、kata-containers安装

1. 检测是否支持kata-containers

``` bash
# 先查看当前架构
$ uname -a

# Intel的处理器支持Intel VT-x技术，而AMD的处理器支持AMD SVM技术
# aarch64\arm64 支持 ARM Hyp
# 支持kvm
$ kata-runtime kata-check

# 输出表示支持
# System is capable of running Kata Containers
# System can currently create Kata Containers
```

2. 安装教程

[kata-containers/docs/install](https://github.com/kata-containers/kata-containers/tree/main/docs/install)

### 三、配置docker使用kata-containers

``` bash
# 第一种方式：systemd
$ mkdir -p /etc/systemd/system/docker.service.d/

$ cat <<EOF | sudo tee /etc/systemd/system/docker.service.d/kata-containers.conf
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -D --add-runtime kata-runtime=/usr/bin/kata-runtime --default-runtime=kata-runtime
EOF
```

``` bash
# 第二种方式：daemon.json
$ vim /etc/docker/daemon.json
```

``` yml
{
  "default-runtime": "kata-runtime",
  "runtimes": {
    "kata-runtime": {
      "path": "/usr/bin/kata-runtime"
    }
  }
}
```

``` bash
# 查看docker支持的runtime有哪些
$ docker info | grep runtime
```

### 四、验证使用kata-containerd启动容器

``` bash
# 基于kata-runtime执行
$ docker run --net=none -itd --name centos-test centos:centos7

# 基于runc执行
# --net=none 网络模式为 "none"，表示该容器不与任何网络相连
$ docker run --net=none --runtime=runc -itd --name centos-test1 centos:centos7

# 进入容器之中
$ docker exec -it centos-test1  /bin/bash
$ docker exec -it centos-test  /bin/bash

# 运行时为runc的内存和运行时为kata-runtime的是不一样的
# 运行时为runc的内存和宿主机上直接的内存是一样的
$ free -m

```


### 疑问

- OCI runtime create failed: QEMU path (/usr/bin/qemu-kvm) does not exist

``` bash
$ yum install -y qemu-kvm
```
-  messages from qemu log: Could not access KVM kernel module: No such file or directory

``` bash
f2进入bios界面，查找virtual字样的选项，将其开启(enable)
```

- sandbox interface because it conflicts with existing route

``` bash
# 创建容器时，Docker无法为容器设置网络接口的IP地址
# 因为该IP地址与已经存在的路由发生了冲突
# 检查当前系统上的路由表和网络设置
--net=none
```

- 容器安全

使用Docker轻量级的容器时，最大的问题就是会碰到安全性的问题，其中几个不同的容器可以互相的进行攻击，如果把这个内核给攻掉了，其他所有容器都会崩溃。
如果使用KVM等虚拟化技术，会完美解决安全性的问题，但响应的性能会受到一定的影响。
单单就Docker来说，安全性可以概括为两点： - 不会对主机造成影响 - 不会对其他容器造成影响所以安全性问题90%以上可以归结为隔离性问题。
而Docker的安全问题本质上就是容器技术的安全性问题，这包括共用内核问题以及Namespace还不够完善的限制： 
1. /proc、/sys等未完全隔离 
2. Top, free, iostat等命令展示的信息未隔离 
3. Root用户未隔离 
4. /dev设备未隔离 
5. 内核模块未隔离 
6. SELinux、time、syslog等所有现有Namespace之外的信息都未隔离

- arm64 和 aarch64 是什么关系

``` txt
arm64 和 aarch64 是同一架构的两个不同名称。
它们都指的是 ARMv8-A（也称为 ARMv8，或者 simply ARM64）指令集架构。
AArch64 是 ARMv8-A 的官方名称，而 arm64 是苹果公司用于描述其 64 位 ARM 架构（即 AArch64）的术语。
因此，它们只是不同的命名方式。
```

- ARM Hyp 是什么来的

``` txt
ARM Hypervisor（简称 ARM Hyp）是 ARM 公司推出的一种虚拟化技术，旨在为 ARM 架构下的虚拟化提供支持。
ARM Hypervisor 通过在硬件和软件层面上提供虚拟化支持，可以将多个操作系统或者虚拟机同时运行在单一的 ARM 处理器上。
```

- 运行时环境变量

``` bash
# 可以在kata-runtime模块查看到config文件
# kata-containers/configuration.toml的路径
$ kata-runtime kata-env
```

- docker的网络知识

``` bash
# 列出所有当前系统中存在的 Docker 网络
$ docker network ls

# 默认一共有3种网络
# [root@worker01 ~]# docker network ls
# NETWORK ID          NAME                DRIVER              SCOPE
# d813d4a6408a        bridge              bridge              local    桥接模式
# eaa62c897209        host                host                local    宿主模式
# 59edd3de4fde        none                null                local

# --net指定网络
$ docker run -itd --net=host  --name centos-test centos:centos7 

# docker run 默认使用的net网络是bridge 吗？--net=bridge 和 --net=default是不是同一个
$ docker run #默认使用的网络是bridge网络，而--net=bridge 和 --net=default是同义词,它们都表示使用Docker默认的bridge网络

# Docker中的bridge模式是桥接模式，用于在多个容器之间建立网络连接
# host模式则是将容器直接放在宿主机的网络命名空间中，可以直接使用宿主机的网络接口和端口，端口冲突概率更大
```

- bridge 和 host 网络有什么区别

Docker支持用户自定义四种网络模式：bridge、host、overlay和macvlan。其中比较常用的是bridge和host网络，两者的区别如下：
1. Bridge网络模式：使用Docker默认的bridge网络模式进行通信。Docker容器可以通过同一bridge网络的IP地址相互通信，同时也可以与宿主机进行通信。但是，容器之间的通信需要通过网络转发，可能会降低通信速度。
2. Host网络模式：使用宿主机的网络进行通信，容器会直接使用宿主机的网络接口，可以通过宿主机的IP地址进行通信，容器启动后就可以访问宿主机上的服务。但是，在Host网络模式下，容器的端口会被绑定到宿主机上，可能会导致端口冲突。
综上所述，Bridge网络模式适用于容器之间需要相互通信的场景，Host网络模式适用于容器需要直接访问宿主机上的服务的场景。

- docker run --net=bridge的时候出现 conflict exist route 怎么排查路由冲突

- 什么叫做路由冲突

``` bash
$ ifconfig
# 如果输出的docker0的网络接口 inet 172.17.0.1 ，还有另一个存在一个名为 `eth0` 的网络接口，其 IP 地址为 `172.17.1.100`，子网掩码为 `255.255.0.0`
# 那么表示冲突：ifconfig 输出有2个网络接口的inet一模一样
```

- ifconfig输出的`docker0` 和`eth0`是什么意思

ifconfig命令用于查看和配置网络接口。在Linux系统中，docker0和eth0是两个常见的网络接口，其含义如下：
1. docker0：是Docker容器的默认网桥接口，它用于将Docker容器连接到宿主机网络上。当使用Docker创建容器时，容器会自动创建并连接到docker0网桥上，从而能够实现与宿主机以及其他容器的网络通信。
2. eth0：是Linux系统默认的第一个以太网接口，通常连接到物理网络上。Linux系统中的网络连接都是基于网络接口的，eth0是最常用的网络接口之一，它通常用于连接到Internet或局域网中的其他设备。

- route -n查看的是什么东西

``` bash
# 主机的路由表信息

$ route -n 
$ ifconfig 

# route -n命令显示的是网络路由表，而ifconfig命令显示的是网络接口信息，一些情况下，docker0接口可能会被添加到路由表中
# kata containerd和docker0都使用默认的网段172.17.0.0。这是因为它们都属于Docker网络模型的一部分
# 但是可以改变kata-agent或者docker容器的网段

# docker容器启动的时候
$ docker run --network=192.168.0.0/16 <image_name>
$ docker run --network=host <image_name>
```

- docker run的时候为什么runtime更改为runc时候正常，更改为kata-runtime 却告知conflict exist route

``` bash
# 更改为kata-runtime时，会使用一个不同的网络命名空间
# 而这个命名空间可能与先前运行的容器使用的命名空间冲突
# 在运行容器时指定一个不同的网络命名空间
# 默认是bridge
$ docker run --runtime=kata-runtime --network=host myimage
```

- docker run 的网络命名空间是什么

容器与主机或其他容器之间的网络隔离环境。每个容器都会有自己的网络命名空间（内部 IP 地址、端口等网络配置信息隔离），默认有（bridge桥接、host宿主），也可以自己创建，docker run的时候指定网络。

- ifconfig之中的docker0的inet是什么意思

``` txt
inet 是 inet_address
Docker daemon在安装时自动创建一个虚拟网络接口docker0
docker0的inet地址是指docker0网桥的IP地址
用于容器之间和宿主机之间通信

docker0接口是一个为Docker提供网络连接的虚拟网桥
inet地址是Docker网络的网段地址
docker0的inet地址与本地网络中的某个设备的IP地址冲突，就意味着在网络中存在重复的IP地址
```

- ifconfig之中的docker0的inet 的冲突表示什么意思

运行Docker时，发现docker0的inet地址与本地网络中的某个设备的IP地址有冲突，那么表示Docker虚拟网络与本地网络发生了IP地址冲突。
这可能导致网络连接问题，容器可能无法正常访问外部网络或本地网络。为解决这个问题，可以尝试更改Docker虚拟网络的子网地址，或在本地网络中修改IP地址。

- docker network之中的bridge网络命名空间之中，如何查看该命名空间下的所有ip和端口

### 相关链接

- [什么是容器安全](https://zhuanlan.zhihu.com/p/109256949)
- [Kata Containers如何与k8s集成](https://blog.gmem.cc/kata-containers-study-note)