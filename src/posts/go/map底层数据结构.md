---
hide: true
---
# golang 底层数据结构

> 哈希表

### 哈希函数选择 && 哈希冲突解决

### 开放寻址法 && 拉链法

```
多个写成对同一个map写数据，并且key不会重复，请问这个map此刻可以认为是并发安全的吗
```

### golang引用类型

```
当作为函数返回值的时候可以返回 nil
map\pointers\slice\channel\interface\function
```

```
/usr/local/go/src/runtime/map.go/hmap
```

1. 数据结构和内存管理
2. 创建
3. 访问
4. 分配
5. 删除
6. 扩容


> Go 语言使用拉链法来解决哈希碰撞的问题实现了哈希表

```
每个桶 bmap 存储键对应哈希的前 8 位 , tophash 成为可以帮助哈希快速遍历桶中元素的缓存

每个桶都只能存储 8 个键值对 ， 超过就会存储到溢出桶

键值对数量的增加，溢出桶的数量和哈希的装载因子也会逐渐升高，超过一定范围就会触发扩容，不会造成性能的瞬时巨大抖动
```

### 相关博客

[吃透Golang的map底层数据结构及其实现原理](https://www.modb.pro/db/171834)

[GC](https://www.modb.pro/db/171818)

[map解析](https://qcrao.com/post/dive-into-go-map/)

[map内存泄漏](https://zhuanlan.zhihu.com/p/582982078)
[GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)