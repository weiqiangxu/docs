---
hide: true
---
# FOR 和 Range 的性能比较

### range 对每一个迭代值都创建 1 个拷贝 而 For 不会

```
迭代值大小很小的话，性能上没有差异

如果迭代值占用内存很大，range 就会显得性能差一些
```

### range 里面使用 go 需要注意是否会因为迭代值都是 1 个拷贝而导致错误


[GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)