---
title: Go语言互斥锁(Mutex)详解：从原理到实践
tags:
  - go
categories:
  - go
---


## 一、概念与使用场景

互斥锁(Mutex)是Go语言`sync`包中提供的最基本的同步原语，用于保护临界区资源，确保在同一时刻只有一个goroutine可以访问共享资源，从而防止数据竞争和不一致状态。

### 主要使用场景：

1. **并发访问共享变量**：当多个goroutine需要读写同一个变量时
2. **保护复杂数据结构**：如map、slice等非线程安全的数据结构
3. **控制资源访问顺序**：确保某些操作按特定顺序执行
4. **实现其他同步原语**：基于Mutex可以构建更复杂的同步工具

## 二、基本使用

```go
var mutex sync.Mutex
mutex.Lock()
// 访问共享资源的临界区代码
mutex.Unlock()
```

## 三、常见的使用陷阱

1. **忘记解锁**：在临界区代码中如果发生panic，可能导致锁永远不被释放
   ```go
   var mu sync.Mutex
   mu.Lock()
   // 如果这里发生panic，mu将永远被锁定
   mu.Unlock() // 可能不会执行到这里
   ```
   **解决方法**：使用defer确保解锁
   ```go
   var mu sync.Mutex
   mu.Lock()
   defer mu.Unlock() // 即使发生panic也能确保解锁
   ```

2. **重复加锁**：同一goroutine重复获取同一把锁会导致死锁
   ```go
   var mu sync.Mutex
   mu.Lock()
   mu.Lock() // 死锁！
   ```

3. **锁粒度不当**：锁的范围过大影响并发性能，过小可能无法保证数据一致性

4. **错误传递锁值**：Mutex是值类型，传递值会创建副本，导致锁失效
   ```go
   func wrongLock(mu sync.Mutex) {
       mu.Lock() // 这里锁定的是副本，不是原锁
       defer mu.Unlock()
   }
   ```
   **解决方法**：传递指针
   ```go
   func rightLock(mu *sync.Mutex) {
       mu.Lock()
       defer mu.Unlock()
   }
   ```

5. **长时间持有锁**：在持有锁的状态下执行I/O、网络请求等耗时操作

## 四、底层实现原理

### 1. 互斥锁结构体

```go
type Mutex struct {
    state int32 // 锁状态（加锁、解锁等状态）
    sema  uint32 // 信号量（semaphore）主要用在等待队列
}


// Mutex.state的值
const (
  // 互斥锁被锁定的状态。当一个 goroutine 成功获取了互斥锁时，该标志被设置为 1
  mutexLocked = 1 << iota
  // 正在等待互斥锁的 goroutine 被唤醒时，该标志被设置 
  mutexWoken
  // 互斥锁处于饥饿状态 - 等待互斥锁的 goroutine 等待时间超过一定阈值（1ms）时
  mutexStarving
  mutexWaiterShift = iota

  // 1.正常模式下，等待互斥锁的 goroutine 以先进先出（FIFO）的顺序排队
  //            被唤醒的等待者并不直接拥有互斥锁，而是需要与新到达的 goroutine 竞争锁的所有权
  //            新到达的 goroutine 有优势


  // 2.饥饿模式，互斥锁的所有权直接从解锁的 goroutine 传递给等待队列头部的等待者
  //          新到达的 goroutine 不会尝试获取看起来未被锁定的互斥锁，
  //          也不会进行自旋等待，而是排在等待队列的尾部

  // 定义了饥饿模式的阈值时间，即 1 毫秒（1e6 纳秒）
  starvationThresholdNs = 1e6
)
```

### 2. 无锁时候快速加锁

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
    // atomic.CompareAndSwapInt32(mutexLocked|mutexStarving,m.state)
  }
}

