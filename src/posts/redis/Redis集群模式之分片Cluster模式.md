# Cluster模式

### 节点数

>  官方推荐 3主3从六个节点

### 配置
```
redis.conf.cluster-enabled / cluster-config-file
```

### redis-tri.rb工具

将6台独立机器纳入到一个集群内

> redis-trib.rb create --replicas 1 192.168.1.1:6379 192.168.1.2:6379 ...

### 运行机制
```
redis-cluster 采用去中心化的思想
```

### 扩容
```
redis-tri.rb add-node 新机器纳入集群
redis-tri.rb reshard 数据迁移
```

- [博客园cluster](https://www.cnblogs.com/jian0110/p/14002555.html)
- [Java全栈知识体系](https://pdai.tech/md/db/nosql-redis/db-redis-x-cluster.html)