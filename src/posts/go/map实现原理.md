# map

### 一、主要API

```go
m := make(map[string]int)
m["key1"] = 1

delete(m, "key1")
```

### 二、底层的数据结构

##### 1.hmap结构体

```go
type hmap struct {
	count     int // # Map的元素数量
	B         uint8  // 桶数量是 2^B，其中 元素数量 （count） / 桶数量 （2^B） = 负载因子
	buckets    unsafe.Pointer // 一共有 2^B 个桶数组（内存分配连续的bmap）
	oldbuckets unsafe.Pointer // 发生桶扩容的时候，旧桶就是这个地址
	nevacuate  uintptr        // 渐进式扩容时候下一个要迁移的旧桶编号
    ...
}
```

```go
// bucket指向的是bmap数组
// 这个就是所谓的 `bucket array（桶数组）`
[bmap1, bmap2, bmap3...]
```

##### 2.桶bmap

```go
// A bucket for a Go map.
type bmap struct {
	// tophash 哈希值的高bit位
    // 最多存储 8个键值对
    // 数据存储的形式是: tophash1\tophash2...k1\k2...\v1\v2... overflow *bmap
    // 如果当前的桶满了(超过8个)会创建一个bmap用作溢出桶关联
	tophash [abi.MapBucketCount]uint8
}
```

哈希冲突：GO的哈希冲突指的不是哈希值一样，而是哈希值的低B位一样放在同一个桶 bmap 之中。

##### 3.Key哈希值

对Map的Key获取哈希值，使用哈希的低位（B位）可以确定元素放在哪个桶 bamp之中，（因为桶的数量是 2^B），如果B=1那么有2个桶，那么最后一位bit位足够均衡分配具体哪个桶存放。

> 哈希值的低B位数值相同的 Key 会被放在同一个桶 bmap 之中。

在同一个 bmap 桶的数据，哈希值高位的会作为计算是否值匹配。


##### 4.扩容

1. 翻倍扩容

当元素数量越来越多，桶 bmap 的数量不够的时候，每个桶的元素都容易超过 8个，就会有很多溢出桶，导致查找效率变低。就需要增加桶 bmap 的数量，也就是扩容。

阙值：`元素数量 （count） / 桶数量 （2^B） = 6.5`


当元素数量增长到阙值 ` count/(2^B) > 6.5` 的时候，桶数量`翻倍扩容`，其实是重新创建一个桶数组存储元素，也就是 hmap.Bucket 指向的数组会更改。

Go使用的是渐进式扩容:

```go
type hmap struct {
	count     int // # Map的元素数量
	B         uint8  // count/(2^B) > 6.5
	buckets    unsafe.Pointer // 指向新的 bmap数组 (Size翻倍后的)
	oldbuckets unsafe.Pointer // oldBucket指向 旧的bmap数组
	nevacuate  uintptr        // 渐进式扩容时候下一个要迁移的旧桶编号
    ...
}
```

2. 等量扩容

> Key删除了很多以后，负载因子没有超过阙值，但是溢出桶数量却很大。

当溢出桶 `overflow bmap` 的数量超过常规桶 `bmap`的时候，需要`等量扩容`,创建和旧桶数量一样多的新桶，主要的作用是：让元素在桶数组之中排列的更加紧凑，将溢出桶的数量重新挪到常规桶之中。同时也提高了访问效率（不用从常规桶再到溢出桶查找数据）。

3. 扩容时键值对迁移时机

查找操作：当对map进行查找操作时，如果访问的桶正在进行扩容，那么会在查找目标键值对的同时，将该桶中的一个键值对迁移到新桶中。
插入操作：当向map中插入一个新的键值对时，如果访问的桶正在进行扩容，那么会在插入新键值对的同时，将该桶中的一个键值对迁移到新桶中。
遍历操作：在对map进行遍历（如使用for range循环）时，每次访问一个桶时，如果该桶正在进行扩容，就会将该桶中的一个键值对迁移到新桶中。

注意：如果一个正在扩容的map，进行range的话，也不会直接发生迁移所有，在range遍历过程中，只会在访问到特定桶时，如果该桶正在扩容，就迁移该桶中的一个键值对，并不会一次性迁移所有的元素。

### 三、设计

1. 优点：动态大小、高效的查找性能。
2. 缺点：无序、并发安全。
