# 架构师知识体系

> 本目录系统性整理架构师必备知识，按主题分为 10 个子目录，共 67 篇文档。
> 建议从「分布式理论」入门，再按需深入各专题。

## 文档导航

### 01-分布式理论
基础理论与核心算法，理解分布式系统的本质问题。

- [CAP定理](01-分布式理论/CAP.md) — 一致性、可用性、分区容错的三角权衡
- [BASE理论](01-分布式理论/BASE理论.md) — 高可用下的最终一致性松绑
- [PACELC定理](01-分布式理论/PACELC定理.md) — CAP 的延迟扩展
- [ACID与隔离级别](01-分布式理论/ACID与隔离级别.md) — 数据库事务与 MVCC
- [Paxos算法](01-分布式理论/Paxos算法.md) — 共识算法理论基石
- [Raft算法](01-分布式理论/Raft算法.md) — 易理解的工程化共识算法
- [一致性hash算法](01-分布式理论/一致性hash算法.md) — 节点增删的最小迁移
- [布隆过滤器](01-分布式理论/布隆过滤器.md) — 大规模集合判重
- [哈希冲突](01-分布式理论/哈希冲突.md) — 哈希表冲突处理
- [分布式术语总览](01-分布式理论/分布式术语总览.md) — 思维导图式知识索引

### 02-分布式事务
跨服务、跨节点数据一致性方案选型。

- [2PC](02-分布式事务/2pc.md) — 强一致阻塞式提交
- [3PC](02-分布式事务/3pc.md) — 解决 2PC 阻塞
- [分布式事务总览](02-分布式事务/分布式事务.md) — 方案对比与选型
- [TCC事务](02-分布式事务/TCC事务.md) — Try/Confirm/Cancel 业务补偿
- [Saga模式](02-分布式事务/Saga模式.md) — 长事务补偿编排
- [本地消息表方案](02-分布式事务/本地消息表方案.md) — 跨服务最终一致
- [可靠消息最终一致性](02-分布式事务/可靠消息最终一致性.md) — RocketMQ 事务消息
- [最大努力通知](02-分布式事务/最大努力通知.md) — 跨组织通知
- [数据一致性模型](02-分布式事务/数据一致性模型.md) — 强/弱/最终/因果一致

### 03-架构风格
系统组织模式与设计范式。

- [微服务架构](03-架构风格/微服务架构.md) — 服务拆分与治理
- [事件驱动架构EDA](03-架构风格/事件驱动架构EDA.md) — Broker/Mediator 拓扑
- [CQRS模式](03-架构风格/CQRS模式.md) — 读写模型分离
- [事件溯源](03-架构风格/事件溯源.md) — 以事件为事实存储
- [六边形架构](03-架构风格/六边形架构.md) — 端口与适配器
- [Serverless架构](03-架构风格/Serverless架构.md) — FaaS + BaaS
- [云原生架构](03-架构风格/云原生架构.md) — CNCF 体系
- [领域驱动设计](03-架构风格/领域驱动设计.md) — DDD 战略与战术建模

### 04-数据存储
分库分表、读写分离与存储引擎选型。

- [分库分表方案](04-数据存储/分库分表方案.md) — 水平/垂直拆分
- [读写分离方案](04-数据存储/读写分离方案.md) — 主从复制与路由
- [NoSQL选型](04-数据存储/NoSQL选型.md) — KV/文档/列族/图
- [存储引擎LSM与B+Tree](04-数据存储/存储引擎LSM与B+Tree.md) — 写优化 vs 读优化
- [海量数据处理](04-数据存储/海量数据处理.md) — Bitmap/Bloom/HyperLogLog/外排

### 05-服务治理
微服务运行时治理能力。

- [微服务网关方案](05-服务治理/微服务网关方案.md) — 统一入口与策略
- [服务注册与发现](05-服务治理/服务注册与发现.md) — AP vs CP 选型
- [配置中心方案](05-服务治理/配置中心方案.md) — 集中配置与热更新
- [ServiceMesh](05-服务治理/ServiceMesh.md) — Istio/Linkerd 治理下沉
- [API设计与管理](05-服务治理/API设计与管理.md) — REST/gRPC/GraphQL
- [负载均衡方案](05-服务治理/负载均衡方案.md) — LVS/Nginx/客户端LB
- [降级和熔断方案](05-服务治理/降级和熔断方案.md) — Hystrix/Sentinel
- [分布式限流方案](05-服务治理/分布式限流方案.md) — 令牌桶/漏桶/滑动窗口
- [限频](05-服务治理/限频.md) — 接口级频率控制

