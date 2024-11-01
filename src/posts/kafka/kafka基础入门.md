---
title: kafka基础入门
tags:
  - kafka原理
categories:
  - kafka
date: 2023-04-08 06:40:12
index_img: /images/bg/computer.jpeg
hide: true
---

### 博客园-详细基础入门

> 高性能，低延迟提交日志存储，复制和传播的专用分布式文件系统 

```
注意是一个分布式文件系统
```

### 数据单位
```
数据以 topics 主题类别存储

每条记录有键、值、时间戳
```

### 核心API

```
Producer API（生产者API）
Consumer API（消费者API）
Streams API（流API）
Connector API（连接器API）
```
### 主题 topic 

> 逻辑分类，一类消息

### 分区 patitions

> 一个分区在存储层面可以是一个 append log 文件

> 一个 topic 可以分成多个分区 partition

```
有序、不可变的记录序列

分区中每个记录，有一个称谓偏移的顺序ID号码，唯一表示每个分区的记录
```


### kafka允许设置记录保留期（无论是否使用），但是Kafka的性能在数据大小方面实际上是恒定的，因此长时间存储数据不是问题


### consumer group 消费组

```
每个consumer属于一个consumer group，一个group里面可以有多个consumer，但是一个topic里面在group之中只会被消费一次，也就是同一个group的多个consumer不可能消费到同一个topic的同一个消息
```


### 分区

```
可以认为一个 append log 文件或者 一块磁盘
```

### 组

```
可以认为是一个用于访问 append log 的密钥 (这个密钥只能给一消费者用)
```

### 消费者 

```
可以认为是真正拿到 append log 文件内容的程序
```

### topic

```
可以认为是 append log 里面每一行内容的类别，比如有些是QQ日志、有些是微信日志
```


### 一个分区只能被同一个组的一个消费者消费 

```
可以简单地认为 一个 append log 文件，有多个组（密钥），在一个组内（1个密钥）只能给一个消费者使用
```

### 一个消费者可以消费同一个topic的多个分区

```
最终读取 append log 文件的程序，可以读取多个 append log 文件 (topic是微信日志，这个日志存在很多个地方)
```

##### 关键点：持有一个group id消费1个分区的消息，只能被1个消费者消费，如果有2个消费者持有同一个 group id 消费同一个分区的数据，那么其中只有 1个 可以消费到

##### 关键点：持有一个group id消费1个分区的消息，只能被1个消费者消费，如果有2个消费者持有同一个 group id 消费同一个分区的数据，那么其中只有 1个 可以消费到

```
底层是如何实现的呢

consumer订阅topic以后，底层的逻辑是怎么样的呢
```

> 消费者数量大于分区数时候，多余的消费者会处于闲置的状态

### 术语

```
Record 消息
Topic 主题
Producer 生产者
Consumer 消费者
Broker  kafka服务器
Partition 分区，一个主题可以分布在多个分区，可以理解为append log文件，通过分区，消息读写可以落到多个节点
Leader/Follower  分区副本，leader负责读写，follower只负责和leader保持同步不对外提供服务
Offset 偏移量，分区之中每个消息根据时间出现的递增序号，这个序号就是偏移量
Consumer group  消费者组，一个或者多个消费者可以共用一个组ID，但是一个分区只能被1个组的1个消费者消费
Coodinator 协调者，负责rebalance
Controller 控制器，本质上是1个broker，负责协调和管理集群（leader选取、rebalance等），（zoookiper第一个创建的临时节点会成为控制器）
```

### kafka存储层，数据存储在日志里面


### 参考博客

