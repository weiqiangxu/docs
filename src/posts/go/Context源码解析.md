---
hide: true
---
# 来刷一下context源码

> 主要弄清楚 WithValue\WithTimeout\WithDeadline\WithCancel 如何实现
> 子上下文和父上下文如何相互通讯的

1. 跟上下文被子协程A添加了timeout会影响到同样适用跟上下文的协程B吗

> 不会

2. background和todo有什么区别

> 两个都是 emptyCtx int 都实现了接口 context.Context 

3. context源码角度是一个什么样的结构

> context.Context是一个interface 也就是一个待实现的接口

4. WithCancel() 和 WithTimeout() 可以通知多个goroutine, 如何实现的


5. ctx的key为name的value被子协程更改后，在主协程会变更吗

> 不会变

6. WithTimeout和WithCancel等本质上做了什么事情

```
context包有结构体 cancelCtx timerCtx valueCtx 
本质上每一次WithTimeout都是重新创建一个结构体，并且把当前的接口体赋到新结构体的属性变量之中
所以结构体中存储parentContext
以context.WithCancel为例
如何在 parent.Done 的时候子 children.Done 呢
本质上是起一个协程并且阻塞在 case <-parent.Done() 
然后在阻塞通过后执行 children.Done

当执行 WithCancel 的时候，其实就是重新创建一个 cancelCtx 并且调用 propagateCancel 方法
监听父级别上下文的信号，保证父级上下文关闭后，子上下文也发出cancel信号
```

7. c.Value 的访问
```
每次 WithValue 都会封装一次 valueCtx，然后把值和key存储到新的 valueCtx 之中

c.Value 的访问，是对当前的上下文的value访问，如果找不到那么查找父级上下文，找不到继续如何迭代查找
```

8. WithTimeout如何实现的
```
源码是通过注册 time.AfterFunc 调用 ctx.cancel 函数执行的
```

9. 为什么说context是线程安全的，如何实现的

10. context读取value会有什么问题（时间复杂度讲一下）嵌套很多层会逐个访问O(N)

> contextl.Value的并发安全通过sync.Mutex实现

[GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)