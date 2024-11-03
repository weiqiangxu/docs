# sync.Map设计

### 一、常用API

```go
// Go\src\sync\map.go
m := sync.Map{}
m.Store("key1", "value1")

value, ok := m.Load("key1")
if ok {
    fmt.Println(value)
}

value, ok := m.LoadOrStore("key2", "value2")

m.Delete("key1")

m.Range(func(key, value interface{}) bool {
    fmt.Println(key, value)
    return true
})
```

### 二、数据结构

```go
type Map struct {
    // 互斥锁用于实现 dirty 和 misses 的并发管理
	mu Mutex

	// 读的Map
	read atomic.Pointer[readOnly]

	// 写的map
	dirty map[any]*entry

	// 缓存穿透次数
    // 只要dirty没有读取就会+1|不管read有没有都会+1
	misses int
}


type readOnly struct {
	m       map[any]*entry
	amended bool // 如果脏（dirty）映射包含一些不在 m 中的键，则为 true
}


type entry struct {
	// atomic.Pointer[any]是使用原子操作的指针类型
    // 用于安全地操作指向任意类型的指针
    // 作用：使用原子操作可以避免数据竞争和不一致的情况确保程序在并发环境下的正确性
	p atomic.Pointer[any]
}
```

### 三、读写操作

1. sync.Map.Load

从 `read map` 中读取（无锁）（会读取两次 `read map` 加锁 `double check`），如果没有再判定 `readOnly.amended` 穿透 `dirty map` 读（加互斥锁），并且`misses`计数增加.

2. sync.Map.Store

read map 存在拟写入的 key且不是删除状态（expunged 状态），直接基于 CAS 操作进行 entry 值的更新。

3. Delete

从`read map`和`dirty map`删除.


### 四、设计解析

读写分离加速读操作，空间换时间，缓存穿透计数用于更新`read map`，如果写多读少会等同于`互斥锁 && Map`.


- [GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)
- [Golang的sync.Map实现原理](https://zhuanlan.zhihu.com/p/599178236)