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

### Q&A

1. goroutine在time.Sleep后状态流转是什么样子的

goroutine当执行 time.Sleep 时，goroutine 进入等待中状态（Waiting），指定的睡眠时间过去后，goroutine 再次变为可运行状态（Runnable），等待被调度器分配到一个处理器核心上执行。