### 06-高并发设计
高流量场景的架构与组件设计。

- [高并发架构设计](06-高并发设计/高并发架构设计.md) — 缓存/异步/池化
- [秒杀系统设计](06-高并发设计/秒杀系统设计.md) — 流量分层与原子库存
- [热点数据处理](06-高并发设计/热点数据处理.md) — 多级缓存与多副本
- [容量规划](06-高并发设计/容量规划.md) — 压测与弹性扩缩容
- [分布式缓存方案](06-高并发设计/分布式缓存方案.md) — Redis Cluster/一致性哈希
- [分布式锁方案](06-高并发设计/分布式锁方案.md) — Redis/Zookeeper 实现
- [分布式唯一ID方案](06-高并发设计/分布式唯一ID方案.md) — Snowflake/号段
- [分布式会话方案](06-高并发设计/分布式会话方案.md) — Session 共享

### 07-可观测性
Metrics、Logging、Tracing 三大支柱。

- [指标监控方案](07-可观测性/指标监控方案.md) — Prometheus + Grafana
- [日志聚合方案](07-可观测性/日志聚合方案.md) — ELK vs Loki
- [OpenTelemetry](07-可观测性/OpenTelemetry.md) — 统一可观测性标准
- [分布式服务链路追踪方案](07-可观测性/分布式服务联路追踪方案.md) — Jaeger/Zipkin
- [分布式服务可视化方案](07-可观测性/分布式服务可视化方案.md) — 拓扑与服务地图

### 08-架构师方法论
架构师能力与决策方法论。

- [架构师能力模型](08-架构师方法论/架构师能力模型.md) — 技术深度与广度
- [系统设计方法论](08-架构师方法论/系统设计方法论.md) — 4+1 视图/ADD
- [架构权衡](08-架构师方法论/架构权衡.md) — 取舍原则与案例
- [ADR架构决策记录](08-架构师方法论/ADR架构决策记录.md) — 决策文档化
- [技术选型框架](08-架构师方法论/技术选型框架.md) — 选型维度与流程

### 09-中间件对比
同类中间件的横向选型对比。

- [消息队列对比](09-中间件对比/消息队列对比.md) — Kafka/RocketMQ/RabbitMQ/Pulsar
- [注册中心对比](09-中间件对比/注册中心对比.md) — Nacos/Eureka/Consul/ZooKeeper
- [API网关对比](09-中间件对比/API网关对比.md) — Kong/SCG/APISIX/Zuul

### 10-工程实践
上线交付与运维相关专题。

- [灰度发布方案](10-工程实践/灰度发布方案.md) — 蓝绿/灰度/滚动
- [多租户架构](10-工程实践/多租户架构.md) — SaaS 隔离模型
- [容灾备份方案](10-工程实践/容灾备份方案.md) — 同城/异地双活
- [CDN技术](10-工程实践/CDN技术.md) — 边缘缓存与调度
- [身份认证与授权](10-工程实践/身份认证与授权.md) — OAuth2/JWT/SSO

---

# 分布式理论思维导图

## 一、核心问题领域总览

```mermaid
%%{init: {'themeVariables': { 'mainBkg': '#ffffff', 'textColor': '#000000'}}}%%
mindmap
  root((分布式理论))
    一致性问题
      强一致性
        Paxos
        Raft
        ZAB
      最终一致性
        Gossip
        DNS
        Dynamo模型
    可用性问题
      CAP定理
      BASE理论
      故障检测
        心跳检测
        Phi Accrual
    分区容错
      网络分区处理
      Quorum机制
      多数派投票
    共识算法
      Raft选主
      Paxos提案
      ZAB同步
    分布式事务
      2PC
      3PC
      TCC
      Saga
    数据分布
      一致性哈希
      虚拟节点
      范围分片
    协调服务
      Zookeeper
      etcd
      Consul
```

## 二、各理论解决的问题

