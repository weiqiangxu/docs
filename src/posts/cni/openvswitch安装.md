---
title: openvswitch安装
index_img: /images/bg/network.png
banner_img: /images/bg/5.jpg
tags:
  - openvswitch
categories:
  - kubernetes
date: 2023-06-02 09:40:12
excerpt: 如何使用源码编译方式安装openvswitch
sticky: 1
---

### 一、安装步骤概览

- [1. 下载ovs tar或者git clone 源码](#1-下载ovs-tar或者git-clone-源码)
- [2. Configure](#2-configure)
- [3. Build](#3-build)
- [4. Starting](#4-starting)
- [5. Test](#5-test)

源码编译方式安装[官方手册](https://docs.openvswitch.org/en/latest/intro/install/general/)

- 构建要求

``` bash
1. GNU make
2. A C compiler, such as: 
      GCC 4.6 or later
      Clang 3.4 or later
      MSVC 2013.
3. libssl (optional)
4. libcap-ng (optional)
5. Python 3.4 or later.
6. Unbound library (optional)
```

- 安装要求

``` bash
1. 与构建ovs库兼容的共享库
2. 兼容内核模块的内核
3. iproute2 中的"tc" 程序 [link](https://wiki.linuxfoundation.org/networking/iproute2)
4. /dev/urandom in linux
```

### 二、开始安装

1. 下载ovs tar或者git clone 源码

``` bash
# 下载页面
http://www.openvswitch.org//download/
# 选择版本
https://www.openvswitch.org/releases/openvswitch-3.1.1.tar.gz
```

2. 下载ovs tar或者git clone 源码

``` bash
# 解压 
$ tar zxvf openvswitch-*.tar.gz

# 进入解压目录
$ cd openvswitch-*
```

3. Configure

参考[install configuring](https://docs.openvswitch.org/en/latest/intro/install/general/#configuring)

``` bash
# By default all files are installed under /usr/local. 
# Open vSwitch also expects to find its database in /usr/local/etc/openvswitch by default. 
# If you want to install all files into, e.g., 
# /usr and /var instead of /usr/local and /usr/local/var 
# and expect to use /etc/openvswitch as the default database directory, 
# add options as shown here:

# 改变一下默认文件夹
$ ./configure --prefix=/usr --localstatedir=/var --sysconfdir=/etc
```

3. Build

``` bash
$ make
$ make install
```

``` bash
# 内核模块开启查看
# 系统中加载openvswitch内核模块
$ /sbin/modprobe openvswitch
$ /sbin/lsmod | grep openvswitch
```

4. 添加环境变量并启动服务

``` bash
# 方式一
$ echo $PATH
$ export PATH=$PATH:/usr/share/openvswitch/scripts
$ ovs-ctl start
```

``` bash
# 方式二
$ echo "export PATH=$PATH:/usr/share/openvswitch/scripts" | tee -a ~/.bash_profile
$ source ~/.bash_profile
$ echo $PATH
```

5. Test

``` bash
$ ovs-vsctl show
```