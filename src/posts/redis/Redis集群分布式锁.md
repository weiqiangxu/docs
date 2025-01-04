# 集群分布式锁及实现方案


1. 分布式锁特性

- 互斥
- 超时释放
- 高性能

> 分布式锁主要控制多个进程对资源的访问，让资源的访问和修改变得有序。比如多个人员同时对工单做修改，工单需要记录修改次数，这个次数的累加需要有序。


```bash
# 必须id不存在才会加锁成功
$ SET id lock_value NX EX 10 #加锁

# do something ...

$ DEL id #释放
```

2. Redis单机SETNX的缺点


- 业务执行时间不确定。锁的过期时间设置的太短，容易业务没跑完，锁被释放了，设置的太长当客户端崩溃的时候，锁迟迟得不到释放。之前的方案是设置`watch dog`反复高频率延长锁时间，损耗较大。

- 如果 Redis 是单点部署， Redis服务器出现故障时候，整个集群都没法获得锁，分布式锁机制会陷入瘫痪。

- 如果是集群部署，数据的同步可能会存在延迟，在主节点获取了锁了，主节点故障导致从节点切换为主节点的时候，可能会出现锁丢失。简单来说就是SETNX的方案在master节点故障时候如果key没同步到slave并且选举slave为master之后，获取到了同资源的锁，不满足互斥性。


3. 基于Redis多机实现的分布式锁Redlock

Redis是AP应用。强一致性有所欠缺。Redlock就是为了解决主从异步复制在master节点故障后带来互斥性丢失的问题。RedLock算法思想, 多个Redis实例(无主从关系)加锁`n%2+1`。Redlock算法需要在多个 Redis 实例上进行操作来确保分布式锁的可靠性，这增加了系统的复杂性和运维成本。Redlock 算法面对的是多个独立的redis实例还是一个完整的集群呢，肯定是Redlock算法主要是面向多个独立的 Redis 实例来实现分布式锁的。


### 相关文档


- [RedLock相关博客](https://www.cnblogs.com/wwjj4811/p/15572204.html)
- [Java全栈知识体系之分布式系统](https://pdai.tech/md/arch/arch-z-lock.html)
- [InfoQ Redis](https://www.infoq.cn/article/dvaaj71f4fbqsxmgvdce)