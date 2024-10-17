---
hide: true
---
# GMP 原理与调度

[GMP 原理与调度](https://www.topgoer.com/%E5%B9%B6%E5%8F%91%E7%BC%96%E7%A8%8B/GMP%E5%8E%9F%E7%90%86%E4%B8%8E%E8%B0%83%E5%BA%A6.html)

1. M (thread)  G (goroutine) P (Processor)
2. P在启动时创建，保存在数组之中，数量是GOMAXPROCS （决定同时执行的goroutine的最大数量）
3. 每个M代表1个内核线程 （runtime/debug 中的 SetMaxThreads 函数，设置 M 的最大数量）

### M和P的数量没有绝对关系，启动以后P是固定的而M是动态的

> M被阻塞的时候，P会创建或者切换到另一个M

### 一些简单的问题 work stealing && hand off

1. M关联的P无G消费的时候，是不是就会一直空闲在那里 （全局队列G和其他P的G都会被偷取）
2. G阻塞的时候，P会转移给其他空闲的M

### 在Go中，一个goroutine最多占用CPU 10ms，防止其他goroutine被饿死 - 抢占式调度

### 调度器的生命周期

1. 创建P\G\M
2. 运行M
3. M和P绑定
4. M通过P获取到G进行消费 （M肯定通过P呀、P是M的本地队列呀）
5. M获取不到G的时候休眠
6. P绑定M的时候唤醒

main.main > runtime.main -> runtime.exit or runtime.main finish

### 可视化GMP编程
1. go tool trace
2. debug trace

### 线程自旋：系统中最多有 GOMAXPROCS 个自旋的线程

### goroutine的状态有多少个

### GMP相关调优

1. GOMAXPROCS配置 决定P的数量也就是  能够并行执行的goroutine的最大数量


### 已经被废弃的GM 和 最新的GPM 的对比 
```
本质上就是增加了 "M 的本地队列"

如果M获取每一个G都要去全局队列获取，和其他M抢夺G，就需要大量的加锁解锁
```

### 本质上就是增加了 M 的本地队列 、 本质上就是增加了 M 的本地队列、本质上就是增加了 M 的本地队列

### M 的 P 里面的G可以是 全局队列拿的，也可以是其他 P 的本地队列拿的

> 每个 M 都代表了 1 个内核线程，OS 调度器负责把内核线程分配到 CPU 的核上执行


### 关于数量

1. M是动态的不够用的时候就会创建 （随时创建） 只能限定最大数量
2. P是固定数量的 GOMAXPROCS配置 （启动时候就创建）

### M 执行 G 的时候发生阻塞，那么 M 会失去原有的 P（摘除），然后创建新的 M 服务这个 P

[GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)