[超详细“零”基础kafka入门篇](https://www.cnblogs.com/along21/p/10278100.html)

### kafka通信过程原理 - 生产者

1. kafka broker启动，向 zookeeper 注册自己ID，并且向zookeeper订阅所有的broker
2. 生产者启动，指定bootstrap.servers，指定的broker地址，建立TCP连接
3. 生产者发送消息给broker获取所有的broker信息
4. 生产和所有的broker建立TCP连接
5. 开始生产啦

### kafka通信过程原理 - 消费者

1. 消费者和一个broker连接
2. 协调者获取所有分区信息
3. 协调者让消费者和所有分区leader建立连接
4. 开始消费啦

> 以上归根到底最终producer和每一个broker建立连接，consumer和每一个partition(leader)建立连接


### 发送消息时候如何选择分区

1. 轮询
2. 随机

### 分区有什么好处

```
没有分区的话，消息就会都写到一个节点上了
```

### kafka的一个topic，生产了2条数据，如果有2个分区，那么这两条数据是会在这两个分区分别存储2个副本吗，还是每个分区存储一条消息

首先，这两条数据不是每个分区存储两个副本；

每个分区存储一条消息的可能性比较大，取决于分区策略；

### 关于rebalance

1. 消费者数量和分区数量保持一致最好
2. 当消费者数量小于分区数量的时候，那么必然会有一个消费者消费多个分区的消息
3. 消费者数量超过分区的数量的时候，那么必然会有消费者没有分区可以消费

```
旧版本的通过zookeeper监听器
新版本通过协调者


重平衡过程整个消费群组停止工作，期间无法消费消息


消费、主题、分区任何一个发生改变都会重平衡
```

### rebalance重平衡过程

> heartbeat.interval.ms 控制消费者和协调者心跳间隔

[图示](https://mp.weixin.qq.com/s/SuALTpvI3IMPSja9pacJ7Q)

1. 第一个消费者 join group 请求给协调者，第一个成为群主
2. 群主执行分配策略，告知协调者
3. 新消费者 join group 请求给协调者，协调者找群主要新的分配结果，协调者返回给每一个消费者

### 分区分配策略

[.Kafka 分区分配策略（Range分配策略 && RoundRobin分配策略）](https://blog.csdn.net/lzb348110175/article/details/100773487)

```
背景： 1个topic，分布在3个分区，2个消费者，持有1个 group id 

那么理想中，每个消费者都能拿到自己占用的分区

消费者客户端参数 partition.assignment.strategy 设置消费者与订阅主题topic之间消费策略


```



1. Range 范围分区

```
假设topic1 的分区 1~8，消费者有3个 abc , 那么每个分区逐个分配给消费者

1-a
2-b
3-c
4-a
...

弊端：a这个消费者会承担更多的分区的消费，从而导致不均衡
    假设 topic2、topic3、topic4全部只有1个分区
    那么这个分区无疑全部落到了a消费者的头上

```

2. RoundRobin 轮询

```
所有 partition 和 consumer 都列出来
然后按照 hascode 排序
最后通过轮询算法来分配 partition 给到各个消费者

场景：假设topic1有3个分区1~3，topic2有5个分区1~5，topic3有8个分区1~8，消费者有ABC，那么将生成 topic1_1\topic1_2\... 逐个分配给ABC消费者


弊端：

a. 上面的消费者ABC (当然group是同一个) 订阅了相同的 topic，此时是均匀的( 每个消费者拿到的分区数是大致相等 )

b. 上面的消费者B只是订阅了topic1，那么就是不均匀的，（B消费了1个分区，另外的 topic1和topic3都会被AC消费，但是其实因为 AC 还消费了太多的其他的topic，如果要分区均匀给消费者，应该让那个B消费topic1的所有分区）
```



### kafka 如何保证消息的可靠性

1. 生产者发送消息丢失（消息发出去了，但是网络原因或者其他导致kafka没收到）

```
发送后不管结果、同步发送、异步发送

异步加异常重试是比较稳妥的做法
```
```
acks= 0\1\all

0 就是发了就不管了
1 要求起码1个leader是返回ok了（leader返回ok，follower没ok，leader挂了，一样炸了）
all 要求leader\follower所有副本都ok才表示ok
```


2. Kafka 自身消息丢失

```
kafka通过pageCache异步写入磁盘，有可能到了pageCache后没写入磁盘就炸了

措施：

replication.factor 加副本数量
min.insync.replicas 表示写入多个个副本才能认为成功
```

3. 消费者消息丢失

```
消费者获取了数据之后，炸了，没对消费做任何操作，就aotu commit了，offset就被改变了

enable.auto.commit=false，设置为手动提交

手动提交也分异步和同步，这个异步和同步指的是：pull拉取和push推送的动作是异步还是同步，如果是同步的话必须是push offset之后这个消费者才能消费下一个offset
```

```
消费者A读取到了offset=3的数据 (自动提交默认是每5秒一次,5s之后consumer会自动提交offset)

默认5秒钟，一个 Consumer 将会提交它的 Offset 给 Kafka
或者每一次数据从指定的 Topic 取回时，将会提交最后一次的 Offset

很明显，这个弊端就在于，如果consumer接收到消息以后，time.Sleep 了6秒才去处理消息，此刻已经commit了你的offset了

这个时候恰巧处理消息的程序崩溃了，那么这条消息就丢失了
```

[自动提交和手动提交-漏消费和重复消费](https://www.cnblogs.com/auuv/articles/15984585.html)
[Kafka自动提交 offset 尚硅谷](https://www.cnblogs.com/jelly12345/p/16018287.html)
[kafka auto commit官方手册](https://blog.csdn.net/chaiyu2002/article/details/89472416)



### 副本同步原理

```
Kafka副本分为Leader副本和Follower副本（主从）

只有Leader副本会对外提供服务，Follower副本只是单纯地和Leader保持数据同步，作为数据冗余容灾的作用

AR（Assigned Replicas）
ISR（InSyncReplicas）

replica.lag.time.max.ms 代表foller副本落后leader副本的最长时间，默认值10秒

HW（High Watermark）：高水位，也叫做复制点，表示副本间同步的位置
LEO（Log End Offset）：下一条待写入消息的位移
```

### Kafka为什么快

1. 顺序 IO

2. Page Cache 和零拷贝

```
操作系统的文件缓存PageCache异步写入，提高了写入消息的性能；
消费消息的时候又通过sendfile实现了零拷贝；

```

3. 批量处理和压缩

```
发送时多条消息合并成一个批次进行处理发送

消费消息一次拉取一批次的消息进行消费
```

### 副本

```
AR(Assigned Replicas)(所有副本) = 
ISR(已经同步的)(In Sync Replicas) + OSR(同步滞后)(Out-of-Sync Replied)
```


[一文读懂kafka](https://baijiahao.baidu.com/s?id=1719501564805569513)

### broker 恢复机制

```
LEO：（Log End Offset）每个副本的最后一个offset

HW：（High Watermark）高水位，指的是消费者能见到的最大的 offset
```
### 先消费后提交offset会有可能出现重复消费的异常，解决异常时保证消费消息的逻辑的幂等性


### 先提交后消费会出现消息丢失的可能，因为offset已经更新了consumer却崩溃了


### 消息堆积出现的原因是消费者跟不上生产者的速度，解决方案时增加partition增加消费者

```
还有1种消息堆积的是因为，手动提交的情况下，consumer.pull到了message但是一直不消费也不提交直接跳过去了
```


### kafka如何在高可用的架构下（多副本）保证数据的一致性的

```
高可用是通过数据冗余的方式实现 （在leader挂了的时候follower推举为新的leader）

数据冗余需要保证数据一致性，就要从副本同步机制讲起
```

### kafka副本同步机制

```
LEO和HW
```


### 分区策略 - message究竟要存到topic下面的哪个分区的策略

```
1. 手动指定partition

2. 随机轮询

3. 按key存储 (key的hash和分区数取余数)

4. 顺序轮询（round-robin）（第一次调用随机生成整数，后续每次调用自增，用这个数于分区数取余数）
```

## 关于我现在自己的项目的一个思考

```
1. 生产者是一个异步的，并且异步回调会写入chan之中，让我们再处理，目前这个回调被我们忽略了有可能带来一个消息丢失
（生产消息可靠性有点低）

2.消费者这里手动commit是一个同步提交操作，对吞吐影响较大

3. 我们目前比较多的是一个消费后手动提交offset的，rebalance之后会不会出现重复消费。比如我在获取了一个消息之后，消费者处理超时了，导致kafka认为我们的消费者已经离线了，rebalance并且把分区给了其他的消费者。这个取决于处理时长，如果5min之内我们都没有处理完就会出现这种情况，目前一次最多poll了500条数据，你认为我们500条数据要处理多久。
```

### kafka的消费者只有1个，但是分区有5个，那么当这个消费者持有消费者组A消费了这个topic，这5个分区的消费位点都会往前挪动吗

```
首先，分区不是副本，多个分区他们的内容不是一样的
```

### 没有阿里云，怎么命令行界面上或者图形上看当前的topic的订阅者有哪些组，每个消费者组的消费位点是什么，堆积量多少

### 有没有做堆积量告警，怎么做的

### 消息查询按时间点、按位点、按分区如何使用查询

### 如何查看某一个消费者组订阅的topic有哪些

### 分区数量的数量设置依据什么合适

### 分区的写入策略

```
轮询
随机
按键保存
自定义
```

[Kafka增加分区导致业务数据异常](https://zhuanlan.zhihu.com/p/392921569)

### kafka同一个消费者会消费了同一个topic多个分区的同一个消费偏移吗

```
首先，分区不是副本，多个分区他们的内容不是一样的
```

### 增加分区后会有什么情况发生

```
比如将分区12 扩展为1234会有什么事情
```

### 一个topic_1有4个分区，只有group_a订阅topic_1，对应的 group_a 的消费者consumer只有一个A，那么这个A可以订阅所有的分区吗

```
当然是可以啊，一个消费者持有一个group_id一定是可以订阅到所有分区的

不能订阅到的情况只能是，多个消费者持有同一个 group_id 
```

[Kafka查看topic、consumer group状态命令](http://wjhsh.net/timor19-p-12742362.html)

[kafka对topic的CRUD](https://blog.csdn.net/javahelpyou/article/details/125887294)

### ACK

```
消费者位置(consumer position) 

每个consumer group保存自己的位移信息, checkpoint机制定期持久化

老版本的位移是提交到zookeeper中的，目录结构是：/consumers/<group.id>/offsets/<topic>/<partitionId>
```

[Kafka 源码解析之 Consumer 如何加入一个 Group](https://blog.csdn.net/weixin_43956062/article/details/106784984)



### 我的 client_A 目前占有1个topic的2个分区(p1,p2)，pull了500条数据(offset = 10~510)正在消费，消费到50%的时候260，重新加入了一个 client_B订阅该topic，那么这个时候会把client_A正在消费的另一个分区给p2 rebalance给 client_B 吗，如果会的话，会把 10~510的数据给 client_B 消费吗

p2分区有可能给client B 

但是10~510的数据，会不会给client B重复消费，取决于clientA 提交的offset

### rebalance的触发情形有哪些，rebalance的底层原理是什么

### kafka

```
使用kafka关注：

1. 消费可靠（提交offset和消费动作次序、重复消费还是消息丢失、消息堆积）

2. 生产可靠（ack、批量发送还是单个发送）

3. kafka可靠（落盘机制、副本机制）
```