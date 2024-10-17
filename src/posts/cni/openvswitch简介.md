---
title: openvswitch简介
index_img: /images/bg/network.png
banner_img: /images/bg/5.jpg
tags:
  - openvswitch
categories:
  - kubernetes
date: 2023-06-02 16:56:12
excerpt: 了解openvswitch程序是什么，运行进程有哪些，底层数据库的数据表结构有哪些，和虚拟机或者容器网络如何桥接网络
sticky: 1
---

### 一、什么是Open Flow协议

- 网络通信协议，定义了在SDN下网络流量控制机制
- 目标是可编程的、可定制的、可调整的网络解决方案

### 二、启动ovs之后查看相关进程

``` bash
$ ps aux | grep openvswitch

# 查询进程ID为65191的进程打开的文件或网络套接字的命令
$ lsof -p 65191

# 查看进程打开了多少个文件或者网络套接字,有一个进程/usr/sbin/ovs-vswitchd
$ lsof -p 21764

# 有一个db进程 ovsdb-server /etc/openvswitch/conf.db
$ ps -ef | grep ovsdb-server

# 主要有2个进程 ovs-vswitchd 和 ovsdb-server
```

### 三、数据库结构和 ovs-vsctl 有2个进程

- ovsdb-server 维护数据库/etc/openvswitch/conf.db
- ovs-vswitchd 核心daemon
- 两者通过unix domain socket /var/run/openvswitch/db.sock 互相通信

ovs-vsctl 与 ovsdb-server通信，来修改数据库。ovs-vswitchd会和ovsdb-server进行通信，来对虚拟设备做相应的修改。

![数据表结构](/images/vs-db1.png)

> 通过 `cat /etc/openvswitch/conf.db` 或者 `ovsdb-client dump` 可以查看数据库表

![数据表之间的关系](/images/ovs-db2.png)
![ovs在多台宿主机之间创建虚拟网桥网卡控制器形式转发流量](/images/ovs-1.png)
![解释什么叫做流表](/images/ovs-3.png)
![ovs在单宿主机之间数据走向标准](/images/ovs-2.png)
![ovs与内核模块之间的关系](/images/ovs-4.png)
![ovs内部模块架构图](/images/ovs-arch.png)

### Q&A

1. 东西向和南北向流量指的是什么

东西向指的是pod与pod之间，南北向指的是宿主机和pod之间的流量。

### 相关资料

- [set-manager主动连接ovsdb操作流解释](https://blog.csdn.net/wanglei1992721/article/details/105382332)
- [刘超的通俗云计算](https://www.cnblogs.com/popsuper1982/p/3800574.html)