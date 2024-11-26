---
title: RWMutex
category:
  - go
tag:
  - go
---


### 一、常用API

```go
var rwMutex sync.RWMutex
rwMutex.Lock()
// 进行写操作
rwMutex.Unlock()

var rwMutex sync.RWMutex
rwMutex.RLock()
// 进行读操作
rwMutex.RUnlock()
```

### 二、源码设计分析

```go
type RWMutex struct {
	w           Mutex        // 写锁互斥锁
	writerSem   uint32       // 写者信号量（用于写者等待所有读者完成）
	readerSem   uint32       // 读者信号量（用于读者等待写者完成）
	readerCount atomic.Int32 // 读者计数器（记录当前正在进行的读操作的数量）
	readerWait  atomic.Int32 // 读者计数器（记录正在等待写者开始的读者数量）
}
```

> 互斥锁保证写的并发安全，计数器readCount判断是否有读锁被持有

1. RUnlock
	减少读者计数器readerCount。
	读者计数器变为零。并且有写者在等待进行写操作，通过释放写者信号量writerSem来通知写者可以开始写操作。
2. RLock
	如果有写操作等待写操作完成。
	没有的话读者计数器readerCount增加。
3. Lock
	如果w互斥锁被持有或者有读操作正在进行，那么等待writerSem进入等待状态，
4. Unlock
	释放写锁互斥锁w，释放读者信号量readerSem通知读者可以开始读。


[GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)