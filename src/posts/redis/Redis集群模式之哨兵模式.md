---
hide: true
---

# 哨兵 redis-sentinel

[InfoQ Redis集群](https://xie.infoq.cn/article/6c3500c66c3cdee3d72b88780)

> master宕机哨兵会自动选举slave为master

### 配置
```
redis.conf与主从一致
每个哨兵进程sentinel.conf
```

### 模拟环境
```
slave三个和master一个
哨兵sentinel也有3个
```

### 工作模式
```
哨兵sentinel每秒钟ping slave和master
单个sentinel没收到响应就会认为主观下线(SDOWN)
足够数量的哨兵认为主观下线之后
master将会被标记为客观下线(ODOWN)

master宕机之后
哨兵之间进行投票选举master
```