---
title: 抢占式调度
tags:
  - GO原理
categories:
  - go
date: 2023-04-08 06:40:12
index_img: /images/bg/computer.jpeg
hide: true
---

### 关键术语

1. time.sleep后 _Grunning 和 _Gwaiting，timer之中的回调函数将g变成Grunnable状态放回runq
2. 以上谁负责执行timer之中的回调函数呢 (schedule()->checkTimers)
3. 监控线程（重复执行某一个任务） - 不依赖GMP、main.goroutine创建 ， 监控timer可以创建线程执行
4. IO时间监听队列 - 主动轮询netpoll

[Golang合集](https://www.bilibili.com/video/BV1hv411x7we)