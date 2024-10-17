---
title: kafka的组
tags:
  - kafka原理
categories:
  - kafka
date: 2023-04-08 06:40:12
index_img: /images/bg/computer.jpeg
hide: true
---

### 相关概念

1. 自动提交

```
如果enable.auto.commit为true
则消费者偏移自动提交给Kafka的频率（以毫秒为单位），默认值为5000
```

2. 偏移量

```
当Kafka.group中没有初始偏移量或者服务器上默认值为latest

latest 不存在offset时，消费最新的消息
earliest 不存在offset时，从最早消息开始消费
none 不存在offset时，直接报错
```

3. 心跳

```
心跳与消费者协调员之间的预期时间（以毫秒为单位），默认值为3000

heartbeat-interval
```

4. topic 创建
```
kafka-topics.sh --zookeeper 47.52.199.52:2181 --create --topic test-15 --replication-factor --partitions
```

5. position
```
kafka-topics.sh --zookeeper zk.server --alter --topic test --replication-factor --partitions
```

6. group.id需要手动创建吗

```
默认会生成，可以手动配置


cd /home/kafka/software/kafka_2.10-0.9.0.1/config
cp consumer.properties consumer1.properties
vim consumer1.properties

group.id = user_group
```
```
./bin/kafka-console-consumer.sh --zookeeper 127.0.0.1:80 --topic connect-test --consumer.config config/consumer1.properties
```

7. 服务端查看消费者组和消费者信息
```
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group UserGroup --describe
```

[kafka为什么有消费者组](https://cloud.tencent.com/developer/article/1540509)

[how-to-create-a-new-consumer-group-in-kafka](https://stackoverflow.com/questions/61770993/how-to-create-a-new-consumer-group-in-kafka)

1. config/consumer.properties 添加 group_id
2. 添加配置行 group_id=my-created-consumer-group
```
bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic test-topic --from-beginning --group my-created-consumer-group
```

[Group CLI 教程中的 Kafka 消费者](https://www.conduktor.io/kafka/kafka-consumers-in-group-cli-tutorial)

```
kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic first_topic --group my-first-application 
```

#### my-first-application 需要提前手动创建吗

```
cd /home/kafka/software/kafka_2.10-0.9.0.1/config

cp consumer.properties consumer1.properties
vim consumer1.properties
```

### 参考资料

[group配置](https://www.csdn.net/tags/MtjaQg0sODkzNjEtYmxvZwO0O0OO0O0O.html)