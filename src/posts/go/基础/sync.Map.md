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

	// 读的Map是并发安全的
	// 原子操作（atomic.Value）包裹的readOnly结构体
	// 原子操作来保证并发安全
	// 主要用于存储经常访问的键值对
	read atomic.Pointer[readOnly]

	// 写的map
	// 有新的值的时候先放在dirtyMap之中
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

	- 键是新的（不存在于read和dirty中），那么这个键值对会被添加到dirty中。
	- 键已经存在于read中，会尝试通过原子操作更新read中的值。
	- 键存在于dirty但不存在于read时，会更新dirty中的键值对。

	```go
	// 如果有新的元素增加
	// 则需要先将read map中的所有未删除数据先迁移到dirty中
	func (m *Map) dirtyLocked() {
		if m.dirty != nil {
			return
		}

		read, _ := m.read.Load().(readOnly)
		m.dirty = make(map[interface{}]*entry, len(read.m))
		// 逐个迁移到dirty之中
		for k, e := range read.m {
			if !e.tryExpungeLocked() {
				m.dirty[k] = e
			}
		}
	}
	```

3. Delete

从`read map`和`dirty map`删除.


### 四、设计解析

> 读写分离，空间换时间，缓存穿透计数

1. dirty数据迁移到read的触发条件

	- read为空时。会将dirty中的所有键值对迁移到read中。
	- dirty数据量积累过多触发迁移。当dirty中的键值对数量超过read中的键值对数量一定比例时，会触发将dirty中的数据迁移到read。
	- sync.Map的misses计数。当misses计数器的值超过一定阈值时，会触发将dirty映射中的数据迁移到read映射中。

2. dirty map迁移到read map 是怎么迁移的

	```go
	func (m *Map) missLocked() {
		m.misses++
		if m.misses < len(m.dirty) {
			return
		}
		// dirty覆盖到read之中
		m.read.Store(readOnly{m: m.dirty})
		// dirty和misses计数清空
		m.dirty = nil
		m.misses = 0
	}
	```



- [GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)
- [Golang的sync.Map实现原理](https://zhuanlan.zhihu.com/p/599178236)
- [图解Go里面的sync.Map](https://www.cnblogs.com/buyicoding/p/12117370.html)