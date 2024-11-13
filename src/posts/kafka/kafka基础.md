---
title: kafka基础
tags:
  - kafka
categories:
  - kafka
---


### 一、kafka安装

> Kafka本质上是高性能低延迟的分布式文件系统、分布式流处理平台主要用于处理和存储大量的实时数据流。数据以topics主题类别存储，每条记录有键、值、时间戳。

```bash
# 从 Kafka 2.8.0 版本开始，可以在不依赖 Zookeeper 的情况下运行 Kafka。
# 通过引入 Kafka Raft（KRaft）模式实现的
# bitnami/kafka:3.4 可以选择使用zookeeper
docker pull bitnami/kafka:3.9.0
```

```bash
# 容器的主机名（hostname）为kafka-server
# KAFKA_CFG_NODE_ID 节点ID为0
# KAFKA_CFG_PROCESS_ROLES 节点角色为controller(控制器)和broker(代理)
# KAFKA_CFG_LISTENERS 服务的监听器 
# PLAINTEXT指普通文本协议(非加密)在9092端口监听client(如生产者和消费者)的连接
# CONTROLLER指9093端口监听与控制器相关的通信
# KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP 指定监听器的安全协议映射全用普通文本(不加密)
# KAFKA_CFG_CONTROLLER_QUORUM_VOTERS 配置控制器仲裁投票者用于KafkaRaft选举和协调控制器
# KAFKA_CFG_CONTROLLER_LISTENER_NAMES 监听器名称为CONTROLLER
docker run -d --name kafka-server --hostname kafka-server \
    -e KAFKA_CFG_NODE_ID=0 \
    -e KAFKA_CFG_PROCESS_ROLES=controller,broker \
    -e KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
    -e KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
    -e KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka-server:9093 \
    -e KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER \
    bitnami/kafka:3.9.0

# 如果不是windows不用加winpty
winpty docker exec -it kafka-server sh

# 1.查看主题列表
cd /opt/bitnami/kafka/bin
kafka-topics.sh --list --bootstrap-server kafka-server:9092

# 2.创建主题
# replication-factor复制因子: 分区的副本数 (如果只有1个broker最多设置为1)
# partitions分区: 表示这个topic会被划分为3个分区
kafka-topics.sh --create --topic mytopic \
  --replication-factor 1 \
  --partitions 3 \
  --bootstrap-server kafka-server:9092

# 3.查看主题详情
kafka-topics.sh --describe --topic mytopic \
  --bootstrap-server kafka-server:9092

# 4.启动生产者生产消息
kafka-console-producer.sh --topic mytopic \
  --bootstrap-server kafka-server:9092


# 5.启动消费者消费消息
kafka-console-consumer.sh --topic mytopic \
  --bootstrap-server kafka-server:9092 --from-beginning


# 6.查看消费者组列表
kafka-consumer-groups.sh --bootstrap-server kafka-server:9092 --list

# 7.查看特定消费者组的详细信息
kafka-consumer-groups.sh --bootstrap-server kafka-server:9092 \
  --describe --group console-consumer-73857

GROUP TOPIC PARTITION CURRENT-OFFSET LOG-END-OFFSET LAG CONSUMER-ID

# 8.查看消费者组的偏移量信息
kafka-consumer-groups.sh --bootstrap-server kafka-server:9092 \
  --describe --group console-consumer-73857 --offsets


# 核心API
1. ProducerAPI 生产者API.
2. ConsumerAPI 消费者API.
3. StreamsAPI 流API.
4. ConnectorAPI 连接器API.
```

### 三、概念

1. 主题topic
2. 分区patitions
3. 消费组consumerGroup 
4. 消费者
5. 生产者
6. 消息Record
7. 服务器Broker
8. Leader/Follower分区副本
9. Offset偏移量
10. Coodinator协调者
11. Controller控制器
12. Rebalance重平衡

### 四、1个Topic的多分区如何分配给1个消费者组的多消费者

> 当消费者组中的消费者数量发生变化（如新增或者减少消费者）或者主题的分区数量发生变化时，Kafka 会触发分区的再平衡过程。

1. Range范围分区(默认)
  
  假设一个主题有10个分区（0-9），消费者组有3个消费者，消费者A可能负责分区`0-3`，消费者B负责分区`4-6`，消费者C负责分区`7-9`。如果主题的分区数不能被消费者数量整除，那么前面的消费者会分配到更多的分区。