```mermaid
flowchart TD
    %% 第一层：一致性领域，整行横向排布
    subgraph Consistency[一致性领域]
        Raft[Raft算法<br/>解决：选主+日志复制]
        Paxos[Paxos算法<br/>解决：多节点达成一致]
        ZAB[ZAB协议<br/>解决：主备切换+数据同步]
        Gossip[Gossip协议<br/>解决：最终一致性传播]
    end
    Raft --- Paxos --- ZAB --- Gossip

    %% 第二层：可用性领域
    subgraph Availability[可用性领域]
        CAP[CAP定理<br/>解决：C/A/P三者权衡]
        BASE[BASE理论<br/>解决：高可用下的松绑一致性]
        Quorum[Quorum机制<br/>解决：读写仲裁平衡]
    end
    CAP --- BASE --- Quorum

    %% 第三层：事务领域
    subgraph Transaction[事务领域]
        TwoPC[2PC<br/>解决：分布式事务原子提交]
        ThreePC[3PC<br/>解决：2PC阻塞问题]
        TCC[TCC<br/>解决：业务侵入式最终一致]
        Saga[Saga<br/>解决：长事务补偿]
    end
    TwoPC --- ThreePC --- TCC --- Saga

    %% 第四层：数据分布领域
    subgraph DataDist[数据分布领域]
        ConsistHash[一致性哈希<br/>解决：节点增删时最小数据迁移]
        VNode[虚拟节点<br/>解决：数据倾斜问题]
        Sharding[范围分片<br/>解决：范围查询效率]
    end
    ConsistHash --- VNode --- Sharding

    %% 第五层：协调服务领域
    subgraph Coordination[协调服务领域]
        ZK[Zookeeper<br/>解决：分布式协调+配置管理]
        Etcd[etcd<br/>解决：服务发现+配置中心]
        Consul[Consul<br/>解决：服务注册+健康检查]
    end
    ZK --- Etcd --- Consul

    %% 垂直连接层与层之间
    Consistency --> Availability
    Availability --> Transaction
    Transaction --> DataDist
    DataDist --> Coordination
```

## 三、核心算法对比

### 3.1 共识算法对比

```mermaid
flowchart LR
    Problem[分布式共识问题<br/>多个节点如何对某个值达成一致]

    Problem --> Paxos[Paxos<br/>理论严谨但复杂]
    Problem --> Raft[Raft<br/>易理解+工程化]
    Problem --> ZAB[ZAB<br/>主备模式专用]

    Paxos -->|优化| MultiPaxos[Multi-Paxos<br/>多提案连续共识]
    Raft -->|特性| LeaderElection[选主机制]
    Raft -->|特性| LogReplication[日志复制]
    Raft -->|特性| Safety[安全性保证]

    ZAB -->|阶段| Discovery[节点发现+选主]
    ZAB -->|阶段| Sync[数据同步]
    ZAB -->|阶段| Broadcast[广播]
```

| 算法         | 解决问题          | 核心机制              | 典型应用                     |
| ---------- | ------------- | ----------------- | ------------------------ |
| **Paxos**  | 多节点如何对一个值达成一致 | 提案者/接受者/学习者       | 理论基础                     |
| **Raft**   | 选主 + 日志复制一致性  | Leader选举+日志复制+安全性 | etcd, Consul             |
| **ZAB**    | 主备数据同步 + 主备切换 | 发现+同步+广播三阶段       | Zookeeper                |
| **Gossip** | 最终一致性传播       | 流言传播+反熵           | Cassandra, Redis Cluster |

### 3.2 Raft 解决的具体问题

```mermaid
flowchart TD
    RaftProblem[Raft要解决的问题]

    RaftProblem --> P1[问题1: 谁是Leader?]
    RaftProblem --> P2[问题2: 数据如何复制到所有节点?]
    RaftProblem --> P3[问题3: Leader挂了怎么办?]
    RaftProblem --> P4[问题4: 如何保证日志顺序一致?]

    P1 --> S1[解决: 随机超时选举<br/>Term任期+投票机制]
    P2 --> S2[解决: Leader追加日志+复制到Follower]
    P3 --> S3[解决: 超时重新选举+新Term]
    P4 --> S4[解决: 日志索引匹配+提交规则]

    S1 --> A[保证: 已提交的日志不会丢失]
    S2 --> B[保证: 多数派写入成功才算提交]
    S3 --> C[保证: 不会出现两个Leader]
    S4 --> D[保证: 状态机安全性]
```

## 四、CAP与BASE的关系

```mermaid
flowchart TD
    CAP[CAP定理]

    CAP --> C[一致性 Consistency<br/>所有节点看到相同数据]
    CAP --> A[可用性 Availability<br/>每个请求都能收到响应]
    CAP --> P[分区容错 Partition tolerance<br/>网络分区时仍能工作]

    P -->|网络必然分区| MustP[P必选]

    MustP --> Choose[实际选择]

    Choose --> CP[CP: 强一致性<br/>牺牲可用性]
    Choose --> AP[AP: 高可用<br/>牺牲强一致性]

    CP --> CPApp[Zookeeper, etcd, HBase]
    AP --> APApp[Cassandra, Eureka, DynamoDB]

    AP --> BASE[BASE理论<br/>解决AP下的最终一致性]

    BASE --> BA[基本可用 Basically Available]
    BASE --> S[软状态 Soft State]
    BASE --> E[最终一致性 Eventually Consistent]

    BASE --> Business[业务场景: 电商库存, 社交feed, 消息队列]
```

