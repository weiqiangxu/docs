---
title: kafka Rebalance机制
tags:
  - kafka
categories:
  - kafka
---

### 什么是重平衡

```
如果消费组里的消费者数量有变化或消费的分区数有变化
kafka会重新分配消费者消费分区的关系
如某个消费者挂了，此时会自动把分配给他的分区交给其他的消费者
如果他又重启了，那么又会把一些分区重新交还给他
```

### 特殊情况

```
rebalance只针对subscribe这种不指定分区消费的情况
如果通过assign这种消费方式指定分区
kafka不会进行rebanlance
```

> rebalance过程中消费者无法从kafka消费消息，这对kafka的TPS会有影响，如果kafka集群内节点较多，比如数百个，那重平衡可能会耗时极多，所以应尽量避免在系统高峰期的重平衡发生

### 何时触发

```
消费组里的consumer增加或减少了
动态给topic增加了分区
消费组订阅了更多的topic
```


### 消费者Rebalance分区分配策略

```
range
round-robin(轮询)
sticky(粘性)
```

### Rebalance过程

```
第一阶段：选择组协调器
第二阶段：加入消费组JOIN GROUP
第三阶段（ SYNC GROUP)
```

### 参考资料

[Kafka的Rebalance机制](https://blog.csdn.net/Blackic_960703/article/details/126179913)