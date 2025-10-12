---
hide: true
---
# Redis集群模式搭建

1. redis-conf
2. redis-cli --cluster create


### Redis-conf配置

```
#注释掉 bind 项，默认监听所有网卡 70 #bind 127.0.0.1
#关闭保护模式 89 protected-mode no
#redis默认端口6379 不用修改 port 6379

# 开启AOF持久化
appendonly yes

# 开启守护进程
daemonize yes

# 指定redis进程的PID文件存放位置
pidfile "/home/centos/redis/redis-6.2.6/logs/redis/redis.pid"

# log文件输出位置，如果进程以守护进程的方式运行，此处又将输出文件设置为stdout的话，就会将日志信息输出到/dev/null里面去了
logfile "/home/centos/redis/redis-6.2.6/logs/redis/redis.log"

# 默认16个数据库
databases 16

# 指定本地数据库文件名
dbfilename "dump.db"

# 指定本地数据问就按存放位置
dir "/home/centos/redis/redis-6.2.6/logs/data"

# 设置redis连接密码，如果配置了连接密码，客户端在连接redis是需要通过AUTH<password>命令提供密码，默认关闭
requirepass "xyredis"

# 开启集群功能
cluster-enabled yes

# 群集名称文件设置
cluster-config-file nodes-6379.conf

# 取消注释群集超时时间设置
cluster-node-timeout 15000
```

### 服务启动和连接

```
./redis-server /home/centos/redis/redis-6.2.6/redis.conf
```
```
redis-cli --cluster create --cluster-replicas 1 192.168.0.1:6379 192.168.0.2:6379 192.168.0.3:6379 -a redis
```
```
redis-cli -c -p 6379 -a redis (-a 表示授权账户/密码登录 -c表示集群模式)
```
# Full_stack_knowledge_system

[pdai.tech](https://pdai.tech/)
