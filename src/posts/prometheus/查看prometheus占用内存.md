---
title: 查看prometheus的占用内存大小
index_img: /images/prometheus_icon.jpeg
banner_img: /images/bg/5.jpg
tags:
  - prometheus
  - linux
categories:
  - prometheus
date: 2023-04-12 18:40:12
excerpt: 通过top命令和prometheus的metrics端点查看内存占用
sticky: 1
---

### 一、top的RES

``` txt
"top的RES"可能指的是Linux操作系统中"top"命令中的"RES"列，表示进程使用的实际物理内存大小（以KB为单位）
```

### 二、top查看占用内存

``` bash
# 获取pid
$ ps -ef | grep prometheus
# 获取pid对应的内存大小
$ top -p ${pid}
```

``` txt
PID USER      PR  NI    VIRT    RES           
4590 root      20   0 1205660  83016
```

### 三、metrics端口查看

``` bash
# 指标获取
$ curl localhost:9090/metrics

# 查看 (与top的res一致) 单位kb
process_resident_memory_bytes/1024
```

