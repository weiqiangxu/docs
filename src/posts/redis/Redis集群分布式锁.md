---
hide: true
---

# 集群分布式锁及实现方案

[Java全栈知识体系之分布式系统](https://pdai.tech/md/arch/arch-z-lock.html)
[InfoQ Redis](https://www.infoq.cn/article/dvaaj71f4fbqsxmgvdce)

### 锁实现需要支持
```
互斥
超时释放
高性能
```

### 分布式锁干嘛的

> 控制多个进程对资源的访问

<hr/>

### Redis单机SETNX
```
SET lock_resource_id lock_value NX EX 10 #加锁
do something
DEL lock_resource_id #释放
```

### Redis单机SETNX的缺点
```
锁提前释放: 事务A没跑完但是因为锁超时释放了，事务B又获取了锁
锁被误删: 事务A执行完(锁已经超时释放了),事务B现在持有锁,事务A此刻把锁释放了
```
### 优化Redis单机SETNX
```
DEL释放锁之前判断当前锁的持有者是不是自己(UUID识别)

这里判断key和删除key值非原子性，所以采用可以保证指令原子性的Lua脚本实现
```

### Redis单机SETNX在锁超时自动释放的问题没解决

<hr/>

### 基于Redis多机实现的分布式锁Redlock

> SETNX的方案在master节点故障时候如果key没同步到slave并且选举slave为master之后，获取到了同资源的锁，不满足互斥性

```
Redlock就是为了解决主从异步复制在master节点故障后带来互斥性丢失的问题
```

(RedLock相关博客)[https://www.cnblogs.com/wwjj4811/p/15572204.html]

### RedLock算法思想

```
多个Redis实例(无主从关系)加锁 n%2+1
```


### 基于Redisson


