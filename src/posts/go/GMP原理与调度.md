# GMP原理与调度

### 一、概念

##### 1.G（Goroutine）轻量级用户线程
    
    用户态的线程，轻量级，上下文切换全部由语言层面实现，初始栈大小通常只有2KB左右。

##### 2.M（Machine）操作系统线程

    M从调度队列中获取到一个Goroutine后，就会开始执行它，如果 Goroutine 发生了阻塞（如进行 I/O 操作、等待锁等），M会尝试从本地调度器的队列中获取其他可执行的 Goroutine 来继续执行。runtime/debug.SetMaxThreads设置M的最大数量。

##### 3.P（Processor）逻辑处理器

    P是Go运行时对操作系统资源的一种抽象，它可以看作是一个逻辑处理器。管理和调度 Goroutine，每个 P 都有自己的本地 Goroutine 队列。P相当于是M和G的中间人，M通过P获取G，如果 P 的本地队列为空，M 可以从其他 P 的队列或者全局队列中获取G。


### 二、设计策略

##### 1.工作窃取（Work-Stealing）算法

    P的本地 Goroutine 队列空了，它可以从其他 P 的队列或者全局队列中 “窃取” Goroutine 来执行，高效的调度机制。

##### 2.动态调整 M（Machine）的数量

    在系统负载较轻时，不会因为过多的线程而浪费系统资源；而在系统负载较重，需要更多的计算资源时，能够及时地增加线程数量来满足需求。

#### 3.hand off 机制

    本线程因为 G 进行系统调用阻塞时，线程释放绑定的 P，让 M 挂载其他 P，执行其他P的G，让M的资源得到更高效率的应用。


### 三、GMP的状态流转

##### 1.Goroutine状态

> Go\src\runtime\runtime2.go

1. _Gidle = 0     刚刚被分配并且还没有被初始化
2. _Grunnable = 1 准备好被调度器分配到一个处理器核心上执行，但还未被选中执行
3. _Grunning = 2  正在一个处理器核心上执行时，被赋予了内核线程 M 和处理器 P
4. _Gsyscall = 3  当goroutine正在执行一个系统调用时，它处于系统调用状态，goroutine 会被阻塞，例如，进行文件 I/O、网络 I/O 
5. _Gwaiting = 4  当goroutine正在等待某个条件满足时处于等待状态,比如等待一个通道（channel）或者time.Sleep.
6. _Gdead = 6     当goroutine已死亡，不再执行任何代码，也不会被调度器再次调度执行，占用的资源（如栈空间等）可以被回收.

> 有几个状态是不用去理会的

- _Genqueue_unused（目前未使用）
- _Gcopystack=8 （不在运行队列上） 
- _Gpreempted=9 （没有执行用户代码）
- _Gscan=10 GC （没有执行代码，可以与其他状态同时存在 ）

##### 2.M状态

1. 执行用户代码（Executing user code）正在执行一个 goroutine 的用户代码
2. 执行系统调用（Executing system call）进行文件 I/O、网络 I/O 等操作时.
3. 闲置状态（Idle）
4. 自旋状态（Spinning）
    当没有可运行的 goroutine 但是预计很快就有新的 goroutine，减少上下文切换的开销，不进入闲置而是直接自旋.

##### 3.P状态

1. Pidle：当前p尚未与任何m关联，处于空闲状态
2. Prunning：当前p已经和m关联，并且正在运行g代码
3. Psyscall：当前p正在执行系统调用
4. Pgcstop：当前p需要停止调度，一般在GC前或者刚被创建时
5. Pdead：当前p已死亡，不会再被调度


### 相关文章

[Go调度系列--GMP状态流转](https://zhuanlan.zhihu.com/p/618222173)

### 四、Q&A

1. M和P的数量关系

    M和P的数量没有绝对的关系，因为M是动态的，只是执行之中的M只能有1个P，启动以后P是固定的而M是动态的。P的数量是可以使用runtime.GOMAXPROCS设置。M是动态的不够用的时候就会创建 （随时创建） 只能限定最大数量，P是固定数量的 GOMAXPROCS配置 （启动时候就创建）.

2. GMP之中的抢占式调度是什么意思
    
    一种任务调度策略。在这种策略下，操作系统（或运行时环境）可以在一个任务（如线程、进程或 Go 语言中的 Goroutine）执行过程中，中断它的执行，将 CPU 资源分配给其他任务。注意：不依赖任务自身主动放弃 CPU 资源，而是由系统强制进行资源分配。
    
    比如在 Go 中，一个 goroutine 占用 CPU 较长时间（并非严格的10ms），运行时（runtime）会中断它的执行，主要基于信号（如 SIGURG）来触发抢占，比如运行时发送信号暂停这个Goroutine的执行，防止其他 goroutine 被饿死，这是抢占式调度。


3. GMP的一个M对应操作系统内核的一个线程，对吗

    在 Go 语言的 GMP 模型中，一个 M（Machine）通常对应操作系统内核的一个线程。M 是真正执行计算任务的实体，它需要借助操作系统提供的线程来运行，这些线程可以在 CPU 上执行指令。

4. 在G里面创建G(go func(){xxx})

    在Go语言中的GMP模型中，创建Goroutine的时候，协程创建后会将G直接加入P的本地队列runq之中。

5. goroutine在time.Sleep后状态流转是什么样子的

    goroutine当执行 time.Sleep 时，goroutine 进入等待中状态（Waiting），指定的睡眠时间过去后，goroutine 再次变为可运行状态（Runnable），等待被调度器分配到一个处理器核心上执行。

6. goroutine的唤醒是如何实现的

    - channel
    - time.After\time.Ticker
    - sync.Cond

7. sync.Cond的底层

    ```go
    type Cond struct {
        // 本质是使用互斥锁实现的
        L Locker
        // 管理等待条件满足的 Goroutine 列表
        // 简单理解为它包含了一个用于存储等待 Goroutine 相关信息的队列结构
        notify  notifyList
        // 防止Cond结构被意外复制
        // checker结构会在运行时检查Cond是否被复制一旦发现复制行为会触发错误
        checker copyChecker
    }
    ```

### 相关资料

- [GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)
- [topgoer GMP 原理与调度 - 简单易懂](https://www.topgoer.com/%E5%B9%B6%E5%8F%91%E7%BC%96%E7%A8%8B/GMP%E5%8E%9F%E7%90%86%E4%B8%8E%E8%B0%83%E5%BA%A6.html)
- [GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)
- [GMP 原理与调度](https://www.topgoer.com/%E5%B9%B6%E5%8F%91%E7%BC%96%E7%A8%8B/GMP%E5%8E%9F%E7%90%86%E4%B8%8E%E8%B0%83%E5%BA%A6.html)
- [Go调度系列--GMP状态流转](https://zhuanlan.zhihu.com/p/618222173)
- [幼麟实验室Golang](https://www.bilibili.com/video/BV1hv411x7we)