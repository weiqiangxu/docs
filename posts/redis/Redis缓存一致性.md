# Redis 缓存一致性

> 数据库与缓存双写一致性问题，是缓存使用中最核心也最容易踩坑的环节。本文系统讲解各种策略的优缺点、异常场景与工业级解决方案。

## 目录

- [一、问题背景](#一问题背景)
- [二、四种更新策略](#二四种更新策略)
- [三、异常场景分析](#三异常场景分析)
- [四、延迟双删](#四延迟双删)
- [五、最终一致方案](#五最终一致方案)
- [六、Canal + MQ 方案](#六canal--mq-方案)
- [七、强一致性方案](#七强一致性方案)
- [八、选型建议](#八选型建议)
- [九、相关资料](#九相关资料)

## 一、问题背景

业务中使用 Redis 缓存数据库数据，典型读写流程：

```mermaid
flowchart LR
    Client[客户端] -->|读| Cache{Redis 缓存}
    Cache -->|命中| Client
    Cache -->|未命中| DB[(MySQL)]
    DB --> Cache
    Client -->|写| DB
```

由于数据同时存在于 DB 和 Cache 两处，任何一处更新都需要考虑另一方，否则会出现**数据不一致**。

### 一致性分类

| 类型 | 说明 | 代价 |
|------|------|------|
| **强一致性** | 任何时刻读到都是最新值 | 性能损耗大、实现复杂 |
| **最终一致性** | 短暂不一致，最终会一致 | 实现简单、性能好 |
| **弱一致性** | 不保证最终一致 | 不推荐用于业务数据 |

> 工业实践：缓存场景几乎都采用**最终一致性**，强一致请直接走 DB 或用分布式事务。

## 二、四种更新策略

围绕"写操作时如何处理缓存"展开：

| 策略 | 描述 | 推荐度 |
|------|------|--------|
| 更新缓存 | 写 DB 后更新缓存 | 不推荐 |
| 删除缓存 | 写 DB 后删除缓存 | 推荐 |
| 先删缓存 | 先删缓存再写 DB | 有坑 |
| 后删缓存 | 先写 DB 再删缓存 | 推荐（Cache Aside） |

### 2.1 更新缓存 vs 删除缓存

| 维度 | 更新缓存 | 删除缓存 |
|------|---------|---------|
| 写放大 | 每次写都更新缓存（即使没人读） | 懒加载，按需重建 |
| 一致性风险 | 并发计算易出错 | 重新读 DB，风险低 |
| 适用场景 | 写少读多且计算复杂 | 通用 |

**结论：删除缓存优于更新缓存**，避免无效写和并发更新错乱。

### 2.2 Cache Aside（旁路缓存）— 标准模式

```mermaid
sequenceDiagram
    participant App
    participant Cache as Redis
    participant DB as MySQL

    Note over App,DB: 读流程
    App->>Cache: GET key
    alt 命中
        Cache-->>App: value
    else 未命中
        Cache-->>App: nil
        App->>DB: SELECT
        DB-->>App: value
        App->>Cache: SET key value
    end

    Note over App,DB: 写流程
    App->>DB: UPDATE
    DB-->>App: OK
    App->>Cache: DEL key
    Cache-->>App: OK
```

**读**：先查缓存，未命中查 DB 后回填缓存。
**写**：先更新 DB，再删除缓存。

## 三、异常场景分析

### 3.1 先删缓存 + 后更新 DB

```mermaid
sequenceDiagram
    participant A as 线程A(写)
    participant B as 线程B(读)
    participant Cache
    participant DB

    A->>Cache: DEL key
    B->>Cache: GET key
    Cache-->>B: nil (未命中)
    B->>DB: SELECT (旧值 20)
    DB-->>B: 20
    A->>DB: UPDATE (新值 21)
    DB-->>A: OK
    B->>Cache: SET key 20 (脏数据回填)
    Note over Cache,DB: 缓存为 20，DB 为 21，不一致！
```

**问题**：读线程把旧值回填缓存，写线程的 DB 更新无法反映到缓存。

### 3.2 先更新 DB + 后删缓存（Cache Aside 标准做法）

```mermaid
sequenceDiagram
    participant A as 线程A(读)
    participant B as 线程B(写)
    participant Cache
    participant DB

    A->>Cache: GET key
    Cache-->>A: nil (刚过期)
    A->>DB: SELECT (旧值 20)
    DB-->>A: 20
    B->>DB: UPDATE (新值 21)
    DB-->>B: OK
    B->>Cache: DEL key
    A->>Cache: SET key 20 (脏数据回填)
    Note over Cache,DB: 缓存为 20，DB 为 21，不一致！
```

**问题**：理论上仍可能不一致，但发生条件苛刻（读 DB 旧值 + 写 DB + 删缓存 三步在极短时间内交织），且读通常比写快很多，概率极低。

### 3.3 删除缓存失败

```mermaid
flowchart LR
    A[更新 DB 成功] --> B[删除缓存失败]
    B --> C[缓存仍是旧值]
    C --> D[持续不一致]
```

**问题**：写库成功但删缓存失败，缓存长时间保留旧值。

## 四、延迟双删

为解决"先删缓存 + 后更新 DB"的问题，演化出**延迟双删**：

```mermaid
sequenceDiagram
    participant App
    participant Cache
    participant DB

    App->>Cache: 1. 删除缓存
    App->>DB: 2. 更新数据库
    Note over App: 3. 休眠 N 毫秒（等待读线程回填完成）
    App->>Cache: 4. 再次删除缓存
    Note over Cache: 最终缓存为空，下次读会回填最新值
```

**伪代码**：

```python
def update(key, value):
    cache.delete(key)              # 第一次删除
    db.update(key, value)          # 更新数据库
    time.sleep(0.5)                # 延迟（依据读业务耗时调整）
    cache.delete(key)              # 第二次删除
```

**休眠时间估算**：读业务耗时 + 几百毫秒余量。如读 DB 约 200ms，可休眠 500ms。

**缺点**：
- 写请求耗时增加（吞吐下降）
- 第二次删除仍可能失败
- 延迟时间难精确控制

## 五、最终一致方案

### 5.1 重试 + 消息队列

删除缓存失败时，通过 MQ 重试，保证最终删除成功：

```mermaid
flowchart LR
    A[更新 DB] --> B[删除缓存]
    B -->|失败| C[发送消息到 MQ]
    C --> D[消费者重试删除]
    D -->|失败| C
    D -->|成功| E[完成]
```

**关键点**：
- 业务代码与缓存解耦，写 DB 后直接发 MQ
- 消费者订阅 MQ 执行删除，失败自动重试
- 达到最大重试次数后告警人工介入

### 5.2 订阅 binlog（推荐）

通过 Canal 等中间件订阅 MySQL binlog，异步删除缓存，业务代码完全无感知：

```mermaid
flowchart LR
    App[业务应用] -->|只更新 DB| DB[(MySQL)]
    DB -->|binlog| Canal[Canal]
    Canal -->|投递| MQ[Kafka/RocketMQ]
    MQ --> Consumer[缓存消费者]
    Consumer -->|删除| Redis[(Redis)]
```

**优势**：
- 业务代码零侵入，无需关心缓存
- binlog 可靠性高，不会丢事件
- 解耦后可独立扩展消费能力

**缺点**：
- 引入额外组件（Canal + MQ）
- 存在秒级延迟（最终一致）

## 六、Canal + MQ 方案

### 6.1 架构

```mermaid
flowchart LR
    subgraph 业务侧
        App1[订单服务]
        App2[用户服务]
    end
    subgraph 数据层
        DB[(MySQL 主)]
        DB2[(MySQL 从)]
    end
    subgraph 缓存同步
        Canal[Canal Server]
        MQ[RocketMQ]
        Consumer[Cache Consumer]
    end
    subgraph 缓存层
        Redis[(Redis Cluster)]
    end

    App1 --> DB
    App2 --> DB
    DB -->|binlog| Canal
    Canal --> MQ
    MQ --> Consumer
    Consumer --> Redis
```

### 6.2 消费者处理逻辑

```python
def consume_binlog(event):
    table = event['table']
    action = event['type']  # INSERT / UPDATE / DELETE

    # 构建缓存 key（依据业务规则）
    keys = build_cache_keys(table, event['data'])

    for key in keys:
        if action == 'DELETE':
            redis.delete(key)
        else:
            # 删除旧缓存，下次读时回填
            redis.delete(key)
            # 或主动回填
            # value = query_db(table, event['data']['id'])
            # redis.set(key, value, ex=3600)
```

### 6.3 关键设计

| 关注点 | 方案 |
|--------|------|
| 顺序性 | 同一 key 路由到同一 MQ 分区 |
| 幂等性 | 消费者记录已处理 binlog 位点 |
| 延迟 | MQ + 消费者并行，控制在 1s 内 |
| 故障恢复 | Canal 记录位点，重启后从断点续传 |

## 七、强一致性方案

当业务确实需要强一致时，可考虑：

### 7.1 加锁串行化

```mermaid
sequenceDiagram
    participant App
    participant Lock as Redis 锁
    participant Cache
    participant DB

    App->>Lock: SET lock NX EX 5
    alt 获取锁成功
        App->>Cache: DEL key
        App->>DB: UPDATE
        App->>Cache: SET key value
        App->>Lock: DEL lock
    else 获取锁失败
        App->>App: 等待重试或返回
    end
```

**缺点**：性能严重下降，仅用于关键路径。

### 7.2 引入版本号

```python
def read(key):
    value, version = cache.get_with_version(key)
    db_value, db_version = db.get_with_version(key)
    if version < db_version:
        cache.set(key, db_value, version=db_version)
        return db_value
    return value

def write(key, value):
    new_version = db.update_and_incr_version(key, value)
    cache.set(key, value, version=new_version)
```

### 7.3 2PC / TCC

通过 Seata 等分布式事务框架，将 DB 与 Cache 操作纳入一个全局事务。代价高，慎用。

## 八、选型建议

```mermaid
flowchart TD
    A[缓存一致性选型] --> B{一致性要求}
    B -->|最终一致| C{QPS 与复杂度}
    C -->|低 QPS| D[Cache Aside + 重试]
    C -->|高 QPS| E[Canal + MQ]
    B -->|强一致| F{性能要求}
    F -->|可接受串行| G[加锁串行化]
    F -->|高并发| H[版本号机制]
```

### 通用建议

1. **优先采用 Cache Aside**（先 DB 后删缓存），覆盖 95% 场景
2. 删除缓存失败用**重试机制**兜底（MQ 或 binlog）
3. 强一致场景才考虑加锁，否则牺牲性能不划算
4. 不要在事务里写缓存，事务回滚后缓存不一致难处理

## 九、相关资料

- [Cache Aside Pattern - Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching)
- [Canal GitHub](https://github.com/alibaba/canal)
- 《Redis 设计与实现》黄健宏
- [小林 coding - 数据库与缓存一致性](https://xiaolincoding.com/redis/architecture/mysql_redis_consistency.html)
