# 集群模式主从模式

[InfoQ Redis集群](https://xie.infoq.cn/article/6c3500c66c3cdee3d72b88780)

### 模式概览
```
一主多从
主负责读写
从负责读 [Redis2.6开始默认从只读]
```

### 如何使用
```
redis.conf.slaveof\masterauth

./redis-server --slaveof 127.0.0.1 6379
```


### 同步机制
```
slave发送SYNC命令
master启动BGSAVE快照
slave快照初始化
master写操作增量同步给slave
```

### 优点
```
读写分离
master和slave都是非阻塞式
```


### 缺点
```
master宕机需要手动介入
主从同步延迟导致的slave数据不一致问题
slave太多带来master的IO压力
扩容麻烦
```