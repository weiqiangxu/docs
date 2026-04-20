# Elasticsearch 全面指南

## 目录

- [第一章：入门基础](#第一章入门基础)
- [第二章：核心概念](#第二章核心概念)
- [第三章：索引与管理](#第三章索引与管理)
- [第四章：查询详解](#第四章查询详解)
- [第五章：聚合分析](#第五章聚合分析)
- [第六章：性能优化](#第六章性能优化)
- [第七章：集群架构](#第七章集群架构)
- [第八章：底层原理](#第八章底层原理)
- [第九章：高级特性](#第九章高级特性)
- [第十章：实战问题](#第十章实战问题)

---

# 第一章：入门基础

## 1.1 快速开始

### Docker启动Elasticsearch

```bash
$ docker run -d --name elasticsearch \
    -p 9200:9200 \
    -p 9300:9300 \
    -e "discovery.type=single-node" \
    -e ES_JAVA_OPTS="-Xms64m -Xmx128m" \
    docker.elastic.co/elasticsearch/elasticsearch:7.17.3
```

访问地址：[http://127.0.0.1:9200](http://127.0.0.1:9200)

### 基本操作

```bash
# 创建索引
$ curl -X PUT "http://localhost:9200/products"

# 查看索引列表
$ curl "http://localhost:9200/_cat/indices?format=json"

# 插入文档
$ curl -X POST "http://localhost:9200/products/_doc" \
    -H 'Content-Type: application/json' \
    -d '{"name": "iPhone 14", "price": 7999, "description": "mobile phone"}'

# 查询文档
$ curl -X GET "http://localhost:9200/products/_search?size=1000"

# 条件查询
$ curl -X GET "http://localhost:9200/products/_search" \
    -H 'Content-Type: application/json' \
    -d '{"query": {"range": {"price": {"gt": 7000}}}}'

# 更新文档
$ curl -X POST "http://localhost:9200/products/_update/<doc_id>" \
    -H 'Content-Type: application/json' \
    -d '{"doc": {"price": 6999}}'

# 删除文档
$ curl -X DELETE "http://localhost:9200/products/_doc/<doc_id>"

# 删除索引
$ curl -X DELETE "http://localhost:9200/products"
```

---

# 第二章：核心概念

## 2.1 核心术语对比

| 概念 | 关系型数据库对比 | 说明 |
|------|------------------|------|
| Index（索引） | Database（数据库） | 文档的集合 |
| Document（文档） | Row（行） | JSON格式的数据单位 |
| Field（字段） | Column（列） | 文档的数据属性 |
| Mapping（映射） | Schema（表结构） | 字段类型定义 |
| Type（类型） | Table（表） | 已废弃，1.x曾使用 |

## 2.2 数据结构特点

```
文档（Document）示例：
{
  "name": "iPhone 14",
  "price": 7999,
  "tags": ["手机", "苹果", "旗舰"],
  "specs": {
    "screen": "6.1寸",
    "storage": "128GB"
  }
}
```

| 特点 | 说明 |
|------|------|
| JSON格式 | 简单、扁平的数据结构更高效 |
| 动态映射 | 自动推断字段类型 |
| 嵌套对象 | 支持复杂的层级结构 |
| 向量化 | 支持稀疏字段 |

## 2.3 核心概念架构图

```mermaid
flowchart TD
    subgraph Index[索引]
        Doc1[文档1]
        Doc2[文档2]
        DocN[文档N]
    end

    subgraph Shard[分片]
        PShard1[主分片1]
        PShard2[主分片2]
        RShard1[副本分片1]
        RShard2[副本分片2]
    end

    subgraph Storage[存储层]
        Lucene1[Lucene索引1]
        Lucene2[Lucene索引2]
    end

    Doc1 --> PShard1
    Doc2 --> PShard2
    PShard1 -->|复制| RShard1
    PShard2 -->|复制| RShard2
    PShard1 --> Lucene1
    PShard2 --> Lucene2
```

---

# 第三章：索引与管理

## 3.1 分片与副本机制

```mermaid
flowchart LR
    subgraph Node1[节点1]
        PS1[主分片 P0]
        RS2[副本分片 R1]
    end

    subgraph Node2[节点2]
        PS2[主分片 P1]
        RS1[副本分片 R0]
    end

    PS1 -->|数据同步| RS1
    PS2 -->|数据同步| RS2
```

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 主分片数 | 1 | 索引创建后不可更改 |
| 副本分片数 | 1 | 可动态调整 |
| 刷新间隔 | 1秒 | 文档可被搜索的延迟 |

## 3.2 映射类型

```bash
# 静态映射示例
$ curl -X PUT "http://localhost:9200/my_index" -H 'Content-Type: application/json' -d '
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "standard"
      },
      "price": {
        "type": "double"
      },
      "created_at": {
        "type": "date"
      },
      "tags": {
        "type": "keyword"
      }
    }
  }
}'
```

| 类型 | 说明 | 示例 |
|------|------|------|
| text | 全文搜索 | 文章内容 |
| keyword | 精确匹配 | 标签、ID |
| long/double | 数值 | 价格、数量 |
| date | 日期时间 | 创建时间 |
| boolean | 布尔值 | 是否启用 |
| nested | 嵌套对象 | 数组对象 |

## 3.3 分析器原理

```mermaid
flowchart TD
    Input["原始文本：The Quick Browns!"] --> CharFilter[字符过滤器 CharFilter]

    %% 字符过滤器子步骤
    CharFilter --> CF1["去除HTML标签"]
    CharFilter --> CF2["特殊符号过滤"]
    CharFilter --> CF3["预处理清洗"]
    
    CF1 & CF2 & CF3 --> AfterCharFilter["处理后：The Quick Browns"]

    %% 分词
    AfterCharFilter --> Tokenizer[分词器 Tokenizer]
    Tokenizer --> Tokens["分词结果：The、Quick、Browns"]

    %% 词过滤器
    Tokens --> TokenFilter[词过滤器 TokenFilter]
    TokenFilter --> TF1["小写转换"]
    TokenFilter --> TF2["停用词过滤"]
    TokenFilter --> TF3["词干提取"]

    TF1 & TF2 & TF3 --> FinalTokens["最终词项：the、quick、brown"]
    
    %% 建立索引
    FinalTokens --> InvertedIndex[构建倒排索引]
```

| 组件 | 作用 |
|------|------|
| Character Filter | 字符过滤（HTML标签、大小写） |
| Tokenizer | 分词（按空格、标点分割） |
| Token Filter | 词过滤（停用词、同义词、词干） |

---

# 第四章：查询详解

## 4.1 查询类型分类

```mermaid
flowchart TD
    Query[查询] --> TL[全文查询]
    Query --> TQ[词条查询]
    Query --> RQ[范围查询]
    Query --> BQ[布尔查询]
    Query --> NQ[嵌套查询]
    Query --> AQ[聚合查询]

    TL --> Match[match]
    TL --> MultiMatch[multi_match]
    TQ --> Term[term]
    TQ --> Terms[terms]
    BQ --> Bool[bool]
    BQ --> Boosting[boosting]
```

## 4.2 查询类型对比

| 类型 | 特点 | 使用场景 |
|------|------|----------|
| match | 全文搜索，会分析查询词 | 搜索文章内容 |
| term | 精确匹配，不分析词 | ID、状态、标签 |
| terms | 多值精确匹配 | 多标签查询 |
| range | 范围查询 | 价格区间、日期范围 |
| bool | 布尔组合 | 复杂条件组合 |

## 4.3 查询示例

```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "Elasticsearch教程" } }
      ],
      "should": [
        { "term": { "featured": true } }
      ],
      "must_not": [
        { "term": { "status": "deleted" } }
      ],
      "filter": [
        { "range": { "price": { "gte": 100, "lte": 500 } } }
      ]
    }
  }
}
```

---

# 第五章：聚合分析

## 5.1 聚合架构

```mermaid
flowchart LR
    subgraph Types[聚合类型]
        B[桶聚合]
        M[指标聚合]
        P[管道聚合]
    end

    B --> B1[terms桶]
    B --> B2[range桶]
    B --> B3[date_histogram桶]

    M --> M1[sum总和]
    M --> M2[avg平均值]
    M --> M3[cardinality基数]

    P --> P1[累计求和]
    P --> P2[移动平均]
```

## 5.2 聚合示例

```bash
$ curl -X GET "http://localhost:9200/sales/_search" -H 'Content-Type: application/json' -d '
{
  "size": 0,
  "aggs": {
    "by_region": {
      "terms": { "field": "region.keyword" },
      "aggs": {
        "total_amount": { "sum": { "field": "sales_amount" } },
        "avg_quantity": { "avg": { "field": "quantity_sold" } }
      }
    },
    "by_category": {
      "terms": { "field": "product_category.keyword" }
    }
  }
}'
```

## 5.3 多重聚合桶

```mermaid
flowchart TD
    Sales[销售数据] --> RegionAgg[按地区聚合]
    RegionAgg --> North[北方区]
    RegionAgg --> South[南方区]

    North --> N_Amount[总额: 15000]
    South --> S_Amount[总额: 20000]

    Sales --> CategoryAgg[按类别聚合]
    CategoryAgg --> Electronics[电子产品]
    CategoryAgg --> Clothes[服装]

    Electronics --> E_Quantity[销量: 1000]
    Clothes --> C_Quantity[销量: 500]
```

---

# 第六章：性能优化

## 6.1 性能问题场景

| 场景 | 问题原因 | 影响 |
|------|----------|------|
| 高写入吞吐量 | 写入速度超过处理能力 | 队列堆积、延迟增加 |
| 分片过多 | 管理开销增大 | 内存占用高 |
| 副本过多 | 写入复制成本 | 写入性能下降 |
| 深度分页 | 跳过大量数据 | 内存溢出、耗时剧增 |
| 复杂嵌套 | 解析和映射开销 | 查询性能下降 |
| 缓存未命中 | 查询参数频繁变化 | 每次全量计算 |

## 6.2 优化手段

| 优化项 | 建议 |
|--------|------|
| 副本数量 | 读多写少可增加副本，读性能线性提升 |
| 分片策略 | 单分片50GB左右，避免过多小分片 |
| 路由优化 | 使用routingKey减少搜索范围 |
| 字段类型 | 精确查询用keyword，避免text全文本 |
| 禁用动态映射 | 避免字段爆炸，控制存储 |
| 冷热分离 | 热数据用高性能节点，冷数据用大容量 |

## 6.3 缓存机制

```mermaid
flowchart TD
    Query[查询请求] --> Cache[查询缓存]
    Cache -->|命中| Return[直接返回]
    Cache -->|未命中| Shard[分片查询]
    Shard -->|计算| Return

    subgraph CacheTypes[缓存类型]
        QC[Query Cache<br/>查询结果缓存]
        FC[Filter Cache<br/>过滤器缓存]
        SC[Shard Query Cache<br/>分片级缓存]
    end
```

---

# 第七章：集群架构

## 7.1 集群特点

| 特点 | 说明 |
|------|------|
| 分布式存储 | 数据分散在多个节点 |
| 副本冗余 | 节点故障自动恢复 |
| 水平扩展 | 新节点自动均衡 |
| 故障转移 | Master选举自动进行 |

## 7.2 Master选举机制

```mermaid
flowchart TD
    Start[启动集群] --> Ping[节点互相Ping]
    Ping --> Elect[ZenDiscovery选举]
    Elect --> Minimum[至少N个节点参与]

    Minimum -->|只有1个| Single[单节点模式]
    Minimum -->|多个节点| Vote[投票]

    Vote -->|票数最多| NewMaster[成为Master]
    Vote -->|票数相同| Tie[重新投票]
    Tie --> Minimum

    NewMaster --> Monitor[监控节点状态]
    Monitor -->|节点故障| Replica[分片重新分配]
```

## 7.3 脑裂问题处理

| 参数 | 说明 |
|------|------|
| discovery.zen.minimum_master_nodes | 最小主节点数，防止脑裂 |
| 公式 | (N/2) + 1，N为合格节点数 |

---

# 第八章：底层原理

## 8.1 倒排索引原理

### 正排索引 vs 倒排索引

| 类型 | 结构 | 查询方式 |
|------|------|----------|
| 正排索引 | 文档 → 词列表 | 根据文档查词 |
| 倒排索引 | 词 → 文档列表 | 根据词查文档 |

### 倒排索引结构

```mermaid
flowchart LR
    subgraph Documents[文档集合]
        D1["文档1: Apple is fruit"]
        D2["文档2: Banana is fruit"]
        D3["文档3: Apple juice"]
    end

    subgraph InvertedIndex[倒排索引]
        Apple["Apple → [D1, D3], 位置[0], 位置[0]"]
        Banana["Banana → [D2], 位置[0]"]
        Fruit["Fruit → [D1, D2], 位置[2], 位置[2]"]
    end

    D1 -->|分词| Apple
    D2 -->|分词| Banana
    D3 -->|分词| Apple
    D1 -->|分词| Fruit
    D2 -->|分词| Fruit
```

### 查询流程

```mermaid
sequenceDiagram
    participant Q as Query["查询：Apple fruit"]
    participant A as Analyzer[分析器处理]
    participant I as Index[倒排索引]
    participant R as Result[最终结果]

    Q->>A: 提交查询语句
    A-->>I: 分词结果 apple、fruit
    I-->>I: 单词apple → D1、D3
    I-->>I: 单词fruit → D1、D2
    I-->>R: 取交集文档 D1
```

## 8.2 文档写入流程

```mermaid
flowchart TD
    Client[客户端] -->|写入请求| Coordinator[协调节点]
    Coordinator -->|路由计算| Primary[主分片]
    Primary -->|写入内存| Memory[Memory Buffer]
    Primary -->|异步| Replica[副本分片]
    Replica -->|确认| Primary
    Primary -->|ack| Coordinator
    Coordinator -->|ack| Client

    Memory -->|刷新| Refresh[Refresh Interval]
    Refresh -->|生成| Segment[Lucene Segment]
    Segment -->|可搜索| Searchable[可搜索文档]
```

## 8.3 文档更新/删除流程

```mermaid
flowchart TD
    %% 上层：分段存储结构（只读+可写）
    subgraph Layer1[Lucene Segment 分段存储]
        direction TB
        subgraph SegOld[旧 Segment 只读不可修改]
            DocV1[Apple v1 原始文档]
            Tombstone[Tombstone 删除标记]
        end
        subgraph SegNew[新 Segment 增量可写]
            DocV2[Apple v2 最新文档]
        end
    end

    %% 下层：删除&更新流程 + 查询流程 左右并排
    subgraph Layer2[删除更新流程 & 查询流程]
        direction TB
        subgraph UpdateDel[更新 / 删除流程]
            DelReq[删除/更新请求] --> Judge{文档所在段}
            Judge -->|在旧只读段| Mark[Tombstone 逻辑标记删除]
            Judge -->|直接写入新段| Write[新建版本写入新Segment]
        end

        subgraph QueryProcess[查询流程]
            Query[查询请求] --> Scan[全量扫描所有Segment]
            Scan --> Filter[过滤Tombstone标记文档]
            Filter --> MergeResult[合并新旧段有效文档]
        end
    end
```

---

# 第九章：高级特性

## 9.1 深度分页方案

### 问题说明

| 方案 | 原理 | 限制 |
|------|------|------|
| from + size | 指定偏移和数量 | 最大10000条 |
| search_after | 基于上一页最后一条排序值 | 需指定排序字段 |
| scroll | 创建查询上下文 | 资源开销大，需清理 |

### search_after示例

```json
// 首页查询
{
  "query": { "match": { "title": "keyword" } },
  "sort": [{"id": "asc"}],
  "size": 10
}

// 后续查询
{
  "query": { "match": { "title": "keyword" } },
  "sort": [{"id": "asc"}],
  "search_after": [123],
  "size": 10
}
```

## 9.2 联表查询方案

### join数据类型

```json
{
  "mappings": {
    "properties": {
      "join_field": {
        "type": "join",
        "relations": {
          "customer": "order"
        }
      }
    }
  }
}
```

```json
// 查询某个客户的所有订单
{
  "query": {
    "has_parent": {
      "parent_type": "customer",
      "query": {
        "term": { "customer_id": "customer123" }
      }
    }
  }
}
```

## 9.3 多索引查询

```json
// 跨索引查询
{
  "query": {
    "bool": {
      "should": [
        {
          "bool": {
            "must": [
              { "term": { "index1.field1": "value1" } }
            ]
          }
        },
        {
          "bool": {
            "must": [
              { "term": { "index2.field2": "value2" } }
            ]
          }
        }
      ]
    }
  }
}
```

---

# 第十章：实战问题

## 10.1 为什么Elasticsearch查询快

| 原因 | 说明 |
|------|------|
| 倒排索引 | 词到文档的直接映射 |
| 缓存机制 | Query Cache、Filter Cache |
| 分片并行 | 多节点并行计算 |
| 文本分析 | 预处理的倒排索引 |
| 分布式架构 | 横向扩展能力 |

## 10.2 一致性保证

| 级别 | 说明 | 实现方式 |
|------|------|----------|
| 写入一致 | 写入主分片+指定数量副本 | wait_for_active_shards |
| 读取一致 | 读取主分片或副本 | preference参数 |
| 乐观锁 | 版本号控制并发 | if_seq_no + if_primary_term |

## 10.3 面试高频问题

| 问题 | 关键点 |
|------|--------|
| 索引文档过程 | 分片路由 → 写入缓存 → 刷新 → 可搜索 |
| 搜索过程 | 查询协调节点 → 并行搜索分片 → 结果汇总 |
| 分片分配 | Master决策 → 副本复制 → 负载均衡 |
| 性能优化 | 副本数、分片策略、缓存利用、字段类型 |
| 集群高可用 | 副本机制、故障转移、脑裂防护 |

---

# 相关资料

- [Elasticsearch官方文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Elasticsearch: The Definitive Guide](https://www.elastic.co/guide/en/elasticsearch/guide/current/index.html)
- [10道不得不会的ElasticSearch面试题](https://cloud.tencent.com/developer/article/1964271)
