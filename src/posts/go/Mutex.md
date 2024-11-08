---
title: mutex包
tags:
  - GO原理
categories:
  - go
---


### 一、常用API

```go
var mutex sync.Mutex
mutex.Lock()
// 访问共享资源的临界区代码
mutex.Unlock()
```

### 二、源码设计理解


```go
type Mutex struct {
	state int32 // 锁状态（加锁、解锁等状态）
	sema  uint32 // 信号量（semaphore）主要用在等待队列
}


// Mutex.state的值
const (
  // 互斥锁被锁定的状态。当一个 goroutine 成功获取了互斥锁时，该标志被设置为 1
	mutexLocked
  // 正在等待互斥锁的 goroutine 被唤醒时，该标志被设置 
	mutexWoken
  // 互斥锁处于饥饿状态 - 等待互斥锁的 goroutine 等待时间超过一定阈值（1ms）时
	mutexStarving
	mutexWaiterShift

  // 1.正常模式下，等待互斥锁的 goroutine 以先进先出（FIFO）的顺序排队
  //            被唤醒的等待者并不直接拥有互斥锁，而是需要与新到达的 goroutine 竞争锁的所有权
  //            新到达的 goroutine 有优势


  // 2.饥饿模式，互斥锁的所有权直接从解锁的 goroutine 传递给等待队列头部的等待者
  //          新到达的 goroutine 不会尝试获取看起来未被锁定的互斥锁，
  //          也不会进行自旋等待，而是排在等待队列的尾部

  // 定义了饥饿模式的阈值时间，即 1 毫秒（1e6 纳秒）
	starvationThresholdNs
)
```

1. 如何加锁的

```go
func (m *Mutex) Lock() {
	// CAS原子操作函数
  // 尝试将变量m.state的值从0原子地替换为mutexLocked
  // 如果当前m.state的值确实是0，则进行替换并返回true
  // 假设0代表互斥锁的初始未锁定状态，而mutexLocked代表锁定状态
  // 理想情况一个CAS就可以获取锁
	if atomic.CompareAndSwapInt32(&m.state, 0, mutexLocked) {
    // race.Enabled表示是否开启了数据竞争检测
		if race.Enabled {
      // race.Acquire标记一个特定的内存位置被当前操作获取或锁定
      // unsafe.Pointer(m)将一个对象或变量的地址转换为unsafe.Pointer类型
		  race.Acquire(unsafe.Pointer(m))
		}
    // 如果成功将互斥锁状态从未锁定变为锁定
    // 直接返回 - 意味着当前的 goroutine 成功获取了互斥锁
		return
	}

	// 没有获取到锁
  // 会阻塞在这
	m.lockSlow()
}


func (m *Mutex) lockSlow() {
  // 如果没有锁定
  // 最复杂的如何保证高效和避免协程饿死的逻辑在这
  for {
    // 不断循环检查信号量
    atomic.CompareAndSwapInt32(mutexLocked|mutexStarving,m.state)
  }
}

// 单核或者GOMAXPROCS=1的情况下不会自旋
```


1. 获取锁的goroutine获取不到锁的时候会自旋等待几次，如果自旋几次都获取不到锁，那么通过sema信号量排队等待，等待者先入先出

2. 第一个等待者在锁释放时候需要和后来的自旋状态的goroutine竞争，如果竞争失败会加入等待队列的头部

3. 等待超过1ms后，锁会变成饥饿模式，饥饿模式下，mutext.Unlock的时候会把锁直接给等待队列头部的goroutine，后来goroutine也不会自旋，而是直接放在队列尾部

4. 如何解锁的
    - 饥饿模式解锁会直接把锁给等待队列头部的
    - 检查是否要切回正常模式

5. 如何保证高效的同时又避免协程饿死的
  - 排队后队列头部的goroutine和自旋的竞争保证高效率
  - 饥饿模式让队列头部的goroutine直接获得锁防止goroutine饿死



[Golang合集](https://www.bilibili.com/video/BV1hv411x7we)