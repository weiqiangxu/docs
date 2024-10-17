---
hide: true
---

# Redis事务

### 事务是批量执行脚本，Redis语句是原子性的(事物不可分割，要么都发生要么都不发生)
### Redis事务不会因为批量脚本之中的某一个执行失败而回滚，也不会造成后续的指令不执行


### 常用指令

```
MULTI

EXEC
```

```
DISCARD

UNWATCH

WATCH
```

### 所以Watch怎么用，监控事务

[这篇文章写得不错](http://c.biancheng.net/view/4544.html)

该机制参考了 CAS（比较与交换，Compare And Swap）

```
WATCH mykey
val = GET mykey
val = val+1
MULTI
SET mykey val
EXEC [这里会检测WATCH开始mykey的值有没有被其他命令修改过，如果没有，才会执行]
```

在 WATCH 到 EXEC 之间，如果mykey更改了，那么这个EXEC命令将执行失败
从而保证了这个事务的从 GET -> INCR 这几步多个事务之间的串行化

### 什么叫做CAS的ABA问题

```
CAS是比较一个变量值在2个时间点是否一致判定该变量是否有被其他线程修改过
当其他线程将变量值从A改成B再改回来为A，那么CAS仍然是错误地认为这个变量是没有被修改过的
```


