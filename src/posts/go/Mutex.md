---
title: mutex包
tags:
  - GO原理
categories:
  - go
---

### goroutine 获得锁的逻辑

```
type mutex struct {
    state int32 // 未加锁
    sema uint32 // 信号量
}
```

> lock 和 unlock 都是atomic包提供函数原子性操作该字段 

1. 正常模式 goroutine自旋几次 - 原子操作获得锁 ，如果自旋几次都拿不到锁，则通过信号量排队等待 FIFO
2. 饥饿模式 goroutine加锁等待超过1ms后


### 正常模式
```
自旋、排队

高吞吐、尾端延迟
```

### 饥饿模式
```
FIFO
```

### Metex.State常量定义
```
表示已经加锁 mutexLocked
记录是否已有goroutine唤醒
...
```

[Golang合集](https://www.bilibili.com/video/BV1hv411x7we)