## 五、分布式事务演进

```mermaid
flowchart LR
    DistTrans[分布式事务问题<br/>跨节点操作要么全成功要么全失败]

    DistTrans --> XA[XA/2PC<br/>强一致但阻塞]
    DistTrans --> ThreePC[3PC<br/>解决2PC阻塞]
    DistTrans --> TCC[TCC<br/>业务侵入]
    DistTrans --> Saga[Saga<br/>长事务补偿]
    DistTrans --> Msg[本地消息表<br/>最终一致]

    XA --> XAChar[性能差+阻塞]
    ThreePC --> ThreePCChar[降低阻塞但仍不完美]
    TCC --> TCCChar[需Try/Confirm/Cancel三接口]
    Saga --> SagaChar[正向操作+补偿操作]
    Msg --> MsgChar[简单但延迟敏感场景不适合]

    XAChar --> Scene1[场景: 传统金融强一致]
    TCCChar --> Scene2[场景: 电商订单支付]
    SagaChar --> Scene3[场景: 旅行预订长流程]
    MsgChar --> Scene4[场景: 异步消息解耦]
```

| 方案        | 解决问题     | 缺点      | 适用场景  |
| --------- | -------- | ------- | ----- |
| **2PC**   | 强一致分布式事务 | 阻塞+单点故障 | 传统数据库 |
| **3PC**   | 2PC阻塞问题  | 仍可能不一致  | 理论改进  |
| **TCC**   | 业务层面最终一致 | 代码侵入大   | 电商支付  |
| **Saga**  | 长事务的一致性  | 补偿逻辑复杂  | 业务流程长 |
| **本地消息表** | 跨服务最终一致  | 依赖消息系统  | 异步场景  |

## 六、数据分布策略

```mermaid
flowchart TD
    DataDist[数据分布问题<br/>数据如何分散到多个节点]

    DataDist --> Hash[哈希分片]
    DataDist --> Range[范围分片]
    DataDist --> ConsistHash[一致性哈希]

    Hash --> HashProb[问题: 节点变更时数据大迁移]
    Range --> RangeProb[问题: 热点数据问题]
    ConsistHash --> CHProb[问题: 数据倾斜]

    CHProb --> VNode[解决: 虚拟节点<br/>每个物理节点映射多个虚拟节点]
    CHProb --> Weighted[解决: 权重分配<br/>根据节点能力分配虚拟节点数]

    ConsistHash --> Apps[应用: Redis Cluster, Cassandra, Memcached]
    Range --> Apps2[应用: HBase, MySQL分库分表]
    Hash --> Apps3[应用: 简单场景的取模分片]
```

## 七、典型协调服务对比

```mermaid
flowchart TD
    Coord[协调服务要解决的问题]

    Coord --> Config[配置管理]
    Coord --> Service[服务发现]
    Coord --> Lock[分布式锁]
    Coord --> Leader[Leader选举]
    Coord --> Sync[元数据同步]

    Config --> ZK1[Zookeeper]
    Service --> Etcd1[etcd]
    Lock --> ZK2[Zookeeper/Redis]
    Leader --> Etcd2[etcd]
    Sync --> ZK3[Zookeeper]
```

| 服务            | 一致性算法       | 典型场景           | 语言   |
| ------------- | ----------- | -------------- | ---- |
| **Zookeeper** | ZAB         | Hadoop/Kafka协调 | Java |
| **etcd**      | Raft        | K8s配置/服务发现     | Go   |
| **Consul**    | Raft        | 服务注册+健康检查      | Go   |
| **Nacos**     | Raft/Distro | 配置中心+服务发现      | Java |

## 八、面试高频问题速查

```mermaid
mindmap
  root((分布式面试题))
    理论类
      CAP怎么选
      BASE是什么
      ACID vs BASE
    算法类
      Raft选主流程
      Raft日志复制
      Paxos与Raft区别
      Gossip传播机制
    事务类
      2PC有什么问题
      TCC如何实现
      Saga补偿顺序
      最终一致性方案
    工程类
      分布式锁实现
      分布式ID生成
      限流算法
      一致性哈希原理
```

## 九、参考资料

- [Raft论文中文版](https://github.com/maemual/raft-zh_cn)
- [Paxos Made Simple](https://lamport.orgpubs/paxos-simple.pdf)
- [CAP定理](https://zh.wikipedia.org/wiki/CAP定理)
- [分布式系统必读论文合集](https://github.com/papers-we-love/papers-we-love)

