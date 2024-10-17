---
title: kafka高可用相关问题
tags:
  - kafka原理
categories:
  - kafka
date: 2023-04-08 06:40:12
index_img: /images/bg/computer.jpeg
hide: true
---

### 基础问题

1. kafka的zookeeper是干嘛的，Coordinator 和 Controller 和 Leader/Follower
2. 说说消息队列模型 (点对点\发布订阅)
3. 通信过程原理
4. 发送消息时候如何选择分区，分区有什么用
5. Rebalance重平衡
6. 分区分配策略
7. 如何保证消息可靠性
8. AR（Assigned Replicas）副本的集合
9. 和Leader副本保持同步的副本集合称为ISR（InSyncReplicas）(所有follower)

 ### 参考资料

[面试题系列：Kafka 夺命连环11问](https://mp.weixin.qq.com/s/SuALTpvI3IMPSja9pacJ7Q)
[31个Kafka常见面试题（很全）](https://mp.weixin.qq.com/s/NrltMqfDvwlbb9F0rNx5wA)
[架构师面试题系列之Kafka面试专题及答案（26题）](https://mp.weixin.qq.com/s/QfcyaR4EV0-JC-3kU-S9MA)
[图解 kafka 架构与工作原理](https://zhuanlan.zhihu.com/p/442468709)
