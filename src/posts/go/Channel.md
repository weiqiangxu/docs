---
title: Channel
tags:
  - GO原理
categories:
  - go
date: 2023-04-08 06:40:12
index_img: /images/bg/computer.jpeg
hide: true
---

### channel的特性

1. 分配在堆上
2. 管道的数据结构是 hchan
3. 缓冲区就是数组
4. 两个队列（发送、接收）
5. 关闭状态 
6. 缓冲区buffer之中有sendx发送队列偏移和recevx接收偏移 - 环形缓冲区


### channel发送过程做了什么

1. 有没有goroutine在接收数据
2. 如果缓冲区已经满了，继续发送数据到channel的话会进入发送等待队列 sendq
3. 发送等待队列sendq (底层是sudog数据结构链表) 
4. sudog数据结构链表（记录拿个协程在等待、等待哪个channel）
5. g2接受 ch1 的数据，此时缓冲区就空余出1个
6. 唤醒发送队列 ch1 的 sendq 之中的 g1 , g1 此时将数据发送给 ch1


> 缓冲区有空余或者有gorotine在接收channel数据的时候才不会发生阻塞

### 多路select

``` txt
select 监听多个chanel 
被编译器编译为 runtime.selectgo

1. 按序加锁
2. 乱序轮询
3. 挂起等待
4. 按序解锁
5. 唤醒执行
6. 按序加锁
```

### 底层原理

1. 环形缓冲区
2. 等待队列
3. 阻塞与非阻塞式操作
4. 多路select
5. channel的send被编译器转换为runtime.chansend1()函数调用


### 数据结构

``` txt
hchan 数据结构

1. "环形"缓冲区 (实际上是一个数组)
2. 锁
3. 发送和接受的下标(sendx recvx)
4. goroutine阻塞在发送或者接收时候，会有发送队列和接受队列记录
5. 元素类型、大小、是否关闭
```

[Golang合集](https://www.bilibili.com/video/BV1hv411x7we)