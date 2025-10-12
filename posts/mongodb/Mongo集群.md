---
title: mongodb集群
hide: true
---

# mongodb基于k8s实现高可用

# mongo集群模式

MongoDB 有三种集群部署模式，分别为主从复制（Master-Slaver）、副本集（Replica Set）和分片（Sharding）模式。

Master-Slaver 是一种主从副本的模式，目前已经不推荐使用。

Replica Set 模式取代了 Master-Slaver 模式，是一种互为主从的关系。Replica Set 将数据复制多份保存，不同服务器保存同一份数据，在出现故障时自动切换，实现故障转移，在实际生产中非常实用。

Sharding模式适合处理大量数据，它将数据分开存储，不同服务器保存不同的数据，所有服务器数据的总和即为整个数据集。

# 三种集群模式评价

``` bash
Sharding 模式追求的是高性能，而且是三种集群中最复杂的。在实际生产环境中，通常将 Replica Set 和 Sharding 两种技术结合使用
```

# 主从

一主多从

比单机好，起码在故障恢复、容灾、备份、读扩展会好很多

主节点人工配置，集群出现问题，需要人工将从节点指定为主节点

从节点和主节点之前通过从节点定期轮询主节点的方式同步数据

从节点只用于读

# 副本

一主多从

主节点故障时候，从节点会自动选举出主节点

主节点会设置其他节点为从节点并设置从节点的可读性分担读取数据压力

副本集可以解决主节点发生故障导致数据丢失或不可用的问题，但遇到需要存储海量数据的情况时，副本集机制就束手无策了，副本集中的一台机器可能不足以存储数据，或者说集群不足以提供可接受的读写吞吐量

# 分片

分片服务器（Shard Server）、配置服务器（Config Server）和路由服务器（Route Server）

每个 Shard Server 都是一个 mongod 数据库实例，用于存储实际的数据块

实际生产中，一个 Shard Server 可由几台机器组成一个副本集来承担，防止因主节点单点故障导致整个系统崩溃


# 上述集群模式诠释了什么是高可用、高可扩展性



### 高可用原理


MongoDB分布式集群架构（3种模式）

http://c.biancheng.net/view/6567.html


全面剖析 MongoDB 高可用架构

https://mp.weixin.qq.com/s/jLsviuQ0wCcsmkskXSFdEQ



MongoDB 副本集之入门篇

https://jelly.jd.com/article/5f990ebbbfbee00150eb620a


Mongodb主从复制/ 副本集/分片集群介绍

https://www.cnblogs.com/kevingrace/p/5685486.html


官方推荐的搭建方案

https://registry.hub.docker.com/r/bitnami/mongodb


### 实践

kubernetes生产实践之mongodb

https://zhuanlan.zhihu.com/p/356658594

http://t.zoukankan.com/klvchen-p-13685380.html

### 测试验证


### 一、MongoDB ReplicaSet

1. 创建命名空间

```
kubectl create namespace dev
# 查看节点名称
kubectl get nodes
```

2. mongod-replicaset.yaml

```
apiVersion: apps/v1 
kind: Deployment
metadata:
  namespace: dev
  name: mongodb
  labels:
    app: mongodb
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      nodeName: k8s-node1    # 固定在 k8s-node1 节点
      containers:
      - name: mongodb
        image: mongo:4.2.9
        resources:
          limits:            # 限定资源
            cpu: 1000m
            memory: 1Gi
          requests:
            cpu: 100m
            memory: 1Gi
        env:
          - name: MONGO_INITDB_ROOT_USERNAME  # 设置用户名
            value: root
          - name: MONGO_INITDB_ROOT_PASSWORD  # 设置密码
            value: '123456'
        volumeMounts:
          - mountPath: /data/db                    
            name: mongodb-volume
      volumes:
        - name: mongodb-volume
          hostPath:
            path: /data/rs-mongodb-volume          # 映射的宿主机目录
            type: DirectoryOrCreate
 
---

apiVersion: v1
kind: Service
metadata:
  namespace: dev
  name: mongodb
spec:
  type: ClusterIP
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
```

4. 执行安装 

```
kubectl apply -f mongod-replicaset.yaml
kubectl get pod -n dev -o wide
# 查看详细-如果起不来需要用于排查原因
kubectl describe pod mongodb -n dev
```

5. 查看用户名密码

```
kubectl -n dev exec -it POD_NAME /bin/bash
```

6. 登陆集群

```
mongo admin

db.auth('root','123456')

use test

db.createUser(
   {
     user: "test",
     pwd: "test123",
     roles: [ { role: "readWrite", db: "test" } ]
   }
)

show dbs
```


### 二、MongoDB Sharding

1. 编写mongodb-sharding.yaml

```
apiVersion: kubedb.com/v1alpha2
kind: MongoDB
metadata:
  name: mongo-sharding
  namespace: op
spec:
  version: 4.2.3
  shardTopology:
    configServer:
      replicas: 3
      storage:
        resources:
          requests:
            storage: 1Gi
        storageClassName: rbd
    mongos:
      replicas: 2
    shard:
      replicas: 3
      shards: 2
      storage:
        resources:
          requests:
            storage: 1Gi
        storageClassName: rbd
```

2. 执行部署，并查看部署状态

```
kubectl exec -it podName  -c  containerName -n namespace -- shell comand

kubectl exec -it mongodb -n op -- shell comand
kubectl apply -f mongodb-sharding.yaml
kubectl get po -n op
```

3. 验证集群状态及读写



# 获取账号密码
kubectl get secrets -n demo mongo-sh-auth -o jsonpath='{.data.\username}' | base64 -d
root
kubectl get secrets -n demo mongo-sh-auth -o jsonpath='{.data.\password}' | base64 -d
123456

mongo admin -u root -p

查看分片集群状态
sh.status()


创建分片
sh.enableSharding("test");

创建集合
sh.shardCollection("test.testcoll", {"myfield": 1});

写入数据
db.testcoll.insert({"myfield": "scofield", "agefield": "18"});
db.testcoll.insert({"myfield": "amos", "otherfield": "d", "kube" : "db" });

获取数据
db.testcoll.find();














