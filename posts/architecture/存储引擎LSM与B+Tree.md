# 存储引擎：LSM Tree 与 B+ Tree

> 数据库存储引擎决定了数据的写入与查询性能。B+ Tree 是关系型数据库的基石，LSM Tree 是 NoSQL 的高性能写入方案。

## 目录

- [一、存储引擎概述](#一存储引擎概述)
- [二、B+ Tree](#二b-tree)
- [三、LSM Tree](#三lsm-tree)
- [四、对比与选型](#四对比与选型)
- [五、其他存储结构](#五其他存储结构)
- [六、相关资料](#六相关资料)

## 一、存储引擎概述

存储引擎决定了数据如何在磁盘上组织、如何被索引和查询。

```mermaid
flowchart LR
    A[存储引擎] --> B[B+ Tree<br/>关系型数据库]
    A --> C[LSM Tree<br/>NoSQL]
    A --> D[Hash Index<br/>KV 存储]
    A --> E[倒排索引<br/>搜索引擎]
```

## 二、B+ Tree

### 2.1 结构

```mermaid
flowchart TD
    Root[根节点<br/>10 | 20 | 30] --> N1[节点<br/>5 | 10]
    Root --> N2[节点<br/>15 | 20]
    Root --> N3[节点<br/>25 | 30]
    N1 --> L1[叶子<br/>1 2 5]
    N1 --> L2[叶子<br/>7 10]
    N2 --> L3[叶子<br/>12 15]
    N2 --> L4[叶子<br/>17 20]
    N3 --> L5[叶子<br/>22 25]
    N3 --> L6[叶子<br/>27 30]
    L1 -.->|链表| L2
    L2 -.-> L3
    L3 -.-> L4
    L4 -.-> L5
    L5 -.-> L6
```

特点：
- 非叶子节点只存索引，不存数据
- 所有数据都在叶子节点
- 叶子节点通过链表相连
- 树高通常 3-4 层

### 2.2 查询过程

```mermaid
sequenceDiagram
    participant Q as 查询 key=20
    participant Root
    participant Mid
    participant Leaf

    Q->>Root: 比较 20
    Note over Root: 20 在 20 和 30 之间
    Root->>Mid: 进入中间子树
    Mid->>Leaf: 进入叶子节点
    Leaf-->>Q: 找到 20 对应的数据
```

查询复杂度：O(log N)

### 2.3 插入与分裂

```mermaid
flowchart LR
    A[插入 18] --> B[找到目标叶子节点<br/>12 15 17 20]
    B --> C[插入后<br/>12 15 17 18 20]
    C --> D{超过阶数?}
    D -->|是| E[分裂<br/>12 15 | 17 18 20]
    D -->|否| F[完成]
    E --> G[父节点添加索引]
```

### 2.4 B+ Tree 在 MySQL InnoDB

```mermaid
flowchart LR
    A[聚簇索引<br/>主键索引] --> B[叶子节点存<br/>完整行数据]
    C[二级索引<br/>非主键索引] --> D[叶子节点存<br/>主键值]
    D --> E[回表查询聚簇索引]
```

```sql
-- 聚簇索引：主键查询直接拿到数据
SELECT * FROM users WHERE id = 1;

-- 二级索引：先查到主键，再回表
SELECT * FROM users WHERE name = 'Alice';
-- 1. 在 name 索引找到主键 id=5
-- 2. 在聚簇索引查 id=5 的完整数据
```

### 2.5 B+ Tree 优缺点

| 优点 | 缺点 |
|------|------|
| 范围查询高效 | 写入需重排节点 |
| 查询稳定 O(log N) | 大量随机 IO |
| 适合读多写少 | 写放大 |

## 三、LSM Tree

### 3.1 核心思想

Log-Structured Merge Tree，将随机写转为顺序写。

```mermaid
flowchart LR
    A[写入] --> B[MemTable<br/>内存]
    B -->|满| C[SSTable<br/>磁盘 L0]
    C -->|Compaction| D[SSTable<br/>磁盘 L1]
    D -->|Compaction| E[SSTable<br/>磁盘 L2]
```

### 3.2 写入流程

```mermaid
sequenceDiagram
    participant W as 写入
    participant WAL as WAL 日志
    participant Mem as MemTable
    participant SST as SSTable

    W->>WAL: 顺序追加
    W->>Mem: 更新内存
    Note over Mem: 内存表（跳表/红黑树）
    Mem-->>W: 返回成功
    Note over Mem,SST: MemTable 满后
    Mem->>SST: 刷盘为 SSTable
```

### 3.3 查询流程

```mermaid
flowchart TD
    A[查询 key] --> B{MemTable 中?}
    B -->|是| C[返回]
    B -->|否| D{Immutable MemTable 中?}
    D -->|是| E[返回]
    D -->|否| F[L0 SSTable]
    F -->|找到| G[返回]
    F -->|未找到| H[L1 SSTable]
    H -->|找到| G
    H -->|未找到| I[继续下一层]
```

查询需合并多层，性能不如 B+ Tree。

### 3.4 Compaction

合并多层 SSTable，消除重复与删除标记：

```mermaid
flowchart LR
    subgraph Compaction前
        A1[L0: k1=1 k2=2 k1=3]
        A2[L1: k1=1 k3=5]
    end
    subgraph Compaction后
        B1[L1: k1=3 k2=2 k3=5]
    end
    A1 & A2 --> B1
```

两种 Compaction：
- **Size-Tiered**：相似大小合并，写放大低，读放大高
- **Leveled**：分层合并，读放大低，写放大高

### 3.5 LSM Tree 优缺点

| 优点 | 缺点 |
|------|------|
| 顺序写性能极高 | 读放大（多层查找） |
| 写吞吐高 | 空间放大（旧版本） |
| 适合写多读少 | Compaction 影响 IO |
| 压缩友好 | 后台 Compaction 资源消耗 |

### 3.6 LSM Tree 应用

| 数据库 | 实现 |
|--------|------|
| LevelDB | Google，Leveled Compaction |
| RocksDB | Facebook，LevelDB 增强版 |
| HBase | 基于 LSM |
| Cassandra | 基于 LSM |
| RocksDB | MySQL RocksDB 引擎 |

## 四、对比与选型

### 4.1 性能对比

```mermaid
flowchart TD
    A[写入] --> B[B+ Tree<br/>随机写 慢]
    A --> C[LSM Tree<br/>顺序写 快]
    D[查询] --> E[B+ Tree<br/>O(log N) 快]
    D --> F[LSM Tree<br/>多层合并 慢]
```

| 维度 | B+ Tree | LSM Tree |
|------|---------|----------|
| 写入 | 慢（随机 IO） | 快（顺序 IO） |
| 查询 | 快 | 慢（多层） |
| 空间 | 紧凑 | 放大 |
| 范围查询 | 强（叶子链表） | 中 |
| 写放大 | 中（一次写） | 高（Compaction） |
| 读放大 | 低 | 高 |
| 适用 | 读多写少 | 写多读少 |

### 4.2 选型决策

```mermaid
flowchart TD
    A[业务特征] --> B{读写比?}
    B -->|读多写少| C[B+ Tree<br/>MySQL/PostgreSQL]
    B -->|写多读少| D[LSM Tree<br/>HBase/Cassandra]
    B -->|读写均衡| E{是否需要事务?}
    E -->|是| F[B+ Tree]
    E -->|否| G[LSM Tree 或 B+ Tree]
```

### 4.3 实际应用

| 场景 | 推荐 | 理由 |
|------|------|------|
| OLTP 交易 | B+ Tree | 强一致、查询快 |
| 日志写入 | LSM Tree | 高吞吐写 |
| 时序数据 | LSM Tree | 写多读少 |
| 用户画像 | B+ Tree | 查询为主 |
| 监控指标 | LSM Tree | 时序写入 |
| 全文搜索 | 倒排索引 | 见下文 |

## 五、其他存储结构

### 5.1 倒排索引

```mermaid
flowchart LR
    A[文档1: Redis is fast]
    A --> B[文档2: Redis stores data]
    C[倒排索引] --> D[Redis: 文档1, 文档2]
    C --> E[is: 文档1]
    C --> F[fast: 文档1]
    C --> G[stores: 文档2]
    C --> H[data: 文档2]
```

Elasticsearch、Lucene 核心结构。

### 5.2 Hash Index

```mermaid
flowchart LR
    A[Hash 函数] --> B[key1 → 槽位 5]
    A --> C[key2 → 槽位 12]
```

特点：
- O(1) 查询
- 不支持范围查询
- 适合等值查询

### 5.3 BitMap

```mermaid
flowchart LR
    A[性别 男] --> B[1 0 1 1 0 1]
    A2[性别 女] --> C[0 1 0 0 1 0]
```

适合基数小的列，ClickHouse 中广泛应用。

## 六、相关资料

- [B+ Tree 详解](https://www.cs.usfca.edu/~galles/visualization/BPlusTree.html)
- [LSM Tree 论文](https://www.cs.umb.edu/~poneil/lsmtree.pdf)
- 《数据密集型应用系统设计》Martin Kleppmann
- [RocksDB 官方文档](https://github.com/facebook/rocksdb/wiki)
- [InnoDB 存储引擎](https://dev.mysql.com/doc/refman/8.0/en/innodb-storage-engine.html)