// 单核或者GOMAXPROCS=1的情况下不会自旋
```

### 3. 自旋与唤醒

```go
// 定义了互斥锁（Mutex）结构体的一个方法lockSlow，用于在获取互斥锁时可能需要进行的复杂操作，通常是在直接获取锁失败后调用。
func (m *Mutex) lockSlow() {
    // 记录协程开始等待获取互斥锁的时间，初始化为0。
    var waitStartTime int64
    // 用于标记是否处于饥饿状态，初始化为false。
    starving := false
    // 标记是否已经被唤醒，初始化为false。
    awoke := false
    // 用于记录循环迭代的次数，初始化为0。
    iter := 0
    // 获取互斥锁当前的状态，用于后续的条件判断和操作。
    old := m.state

    // 开始一个无限循环，直到成功获取互斥锁或者满足其他退出条件。
    for {
        // 如果当前互斥锁状态满足以下条件：已被锁定（mutexLocked）或者处于饥饿状态（mutexStarving）
        // 并且当前迭代次数满足可自旋（spin）的条件。
        if old&(mutexLocked|mutexStarving) == mutexLocked && runtime_canSpin(iter) {
            // 如果还没有被唤醒（awoke为false），并且当前互斥锁状态的唤醒标记为未唤醒（mutexWoken为0），
            // 同时等待队列中有等待的协程（old>>mutexWaiterShift!= 0），
            // 并且能够通过原子操作将互斥锁的当前状态设置为已唤醒（通过原子比较并交换操作将old状态更新为old|mutexWoken）。
            if!awoke && old&mutexWoken == 0 && old>>mutexWaiterShift!= 0 &&
                atomic.CompareAndSwapInt32(&m.state, old, old|mutexWoken) {
                // 将awoke标记设置为true，表示已经被唤醒。
                awoke = true
            }
            // 执行自旋操作，尝试在不阻塞的情况下等待获取互斥锁的机会。
            runtime_doSpin()
            // 迭代次数加1，用于记录自旋的次数。
            iter++
            // 更新old的值为当前互斥锁的状态，以便后续再次进行条件判断。
            old = m.state
            // 继续下一次循环，继续尝试获取互斥锁。
            continue
        }

        // 创建一个新的变量new，初始值为old，用于后续根据不同条件对互斥锁状态进行更新。
        new := old
        // 如果当前互斥锁状态不处于饥饿状态（mutexStarving为0），则将新状态设置为已锁定（mutexLocked）。
        if old&mutexStarving == 0 {
            new |= mutexLocked
        }
        // 如果当前互斥锁状态已被锁定（mutexLocked）或者处于饥饿状态（mutexStarving）不为0，
        // 则在新状态中增加一个等待协程的计数（通过将1左移mutexWaiterShift位后加到new上）。
        if old&(mutexLocked|mutexStarving)!= 0 {
            new += 1 << mutexWaiterShift
        }
        // 如果当前处于饥饿状态（starving为true）并且互斥锁当前是已锁定状态（mutexLocked不为0），
        // 则在新状态中设置为处于饥饿状态（mutexStarving）。
        if starving && old&mutexLocked!= 0 {
            new |= mutexStarving
        }
        // 如果已经被唤醒（awoke为true），则进行以下操作。
        if awoke {
            // 如果新状态的唤醒标记为未唤醒（mutexWoken为0），则抛出异常，表示互斥锁状态不一致。
            if new&mutexWoken == 0 {
                throw("sync: inconsistent mutex state")
            }
            // 将新状态中的唤醒标记清除（通过与非操作将mutexWoken位清零）。
            new &^= mutexWoken
        }

        // 通过原子比较并交换操作，尝试将互斥锁的状态从old更新为new。
        if atomic.CompareAndSwapInt32(&m.state, old, new) {
            // 如果当前互斥锁状态既未被锁定（mutexLocked为0）也不处于饥饿状态（mutexStarving为0）
            // 这里可能是一种特殊情况的处理，暂时为空操作。
            if old&(mutexLocked|mutexStarving) == 0 {
              break // locked the mutex with CAS
            }
            // 根据等待开始时间是否为0来确定queueLifo的值，用于后续获取信号量时的队列排序方式设置。
            // 如果等待开始时间不为0，则queueLifo为true，表示后进先出（LIFO）排序方式；
            // 如果等待开始时间为0，则queueLifo为false，表示先进先出（FIFO）排序方式。
            queueLifo := waitStartTime!= 0
            // 如果等待开始时间为0，说明是第一次进入这个分支，记录当前的时间作为等待开始时间。
            if waitStartTime == 0 {
                waitStartTime = runtime_nanotime()
            }
            // 通过运行时函数获取互斥锁对应的信号量，根据queueLifo的值确定队列排序方式
            // 第三个参数可能是用于其他相关设置（这里假设为1）。
            runtime_SemacquireMutex(&m.sema, queueLifo, 1)
            // 更新starving的值，判断是否处于饥饿状态。
            // 如果当前时间减去等待开始时间大于饥饿阈值（starvationThresholdNs），则将starving设置为true。
            starving = starving || runtime_nanotime()-waitStartTime > starvationThresholdNs
            // 更新old的值为当前互斥锁的状态，以便后续再次进行条件判断。
            old = m.state
            // 如果当前互斥锁状态处于饥饿状态（mutexStarving不为0），则进行以下检查和操作。
            if old&mutexStarving!= 0 {
                // 如果当前互斥锁状态已被锁定（mutexLocked不为0）或者已被唤醒（mutexWoken不为0），或者等待协程的计数为0（old>>mutexWaiterShift == 0），
                // 则抛出异常，表示互斥锁状态不一致。
                if old&(mutexLocked|mutexWoken)!= 0 || old>>mutexWaiterShift == 0 {
                    throw("sync: inconsistent mutex state")
                }
                // 计算一个差值delta，用于后续对互斥锁状态进行调整。
                // 初始值为已锁定状态（mutexLocked）减去一个等待协程的计数（1<<mutexWaiterShift）。
                delta := int32(mutexLocked - 1<<mutexWaiterShift)
                // 如果当前不处于饥饿状态（starving为false）或者等待协程的计数为1（old>>mutexWaiterShift == 1），
                // 则在delta中减去处于饥饿状态的标记（mutexStarving）。
                if!starving || old>>mutexWaiterShift == 1 {
                    delta -= mutexStarving
                }
                // 通过原子操作将互斥锁的状态加上delta，进行状态调整。
                atomic.AddInt32(&m.state, delta)
                // 跳出循环，说明已经成功获取互斥锁并且完成了相关的状态调整。
                break
            }
            // 将awoke标记设置为true，表示已经被唤醒，为下一次循环做准备。
            awoke = true
            // 将迭代次数重置为0，为下一次循环做准备。
            iter = 0
        } else {
            // 如果原子比较并交换操作失败，说明互斥锁状态更新失败，更新old的值为当前互斥锁的状态，以便下一次循环继续尝试。
            old = m.state
        }
    }

    // 如果开启了竞态检测（race.Enabled），则执行竞态获取操作，标记当前协程获取了互斥锁对应的资源。
    if race.Enabled {
      race.Acquire(unsafe.Pointer(m))
    }
}
```

### 4. 释放锁

```go
// 用于在释放互斥锁时可能需要进行的复杂操作，通常是在特定条件下释放锁的处理过程。
func (m *Mutex) unlockSlow(new int32) {
    if (new+mutexLocked)&mutexLocked == 0 {
        fatal("sync: unlock of unlocked mutex")
    }

    // 如果互斥锁当前状态不处于饥饿模式（mutexStarving为0）
    if new&mutexStarving == 0 {
        old := new

        // 开始一个无限循环，用于在非饥饿模式下释放锁时可能涉及的等待协程唤醒等相关操作。
        for {
            // 如果没有等待协程，或者已经有协程被唤醒或者获取了锁，就无需再做唤醒操作。
            // 在非饥饿模式下，所有权是正常交接的，不涉及需要特殊唤醒操作的情况，所以直接返回。
            if old>>mutexWaiterShift == 0 || old&(mutexLocked|mutexWoken|mutexStarving)!= 0 {
                return
            }

            // 计算一个新的状态值new，用于尝试获取唤醒某个等待协程的权利。
            new = (old - 1<<mutexWaiterShift) | mutexWoken

            // 通过原子比较获取了唤醒等待协程的权利并且更新了互斥锁状态。
            if atomic.CompareAndSwapInt32(&m.state, old, new) {
                // 调用运行时函数释放与互斥锁对应的信号量
                runtime_Semrelease(&m.sema, false, 1)
                return
            }

            // 如果原子比较并交换操作失败
            // 说明互斥锁状态更新失败，更新old的值为当前互斥锁的状态，以便下一次循环继续尝试。
            old = m.state
        }
    } else {
        // 如果互斥锁当前处于饥饿模式（mutexStarving不为0）
        // 在饥饿模式下：将互斥锁的所有权直接交接给下一个等待协程，并且让出当前的时间片，
        // 以便下一个等待协程能够立即开始运行。
        // 注意：这里不会设置mutexLocked，等待协程在被唤醒后会自行设置它。
        // 但是只要mutexStarving被设置，互斥锁仍然被认为是处于锁定状态，所以新到来的协程不会获取到它。
        runtime_Semrelease(&m.sema, true, 1)
    }
}
```

## 五、设计的优缺点

### 优点：

1. **高效性**：正常模式下的自旋和竞争机制提高了锁的获取效率，减少上下文切换
2. **公平性与效率的平衡**：通过正常模式和饥饿模式的切换，在保证高效的同时避免了goroutine饿死
3. **低内存开销**：Mutex结构体仅包含两个整型字段，内存占用小
4. **实现简洁**：核心逻辑清晰，状态管理通过位操作实现
5. **适应性强**：能够处理不同负载情况下的锁竞争

### 缺点：

1. **非可重入锁**：同一goroutine不能重复获取同一把锁，容易导致死锁
2. **非公平锁**（正常模式下）：新到达的goroutine可能会比等待时间较长的goroutine更容易获取到锁
3. **不支持超时**：获取锁时无法设置超时时间
4. **非协程感知**：无法知道当前持有锁的goroutine信息
5. **没有优先级支持**：不能为不同的goroutine设置不同的锁优先级

## 六、最佳实践

1. **使用defer确保解锁**：防止因panic导致的锁泄漏
   ```go
   mu.Lock()
   defer mu.Unlock()
   ```

2. **减少锁的持有时间**：在锁外进行耗时操作，只在必要时持有锁
   ```go
   // 不推荐：长时间持有锁
   mu.Lock()
   result, err := http.Get(url) // 网络请求，耗时操作
   mu.Unlock()
   
   // 推荐：减少锁的持有时间
   // 先进行网络请求
   result, err := http.Get(url)
   // 只在处理结果时加锁
   mu.Lock()
   processResult(result)
   mu.Unlock()
   ```

3. **适当的锁粒度**：根据实际需求选择合适的锁粒度
   - 粗粒度锁：简单但并发性能较差
   - 细粒度锁：复杂但并发性能较好

4. **使用RWMutex替代Mutex**（读多写少场景）：允许多个读操作并发执行

5. **避免锁的嵌套**：减少死锁风险
   ```go
   // 不推荐：嵌套锁
   mu1.Lock()
   defer mu1.Unlock()
   mu2.Lock()
   defer mu2.Unlock()
   ```

## 七、工作模式详解

### 1. 正常模式

获取锁的goroutine会自旋几次，仍不能获取锁排队等待，FIFO方式，监听sema信号。当锁被释放的时候，sema变量通知队头的goroutine竞争锁，注意不是直接获取而是竞争，需要和目前新过来自旋中的goroutine竞争锁，如果竞争失败会加入等待队列的头部。

> 正常模式，队头的Goroutine和自旋的竞争保证了高效性(自旋的可以少一些上下文切换的开销).

### 2. 饥饿模式

当一个等待mutex的协程等待时间超过一定阈值（这个阈值由 Go 语言运行时内部机制决定，没有向外暴露具体数值），并且在这段时间内有其他协程不断地获取和释放mutex，就会将mutex从正常模式转换为饥饿模式。饥饿模式下，mutext.Unlock的时候会把锁直接给等待队列头部的goroutine，后来goroutine也不会自旋，而是直接放在队列尾部。然后会检查是否需要回到正常模式。

> 饥饿模式，阻止后面重新进来得goroutine自旋，让队头的goroutine直接获得锁防止goroutine饿死.

### 互斥锁的等待机制

当一个goroutine试图获取一个被锁定的互斥锁时，它会通过调用`runtime_SemacquireMutex`函数（Go 运行时内部函数）来尝试获取锁对应的信号量。如果锁已经被占用，这个`goroutine会让出 CPU 时间片`，然后被放入`等待队列`。Go 运行时调度器会在合适的时候`重新调度`这个`goroutine`。

当持有互斥锁的goroutine释放锁（通过Unlock方法）时，互斥锁会通过信号量机制通知等待队列中的一个goroutine（通常是最先进入等待队列的那个），这个goroutine会被唤醒，然后尝试获取互斥锁。如果没有其他goroutine竞争，它就能成功获取并继续执行。

## 八、总结

Go语言的互斥锁(Mutex)是一种高效、实用的同步原语，通过巧妙的正常模式与饥饿模式设计，在保证高效性的同时避免了goroutine饿死的问题。它的实现充分考虑了性能和公平性的平衡，但在使用时需要注意避免常见的陷阱，如忘记解锁、重复加锁等问题。通过遵循最佳实践，我们可以充分发挥互斥锁的优势，构建安全、高效的并发程序。

## 相关文档

- [Golang合集](https://www.bilibili.com/video/BV1hv411x7we)
- [图解Go里面的互斥锁mutex了解编程语言](https://www.cnblogs.com/buyicoding/p/12082162.html)