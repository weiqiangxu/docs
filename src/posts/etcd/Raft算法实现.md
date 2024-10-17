---
title: Golang和Etcd实现Raft算法
category:
  - etcd
tag:
  - etcd
---

[分布式一致性算法Raft和Etcd原理解析](https://learn.lianglianglee.com/%E4%B8%93%E6%A0%8F/%E5%88%86%E5%B8%83%E5%BC%8F%E4%B8%AD%E9%97%B4%E4%BB%B6%E5%AE%9E%E8%B7%B5%E4%B9%8B%E8%B7%AF%EF%BC%88%E5%AE%8C%EF%BC%89/09%20%E5%88%86%E5%B8%83%E5%BC%8F%E4%B8%80%E8%87%B4%E6%80%A7%E7%AE%97%E6%B3%95%20Raft%20%E5%92%8C%20Etcd%20%E5%8E%9F%E7%90%86%E8%A7%A3%E6%9E%90.md)

[ETCD介绍—etcd概念及原理方面分析](https://zhuanlan.zhihu.com/p/405811320)
[认识分布式系统etcd](https://toutiao.io/posts/clo2v3/preview)
[etcd官方文档中文版](https://doczhcn.gitbook.io/etcd/index/index)

### Raft角色

1. Leader（领导者）
2. Follower（追随者）
3. Candidate（候选者）

### Raft机制设定带来的问题有哪些

1. 选举（Leader Election）
2. 日志复制（Log Replication）
3. 安全性（Safety）


### Raft 算法之 Leader Election 原理

第一阶段：所有节点都是 Follower
第二阶段：Follower 转为 Candidate 并发起投票
第三阶段：投票策略
第四阶段：Candidate 转为 Leader

### Raft 算法之 Log Replication 原理

第一阶段：客户端请求提交到 Leader
第二阶段：Leader 将 Entry 发送到其它 Follower
第三阶段：Leader 等待 Followers 回应。
第四阶段：Leader 回应客户端。
第五阶段，Leader 通知 Followers Entry 已提交

### Raft 算法之安全性
1. 选举限制
2. 提交之前任期内的日志条目


### Etcd

1. 架构
2. 基本概念
3. 应用场景（服务发现、消息发布和订阅、分布式锁、集群监控与Leader竞选）


### 选举优先级

1. candidate之中term-index最大的获得选票
2. Raft选主必须获得选票 > N/2 才可以 (那3个宕机1个是不是永远无法选主了呢)

### 相关文章

[选主逻辑依赖任期（term）实现说的非常细致生动](https://juejin.cn/post/6907151199141625870)

### Q&A

1. Raft选主必须获得选票 > N/2 才可以 ，那3个节点的宕机1个是不是永远无法选主了呢

    不一定。即使其中一个节点宕机，只要剩下的两个节点仍然可以获得足够的选票（即大于N/2），它们仍然可以选出新的主节点。在Raft协议中，只要仍然有大多数节点存活且可以通信，集群就可以继续正常工作。

2. 为什么说2个节点的集群不可能是高可用集群

    在一个只有两个节点的集群中，如果其中一个节点宕机，剩下的一个节点无法组成大多数（大于N/2），因此无法达成一致，也就无法选主。这样会导致集群无法正常工作，从而降低可用性。因此，一个只有两个节点的集群通常被认为不是高可用的，因为无法容忍单点故障。高可用集群通常是由多个节点组成，以确保即使有几个节点失效，集群仍然可以继续运行。


