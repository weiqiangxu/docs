# 基于Docker搭建Redis集群

### 创建本地data目录和conf文件夹

```bash
mkdir -p /Users/xuweiqiang/Documents/redis/cluster/node1/data \
mkdir -p /Users/xuweiqiang/Documents/redis/cluster/node1/conf \
mkdir -p /Users/xuweiqiang/Documents/redis/cluster/node2/data \
mkdir -p /Users/xuweiqiang/Documents/redis/cluster/node2/conf \
mkdir -p /Users/xuweiqiang/Documents/redis/cluster/node3/data \
mkdir -p /Users/xuweiqiang/Documents/redis/cluster/node3/conf
```
```bash
cd /Users/xuweiqiang/Documents/redis/cluster/node1/conf && touch redis.conf
cd /Users/xuweiqiang/Documents/redis/cluster/node2/conf && touch redis.conf
cd /Users/xuweiqiang/Documents/redis/cluster/node3/conf && touch redis.conf
```

### 配置写入redis.conf文件

```bash
#端口
port 6379
bind 0.0.0.0
#启用集群模式
cluster-enabled yes 
cluster-config-file nodes.conf
#超时时间
cluster-node-timeout 5000
# 集群连接地址及端口
# cluster-announce-ip 192.168.3.13
# cluster-announce-port 6379
# cluster-announce-bus-port 16379
appendonly yes
#集群加密
# masterauth 123456
# requirepass 123456
```

### 节点一

```bash
docker run -d --name redis-node1 \
--privileged=true \
-v /Users/xuweiqiang/Documents/redis/cluster/node1/conf/redis.conf:/etc/redis/redis.conf \
-v /Users/xuweiqiang/Documents/redis/cluster/node1/data:/data \
-p 6380:6379 redis:7.0 \
redis-server /etc/redis/redis.conf
```

### 节点二

```bash
docker run -d --name redis-node2 \
--privileged=true \
-v /Users/xuweiqiang/Documents/redis/cluster/node2/conf/redis.conf:/etc/redis/redis.conf \
-v /Users/xuweiqiang/Documents/redis/cluster/node2/data:/data \
-p 6381:6379 redis:7.0 \
redis-server /etc/redis/redis.conf
```

### 节点三

```bash
docker run -d --name redis-node3 \
--privileged=true \
-v /Users/xuweiqiang/Documents/redis/cluster/node3/conf/redis.conf:/etc/redis/redis.conf \
-v /Users/xuweiqiang/Documents/redis/cluster/node3/data:/data \
-p 6382:6379 redis:7.0 \
redis-server /etc/redis/redis.conf
```

### 启动集群模式

```bash
# 查看容器的IP [IPAddress]
docker inspect redis-node1

# 任意进入一个节点的容器内
redis-cli --cluster create 172.17.0.2:6379 172.17.0.3:6379 172.17.0.4:6379 --cluster-replicas 0
```

### 测试集群

```bash
redis-cli -c
set id 999
# 切换节点
get id
```


### 配置信息

```txt
port：节点端口；
requirepass：添加访问认证；
masterauth：如果主节点开启了访问认证，从节点访问主节点需要认证；
protected-mode：保护模式，默认值 yes，即开启。开启保护模式以后，需配置 bind ip 或者设置访问密码；关闭保护模式，外部网络可以直接访问；
daemonize：是否以守护线程的方式启动（后台启动），默认 no；
appendonly：是否开启 AOF 持久化模式，默认 no；
cluster-enabled：是否开启集群模式，默认 no；
cluster-config-file：集群节点信息文件；
cluster-node-timeout：集群节点连接超时时间；
cluster-announce-ip：集群节点 IP，填写宿主机的 IP；
cluster-announce-port：集群节点映射端口；
cluster-announce-bus-port：集群节点总线端口。
```

### 相关命令
```bash
# docker查看容器信息
docker inspect redis-node1
```

### 参考博客

[docker搭建redis集群](https://www.cnblogs.com/edda/p/16268845.html)
[pdai.tech](https://pdai.tech/)
