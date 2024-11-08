# etcd基础

### 一、常用API

1. 键值存储相关

```bash
$ etcdctl version
etcdctl version: 3.4.34
API version: 3.4

etcdctl put mykey initialvalue

# 设置并返回上一个版本的值
etcdctl put mykey newvalue --prev-kv

etcdctl get key --rev=<revision_number>
```

```go
client.Put(ctx, "key", "value")
resp, err := client.Get(ctx, "key")
cancel()
if err!= nil {
    // 处理错误
}
for _, kv := range resp.Kvs {
    fmt.Printf("Key: %s, Value: %s\n", kv.Key, kv.Value)
}

client.Delete(ctx, "key")
```

2. Watch机制

```bash
# 监听单个键的变化
etcdctl watch key

# 监听一个键范围的变化
etcdctl watch --prefix key-prefix

# 指定起始版本开始监听
etcdctl watch --from-key key --revision 5

# 监听并输出详细信息
etcdctl watch --prefix key-prefix --output=json
```

```go
watchCh := client.Watch(ctx, "key")
for watchResp := range watchCh {
    for _, event := range watchResp.Events {
        fmt.Printf("Type: %s, Key: %s, Value: %s\n", event.Type, event.Kv.Key, event.Kv.Value)
    }
}
```

3. Lease（租约）

```bash
# 创建租约
etcdctl lease grant 60
lease 7528568867886775889 granted with TTL(60s)

# 将键值对与租约关联
etcdctl put --lease=7528568867886775889 key value

# 查看租约
etcdctl lease timetolive 7528568867886775889
lease 7528568867886775889 granted with TTL(60s), remaining(52s)

# 续租租约
etcdctl lease keep-alive 7528568867886775889
lease 7528568867886775889 keepalived with TTL(60s)

# 撤销指定租约，与其关联的键值对将被删除
etcdctl lease revoke 7528568867886775889
lease 7528568867886775889 revoked
```

```go
// 创建租约
resp, err := client.Grant(ctx, 10) // 创建一个 10 秒的租约
cancel()
if err!= nil {
    // 处理错误
}
leaseID := resp.ID

// 将键与租约关联
// 当租约过期时，对应的键值对也会被自动删除
_, err := client.Put(ctx, "key", "value", clientv3.WithLease(leaseID))
cancel()
if err!= nil {
    // 处理错误
}
```

4. 事务（Transaction）

```go
txn := client.Txn(ctx)
txn.If(clientv3.Compare(clientv3.Value("key"), "=", "oldValue")).
    Then(clientv3.OpPut("key", "newValue")).
    Else(clientv3.OpGet("key"))
resp, err := txn.Commit()
cancel()
if err!= nil {
    // 处理错误
}
if resp.Succeeded {
}
```

### 二、Etcd底层原理

- 高可用的分布式键值存储系统
- 使用 BoltDB 作为底层存储引擎（基于 B + 树的嵌入式键值存储）
- 使用 gRPC 作为其网络通信框架
- 支持 watcher 机制，允许客户端订阅特定的键或目录

### 三、Etcdctl模拟租约抢占

1. Docker install etcd

```bash
$ docker run --name etcd -d -p 2379:2379 -p 2380:2380 \
    -e ALLOW_NONE_AUTHENTICATION=yes \
    bitnami/etcd:3.4.34 etcd
```

```bash
$ etcdctl --endpoints=http://127.0.0.1:2379 put /key1 value1

# --endpoints=http://127.0.0.1:2379 是默认的不带也行
$ etcdctl get /key1
```

2. 开始选主

```bash
# 窗口A
# 创建租约
$ etcdctl lease grant 60
lease 694d930bfe83dd0b granted with TTL(120s)

# 将键值对与租约关联
$ etcdctl put /leader A --lease=694d930bfe83dd0b
$ etcdctl get /leader

# 续租租约
$ etcdctl lease keep-alive 694d930bfe83dd0b
lease 694d930bd89d3a0b keepalived with TTL(120)
```

```bash
# 窗口B
# 查看这个key是否有值,如果有的话表示有租约关联
# 此时不会将自己作为Leader节点
$ etcdctl get /leader

# 如果窗口A不续租
# 窗口B监听Key会收到一个DELETE信号
# 注意：这里有可能两个进程几乎同时检测到/leader键为空
# 然后同时写入/leader为自己的进程id然后最终写入决定谁是主节点
$ etcdctl watch /leader
DELETE

# 此时窗口B创建租约
$ etcdctl lease grant 60
lease zzz granted with TTL(120s)

# 写入成功时候进阶为主节点
$ etcdctl put /leader B --lease=694d930bfe83dd0b
```

### Q&A

1. k8s用到etcd的地方有哪些
    - 当数据存储。
        etcd存储了Kubernetes集群中所有节点\容器组（Pod）信息\服务（Service）信息\配置对象，如命名空间、存储卷（PersistentVolume 和 PersistentVolumeClaim）、配置映射（ConfigMap）、密钥（Secret）等
    - 实现分布式协调和一致性。
        控制平面组件(api-server\controller-manager等)使用 etcd 的领导者选举机制确保只有一个实例处于活动状态并执行关键任务。领导者实例出现故障，立刻通过 etcd 进行领导者选举领导继续提供服务。
    - 配置变更通知。Kubernetes 组件可以通过监听 etcd 比如Deployment的副本数量，及时调整Pod数量。
    - 分布式锁。Kubernetes 组件会使用分布式锁来确保资源的互斥访问。

2. Etcd的分布式锁如何实现的
    - 基于租约实现分布式锁
    - 基于事务（Transaction）：开启事务判断key是否存在
    - 基于版本号（Version）实现：版本号匹配时才写入成功，写入成功就意味着获得锁
    - 基于前缀（Prefix）实现：所有客户端监听键值对判断锁是否呗释放

3. Etcd的领导者选举机制选举leader是怎么样的
    基于Raft一致性算法。

### 相关文章

- [用 etcd 实现服务注册和发现](https://learnku.com/articles/37344)
- [悟禅小书童Etcd服务注册发现实例](https://blog.lerzen.com/post/etcd%E6%9C%8D%E5%8A%A1%E6%B3%A8%E5%86%8C%E5%8F%91%E7%8E%B0%E5%AE%9E%E4%BE%8B/)
- [基于 Etcd 的分布式锁实现原理及方案](https://learn.lianglianglee.com/%E4%B8%93%E6%A0%8F/%E5%88%86%E5%B8%83%E5%BC%8F%E4%B8%AD%E9%97%B4%E4%BB%B6%E5%AE%9E%E8%B7%B5%E4%B9%8B%E8%B7%AF%EF%BC%88%E5%AE%8C%EF%BC%89/10%20%E5%9F%BA%E4%BA%8E%20Etcd%20%E7%9A%84%E5%88%86%E5%B8%83%E5%BC%8F%E9%94%81%E5%AE%9E%E7%8E%B0%E5%8E%9F%E7%90%86%E5%8F%8A%E6%96%B9%E6%A1%88.md)