---
title: Channel底层原理
categories:
  - go
---

### 一、常用API

```go
// 发送
chan <- xxx

// 接收
<- chan

// 关闭
close(chan)

// 缓冲区
make(chan int,5)
```

### 二、数据结构

```go
// Go\src\runtime\chan.go

type hchan struct {
	qcount   uint           // 队列中的总数据量
	dataqsiz uint           // 循环队列的大小
	buf      unsafe.Pointer // 缓冲区（数组）指针
	elemsize uint16
	closed   uint32
	timer    *timer // 向这个通道提供数据的计时器
	elemtype *_type // 元素类型
  // 假设buf长度是4，sendx会从 0-1-2-3-0 如此循环
  // 环形队列
	sendx    uint   // 发送队列偏移 
  // 假设buf长度是4，recvx会从 0-1-2-3-0 如此循环
	recvx    uint   // 接收队列偏移
	recvq    waitq  // 接收队列
	sendq    waitq  // 发送队列

	lock mutex
}

type waitq struct {
	first *sudog
	last  *sudog
}


type sudog struct {
  // 接收或者发送数据唤醒的goroutine
	g *g

	next *sudog
	prev *sudog
	elem unsafe.Pointer // data element (may point to stack)
  ...
}

// 初始状态下，buf缓冲区为空，recvx和sendx都是0
// 发送数据给channel的时候，sendx ++
// 从channel接收数据的时候，recex ++ 
```

### 二、channel的特性

1. 一般分配在堆上，Go的运行时决定。特定的情况下会分配到栈上。
	
	比如通道的生命周期非常短，并且是在一个函数内部创建和使用，并且 Go 运行时的逃逸分析（Escape Analysis）判定这个通道不会被函数外部引用，那么这个通道及其缓冲区可能会分配在栈内存中。中。

2. 缓冲区就是数组.
3. 两个队列（发送、接收）围绕着缓冲数组下标循环往复.发送和接收队列是有序的
4. 关闭状态接收返回零值.
5. 缓冲区buffer之中有sendx发送队列偏移和recevx接收偏移，围绕着环形缓冲区.


### 三、多路select处理逻辑

```go
// 下面的select多个管道就叫做多路select
// 有default就是非阻塞式
// 没有default就是阻塞式
select {
  case <-ch1:
  case <-ch2:
}
```

乱序轮询 ch1和ch2不是按顺序的是随机选择就绪通道

### 三、channel发送过程做了什么

1. 有没有goroutine在接收数据
2. 如果缓冲区已经满了，继续发送数据到channel的话会进入发送等待队列 sendq
3. 发送等待队列sendq (底层是sudog数据结构链表) 
4. sudog数据结构链表（记录哪个协程在等待、等待哪个channel）
5. g2接受 ch1 的数据，此时缓冲区就空余出1个
6. 唤醒发送队列 ch1 的 sendq 之中的 g1 , g1 此时将数据发送给 ch1

> 缓冲区有空余或者有gorotine在接收channel数据的时候才不会发生阻塞

[幼麟实验室Golang合集](https://www.bilibili.com/video/BV1hv411x7we)