2. RoundRobin轮询

  假设一个主题有10个分区，消费者组有3个消费者。第一个分区分配给消费者A，第二个分区分配给消费者B，第三个分区分配给消费者C，第四个分区又分配给消费者A，以此类推。

### 五、kafka如何保证消息的可靠性

1. 生产者发送消息丢失

  生产者消息发出去了，但是网络原因或者其他导致kafka没收到。那么异步加异常重试是比较稳妥的做法，如果接受慢一点可以同步提交。那么提交结果的响应`success`也是有条件可以设置的，服务端达到什么样子的条件可以返回`success`呢，`acks= 0\1\all`，0就是发了就不管了，1 要求起码1个leader是返回ok了（leader返回ok，follower没ok，leader挂了，一样丢失）,all 要求leader\follower所有副本都ok才表示ok。


2. Kafka自身消息丢失

  kafka通过pageCache异步写入磁盘，有可能到了pageCache后没写入磁盘宕机了，那么消息丢失。解决的方案是增加副本数量并且规定Client生产消息的时候必须写入多个个副本才能认为成功。
  

3. 消费者消息丢失

   Kafka消费者配置中，`enable.auto.commit`属性的默认值是true，也就是说`Client`读取到消息以后，过了`auto.commit.interval.ms`大概`5`秒，服务端会自动提交`Offset`。如果客户端拿到数据后宕机了，没有对消息做业务逻辑处理，服务端就自动改变了偏移量，那么`offset`就被改变了，那么这条消息永远不会被这个消费者消费了，消息丢失了。解决方案是关闭服务端的自动提交属性，就算消息被客户端读了，`offset`也不会变，直到`client`主动提交偏移量。


### 六、高吞吐的原因

- PageCache和零拷贝
- 顺序IO
- 多分区
- 批量处理和压缩


### 七、副本同步原理

Kafka副本分为Leader副本和Follower副本（主从）只有Leader副本会对外提供服务，Follower副本只是单纯地和Leader保持数据同步，作为数据冗余容灾的作用。正常情况下来说，Follower副本是不提供服务的，不管是生产还是消费。


### 八、重复消费场景

先消费后提交`offset`会有可能出现重复消费。`client`拿到了消息并且做了业务逻辑处理，但是没有提交`Offset`，下次拿数据又拿到了同一个`Offset`的消息。

### 九、消息丢失场景

1. kafka设置自动提交就有可能丢消息，Client读取了消息以后，Server自动更改了偏移量Offset，Client没有做业务逻辑处理，下次读取数据时候却读不到这个消息了，就出现了消息丢失，也就是没有消费到这个消息。
2. Producer发消息至Broker的时候，就有可能会丢消息，比如消息发到Broker了，并且Broker返回一个success了，但是消息丢失了，问题是出现在Broker收到消息以后数据存在PageCache还没有落到磁盘，宕机了，应该设置罗盘机制马上落盘，或者多副本的情况下保证其他副本也已经拿到消息了，才回复success给客户端。

### 十、消息堆积场景

出现的原因是消费者跟不上生产者的速度，解决方案时增加`partition`增加消费者`consumer`，那么只有1个分区在一个消费者组却有多个消费者呢，这个时候有多少个消费者真正的拿得到消息的，其实只有一个消费者能够真正拿到该分区的消息。


### 十一、高可用的架构下（多副本）如何保证数据的一致性

高可用是通过数据冗余的方式实现，如每个分区都有多副本，分成leader\follower副本。而一致性是因为消费消息的时候，都是从Leader消费，Follower副本仅仅做冗余处理。并且Leader和Follower的同步时机，可以定期、Leader的新消息字节数积累触发、生产者写入消息后触发、消费者消费到高水位（High - Watermark）附近消息时触发等，及时触发Leader和Follower之间的消息同步。

### 十二、message究竟要存到topic下面的哪个分区

1. 手动指定partition
2. 随机轮询
3. 按key存储 (key的hash和分区数取余数)
4. 顺序轮询（round-robin）（第一次调用随机生成整数，后续每次调用自增，用这个数于分区数取余数）


### 十二、重平衡

  触发重平衡：
  - 消费组的消费者数量变化
  - 消费组消费的主题的主题分区数量变化
  - 消费组订阅的Topic发生了变化。

  rebalance过程中消费者无法从kafka消费消息，这对kafka的TPS会有影响，如果kafka集群内节点较多，比如数百个，那重平衡可能会耗时极多，所以应尽量避免在系统高峰期的重平衡发生。


