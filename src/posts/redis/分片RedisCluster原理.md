---
hide: true
---
# 集群分片

> 主从只是扩展了读，但是写和存储能力并未得到扩展

### 关键模块

1. 哈希槽(Hash Slot)(数量是2^14=16384)，Cluster每个节点负责一部分哈希槽

2. Keys hash tags 将相关Key分配到相同的hash slot

3. Cluster nodes属性
```
redis-cli cluster nodes

node id, address:port, flags, last ping sent, last pong received, configuration epoch, link state, slots.
```
Cluster总线

4. Cluster总线
```
节点之间通讯使用集群总线和集群总线协议：有不同的类型和大小的帧组成的二进制协议
```

5. 集群拓扑

6. 节点握手

### 请求重定向

> 去中心化思想，集群主节点各自负责一部分槽

###  MOVED重定向

```
客户端发送key命令，节点检查不存在会返回Moved 重定向，客户端收到以后会根据Moved再一次发送找寻目标节点

redis-cli -c 

-c 是集群方式启动，即没加参数 -c，redis-cli不会自动重定向
```

### Ask重定向
```
集群伸缩会导致槽迁移，当我们去源节点访问时，此时数据已经可能已经迁移到了目标节点，使用Ask重定向来解决此种情况
```

### 扩容&缩容
```
扩容

1. 节点纳入，cluster meet new_node_ip:new_node_port 或者 redis-trib add node
2. 数据迁移，将槽迁移到目标节点

缩容

1. 槽迁移
2. 广播下线 cluster forget nodeId
```

### 为什么Redis Cluster的Hash Slot 是2^14=16*1024

### 为什么Redis Cluster中不建议使用发布订阅
```
所有的publish命令都会向所有节点（包括从节点）进行广播，带宽消耗大
```


### 经典面试题

1. 数据如何分部在切片实例中
2. 重定向机制
3. 



### 分片模式添加数据的逻辑

1. key 转 hash槽，hash槽 转 节点 

```
key (CRC16算法) >>> 16 bit

16 bit >>>  1024*16 (16384) 取模  = hash槽值
```


```
实例和哈希槽的映射关系不是固定的

实例出现了新增或者删除，重新分配哈希槽，哈希槽在所有实例上重新分布一遍
```

### 如果有3个实例，而 test 数据分配在实例2的哈希槽之中，那么在实例1执行 get test 的数据会发生什么

```
客户端在实例1执行 get test

客户端收到MOVED命令后

客户端会再次向实例2发送请求

并更新客户端本地缓存中维护的哈希槽和实例的映射关系
```

### ASK响应 和 MOVED响应

```
收到ask响应后虽然也和moved一样会继续请求新的实例

但是并不会更新客户端本地缓存中维护的哈希槽和实例的映射关系

收到 MOVEND响应会 更新本地维护的哈希槽和实例的映射关系缓存
```

### 分片模式到底有没有数据拷贝？有没有同步异步复制的过程？

### 分片的缺点

1. 无法直接对映射在两个不同 Redis 实例上的键执行交集 (涉及多个键的操作通常不支持)
2. 涉及多个键的事务不能使用
3. 备份数据时需要聚合多个实例和主机的持久化文件


### redis 分片副本


[深入了解 Redis 集群：分片算法和架构](https://baijiahao.baidu.com/s?id=1748526448763042395)

1. 去中心化服务器端分片 - 官方 Redis 集群中实际使用的
```
请求可以命中任何 Redis 节点

每个节点都知道集群中的所有其他节点

处理请求的节点将首先检查自身或其他节点是否具有请求的数据

如果数据存储在其他地方，则将请求重定向到相应的节点
```

2. 分片算法

```
一致的哈希

Redis 集群中使用的哈希槽分片

slot = CRC16(key) % 16383
```


[分片详解](https://cloud.tencent.com/developer/article/1792305)

[分片的高可用方案](https://developer.aliyun.com/article/845366)



# Full_stack_knowledge_system

[pdai.tech](https://pdai.tech/)
