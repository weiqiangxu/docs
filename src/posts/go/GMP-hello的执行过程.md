---
title: GMP-hello的执行过程
tags:
  - GO原理
categories:
  - go
date: 2023-04-08 06:40:12
index_img: /images/bg/computer.jpeg
hide: true
---

### 关键术语
1. 进程虚拟地址空间中的代码段
2. 程序执行入口 runtime.main 创建 main.goroutine （call main.main）
3. 协程对应的数据结构是runtime.g，工作线程对应的数据结构是runtime.m，处理器P对应的数据结构是 runtime.p (本地runq)
4. 全局runq 存储在 全局变量 sched （调度器，对应的数据结构是 runtime.schedt）
5. P程序初始化过程之中进行调度器初始化，初始化固定数量的 P (GOMAXPROCS)
6. start函数开启调度循环schedule()函数
7. time.sleep 调用 gopark函数
```
协程的状态从 _Grunning修改为_Gwaiting 


(main.goroutine就不会因为执行完成回到P之中而是timer之中等待) 
然后使用 schedule() 调度执行其他的goroutine


时间到了以后 _Grunnable 状态然后G被访问P的runq之中，main.main结束
```


> M 可以去 P 获取 G，所以不用再去全局队列和其他M争抢G了
> 全局变量 sched 调度器记录所有空闲的m 和空闲的p 等 以及全局 runq
> M 优先从关联的 P 获取 G，没有的话去全局变量 sched 调度器的全局runq领取 G ， 如果调度器也没有那么从别的 P 的runq 获取G 




### 协程创建后会加入 P 的本地队列runq之中
### main.main运行结束以后runtime.main会调用exit函数结束进程


[Golang合集](https://www.bilibili.com/video/BV1hv411x7we)