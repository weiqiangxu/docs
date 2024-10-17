---
title: uname
index_img: /images/bg/linux.jpeg
banner_img: /images/bg/5.jpg
tags:
  - linux
categories:
  - linux
date: 2023-04-12 18:40:12
excerpt: 查看linux系统详细信息
---

### 一、实例

``` bash
[root@i-33D71DFC home]# uname -a
Linux k8s-master 4.19.90-23.4.v2101.ky10.aarch64 #1 SMP Wed Mar 3 15:41:26 CST 2021 aarch64 aarch64 aarch64 GNU/Linux

操作系统内核版本号:4.19.90-23.4.v2101.ky10.aarch64
处理器架构:aarch64
```

### 二、如何理解

``` txt
Linux myserver 4.15.0-154-generic #161-Ubuntu SMP Fri Jul 23 17:59:01 UTC 2021 x86_64 x86_64 x86_64 GNU/Linux

- `Linux` 表示操作系统名称
- `myserver` 是主机名
- `4.15.0-154-generic` 是操作系统内核版本号
- `#161-Ubuntu` 是内核版本号的修订版号
- `SMP` 表示内核启用了多处理器支持
- `Fri Jul 23 17:59:01 UTC 2021` 是内核构建时间
- `x86_64` 表示处理器架构
- `GNU/Linux` 表示操作系统类型与内核类型
```