### 十二、消费者Rebalance分区分配策略


range
round-robin(轮询)
sticky(粘性)

Rebalance过程
第一阶段：选择组协调器
第二阶段：加入消费组JOIN GROUP
第三阶段 SYNC GROUP


### 十三、生产消息时候同步发送和异步发送

> 同步和异步指client(producer)是否收到leader给的ack后才发下一条

- 逐个发送

1. Fire-and-forget (不关心可靠性)
2. Synchronous send (关心次序)
3. Asynchronous send (不关心次序)

```
逐条发送
请求队列InFlightRequest中永远最多有一条数据
批量发送参数：max.in.flight.requests.per.connection=1 & batch.size=1 效果也是逐条发送
```
- 批量发送

```
批量发送

运行生产者以batch的形式push数据

queue.buffering.max.ms = 5000 缓存5s的数据后batch发送
queue.buffering.max.messages = 100  缓存队列最大数(尽量大)超过了会丢弃消息或阻塞
queue.enqueue.timeout.ms = 0/-1 设置0时丢弃消息，设置-1是阻塞
batch.num.messages = 100 batch缓存的消息数量达到了才会发送出去
```

#### 十四、ack机制

broker收到消息之后在什么状态下（直接返回,leader success, follower&leader success）返回success。Java生产消息时候的策略:
1. 发后即忘 (发送了不管成功与否)
2. 同步(发送后等待结果)
3. 异步（发送消息时指定回调函数，Kafka在返回响应时会调用该函数实现异步的发送确认）

### Q&A

1. kafka的zookeeper是干嘛的，Coordinator 和 Controller 和 Leader/Follower
2. 说说消息队列模型 (点对点\发布订阅)
3. 通信过程原理
4. 发送消息时候如何选择分区，分区有什么用
5. Rebalance重平衡
6. 分区分配策略
7. 如何保证消息可靠性
8. AR（Assigned Replicas）副本的集合
9. 和Leader副本保持同步的副本集合称为ISR（InSyncReplicas）(所有follower)
10. kafka的流Streams是什么
11. 为什么Kafka的性能在数据大小方面实际上是恒定的且长时间存储数据不是问题
12. kafka怎么设置记录保留期
13. 一个分区只能被同一个组的一个消费者消费
14. 一个消费者可以消费同一个topic的多个分区
15. 如果有2个消费者持有同一个groupId消费同一个分区,那么其中只有1个可以消费到
16. 消费者数量大于分区数时候，多余的消费者会处于闲置的状态
17. consumer订阅topic以后，底层的逻辑是怎么样的呢
19. 生产者生产消息怎么做到高效率的
20. Kafka消费者消费消息的时候是怎么做到高效可靠的
21. Client生产消息时候Kafka如何选择分区存储消息
22. Kafka分区有什么好处
23. kafka的一个topic生产了2条数据,如果有2个分区那么消息会如何存储
24. 如何优化Rebalance防止频繁重平衡，重平衡的过程是怎么样的
    重平衡过程整个消费群组停止工作且期间无法消费消息。1. 消费者数量和分区数量保持一致最好。2. 当消费者数量小于分区数量的时候，那么必然会有一个消费者消费多个分区的消息。3. 消费者数量超过分区的数量的时候，那么必然会有消费者没有分区可以消费
25. 消费者与订阅主题topic之间消费策略有哪几种以及怎么设置
26. 如何提高消费者消费的速度
27. 一个topic的多个分区之间消息会有重复的吗
28. 堆积量告警怎么做的
29. 分区数量的数量设置依据什么合适
30. 增加分区后会有什么情况发生
31. 1个topic_1有4个分区且只有group_a订阅topic_1，对应的 group_a 的消费者consumer只有一个A，那么这个A可以订阅所有的分区吗
32. 重平衡问题。我的client_A目前占有1个topic的2个分区(p1,p2)，pull了500条数据(offset = 10~510)正在消费，消费到50%的时候260，重新加入了一个 client_B订阅该topic，那么这个时候会把client_A正在消费的另一个分区给p2 rebalance给 client_B 吗，如果会的话，会把 10~510的数据给 client_B 消费吗
33. rebalance的触发情形有哪些rebalance的过程是怎么样的
35. kafka的可靠性体现在哪些方面
    消费可靠（提交offset和消费动作次序、重复消费还是消息丢失、消息堆积）。生产可靠（ack、批量发送还是单个发送）。kafka可靠（落盘机制、副本机制）。


