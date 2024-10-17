---
title: GMP的让出创建恢复
tags:
  - GMP
  - GO
id: 1
categories:
  - go
  - gmp
date: 2013-11-06 06:40:12
hide: true
---

### 关键术语

1. newproc函数


### 协程状态

1. running
2. runable
3. waiting
4. syscall 
5. dead

### 备注

``` bash
$ OS系统调用前，先调用runtime·entersyscall函数将自己的状态置为Gsyscall
```

[Golang合集](https://www.bilibili.com/video/BV1hv411x7we)