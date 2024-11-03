# goroutine状态

### 一、Goroutine状态

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

### 二、M状态

1. 执行用户代码（Executing user code）正在执行一个 goroutine 的用户代码
2. 执行系统调用（Executing system call）进行文件 I/O、网络 I/O 等操作时.
3. 闲置状态（Idle）
4. 自旋状态（Spinning）
    当没有可运行的 goroutine 但是预计很快就有新的 goroutine，减少上下文切换的开销，不进入闲置而是直接自旋.

### 三、P状态

1. Pidle：当前p尚未与任何m关联，处于空闲状态
2. Prunning：当前p已经和m关联，并且正在运行g代码
3. Psyscall：当前p正在执行系统调用
4. Pgcstop：当前p需要停止调度，一般在GC前或者刚被创建时
5. Pdead：当前p已死亡，不会再被调度

### Q&A

1. goroutine在time.Sleep后状态流转是什么样子的

goroutine当执行 time.Sleep 时，goroutine 进入等待中状态（Waiting），指定的睡眠时间过去后，goroutine 再次变为可运行状态（Runnable），等待被调度器分配到一个处理器核心上执行。

2. goroutine的唤醒是如何实现的

- channel
- time.After\time.Ticker
- sync.Cond


### 相关文章

[Go调度系列--GMP状态流转](https://zhuanlan.zhihu.com/p/618222173)