### 参考资料

- [Kafka的消费者提交方式手动同步提交、和异步提交](https://cloud.tencent.com/developer/article/1772208)
- [Kafka消息的同步发送和异步发送](https://blog.csdn.net/m0_45406092/article/details/119546471)
- [kafka 如何保证不重复消费又不丢失数据](https://www.zhihu.com/question/483747691/answer/2392949203)
- [图解Kafka的架构和消费原理](https://zhuanlan.zhihu.com/p/442468709)
- [Kafka的Rebalance机制](https://blog.csdn.net/Blackic_960703/article/details/126179913)
- [Kafka的分区和副本机制](https://blog.csdn.net/weixin_45970271/article/details/126550115)
- [Kafka 源码解析之 Consumer 如何加入一个 Group](https://blog.csdn.net/weixin_43956062/article/details/106784984)
- [Kafka查看topic、consumer group状态命令](http://wjhsh.net/timor19-p-12742362.html)
- [kafka对topic的CRUD](https://blog.csdn.net/javahelpyou/article/details/125887294)
- [Kafka增加分区导致业务数据异常](https://zhuanlan.zhihu.com/p/392921569)
- [一文读懂kafka](https://baijiahao.baidu.com/s?id=1719501564805569513)
- [自动提交和手动提交-漏消费和重复消费](https://www.cnblogs.com/auuv/articles/15984585.html)
- [Kafka自动提交 offset 尚硅谷](https://www.cnblogs.com/jelly12345/p/16018287.html)
- [kafka auto commit官方手册](https://blog.csdn.net/chaiyu2002/article/details/89472416)
- [Kafka 分区分配策略（Range分配策略 && RoundRobin分配策略）](https://blog.csdn.net/lzb348110175/article/details/100773487)
- [超详细“零”基础kafka入门篇](https://www.cnblogs.com/along21/p/10278100.html)
- [csdn offset参数详解](https://blog.csdn.net/qq_44170834/article/details/108670595)
- [kafka参数解析](https://www.cnblogs.com/luckyna/p/12066431.html)
- [kafka参数：max.poll.interval.ms 和 session.timeout.ms](https://www.jianshu.com/p/86e42f3ee7b9)
- [kafka系列七、kafka核心配置 - 写的很好](https://www.cnblogs.com/wangzhuxing/p/10111831.html)
- [面试题系列：Kafka 夺命连环11问](https://mp.weixin.qq.com/s/SuALTpvI3IMPSja9pacJ7Q)
- [31个Kafka常见面试题（很全）](https://mp.weixin.qq.com/s/NrltMqfDvwlbb9F0rNx5wA)
- [架构师面试题系列之Kafka面试专题及答案（26题）](https://mp.weixin.qq.com/s/QfcyaR4EV0-JC-3kU-S9MA)
- [图解 kafka 架构与工作原理](https://zhuanlan.zhihu.com/p/442468709)
- [kafka为什么有消费者组](https://cloud.tencent.com/developer/article/1540509)
- [怎么创建新的消费组在kafka](https://stackoverflow.com/questions/61770993/how-to-create-a-new-consumer-group-in-kafka)
- [Group CLI 教程中的 Kafka 消费者](https://www.conduktor.io/kafka/kafka-consumers-in-group-cli-tutorial)
- [group配置](https://www.csdn.net/tags/MtjaQg0sODkzNjEtYmxvZwO0O0OO0O0O.html)
- [华为云开发者联盟​-带你认识三种kafka消息发送模式](https://zhuanlan.zhihu.com/p/451678059)
- [kafka生产同步发送和异步发送](https://zhuanlan.zhihu.com/p/531447457)
- [Kafka的消费者提交方式手动同步提交、和异步提交](http://t.zoukankan.com/biehongli-p-14105658.html)
- [kafka重复消费消息设置](https://www.csdn.net/tags/MtjaEgysNTc2NjEtYmxvZwO0O0OO0O0O.html)
- [kafka poll](https://blog.csdn.net/qq_55548053/article/details/114055254)
- [bitnami/kafka](https://hubgw.docker.com/r/bitnami/kafka)
- [rebalance重平衡过程图示](https://mp.weixin.qq.com/s/SuALTpvI3IMPSja9pacJ7Q)