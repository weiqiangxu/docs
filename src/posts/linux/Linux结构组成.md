---
title: Linux结构组成
index_img: /images/bg/linux.jpeg
banner_img: /images/bg/5.jpg
tags:
  - linux
categories:
  - linux
date: 2023-05-19 11:40:12
excerpt: Linux的文件系统目录结构理解，从内核到应用程序大致组成
sticky: 1
hide: false
---

### 一、操作系统结构图

1. Linux系统一般有四个主要部分：内核、shell、文件系统、应用程序。

> shell是系统的用户界面，提供了用户与内核进行交互操作的接口，它接收用户输入的命令并将它送到内核去执行。

![系统结构](/images/linux系统结构.jpeg)

2. Linux内核主要由以下几部分组成：内存管理、进程管理、设备驱动程序、文件系统、网络管理等

![内核组成](/images/内核组成.jpeg)

系统调用接口（System Call Interface）这一层提供了 某些机制执行从用户空间到内核空间的函数调用，从上面可以看到用户空间指的是哪一层。

3. 虚拟文件系统（Virtual File System）提供了open\close\read\write的API

![虚拟文件系统VFS](/images/vfs.jpeg)

5. Linux文件类型

普通文件：分为纯文本文件和二进制文件，如C语言代码、shell脚本、二进制可执行文件等；
目录文件：目录是存储文件的唯一地方；
链接文件：指向同一个文件或目录的文件；
设备文件：与系统外设相关的，一般在目录/dev下面。设备分为块设备和字符设备；
管道文件：提供进程间通信的一种方式；
套接字文件：与网络通信相关的文件；

### 二、Linux目录结构

![linux目录结构](/images/linux目录结构.jpeg)

### 相关疑问

- apt 和 apt-get 什么关系
- rpm apt yum 什么关系

### 相关资料

[一文带你全面掌握Linux系统体系结构](https://www.zhihu.com/collection/307882235)