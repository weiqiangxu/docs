# elastic

### 一、基本使用

##### 1.docker启动Elastic

```bash
$ docker run -d --name elasticsearch \
    -p 9200:9200 \
    -p 9300:9300 \
    -e "discovery.type=single-node" \
    -e ES_JAVA_OPTS="-Xms64m -Xmx128m" \
    docker.elastic.co/elasticsearch/elasticsearch:7.17.3
```

- [http://127.0.0.1:9200](http://127.0.0.1:9200)


##### 2.基本概念

- 索引（Index）文档的集合比如产品信息创建一个索引\用户信息创建另一个索引
- 文档（Document）数据存储的基本单位JSON格式表示的数据结构
- 类型（Type）用于在索引中对文档进行分类但现在一般一个索引只存放一种类型的文档

```bash
# 创建索引
$ curl -X PUT "http://localhost:9200/products"

# 查看索引列表
$ http://localhost:9200/_cat/indices?format=json

# 插入文档
$ curl -X POST "http://localhost:9200/products/_doc" \
    -H 'Content-Type: application/json' \
    -d '{"name": "iPhone 14", "price": 7999, "description": "mobile phone"}'

# 查询文档
$ curl -X GET "http://localhost:9200/products/_search?size=1000"

$ curl -X GET "http://localhost:9200/products/_search" \
    -H 'Content-Type: application/json' \
    -d '{"query": {"range": {"price": {"gt": 7000}}}}'

# 更新文档
$ curl -X POST "http://localhost:9200/products/_update/文档_id" \
    -H 'Content-Type: application/json' \
    -d '{"doc": {"price": 6999}}'

# 删除文档
$ curl -X DELETE "http://localhost:9200/products/_doc/文档_id"

# 删除整个products索引
$ curl -X DELETE "http://localhost:9200/products"
```

3. 多重聚合桶

```bash
# sales 的索引 { 
#     region地区:xxx,
#     product_category产品类别:xxx,
#     sales_amount销售额:xxx,
#     quantity_sold销售数量:xxx
# }

$ curl -X GET "http://localhost:9200/sales/_search" -H 'Content-Type: application/json' -d '
{
  "size": 0,
  "aggs": {
    "region_aggregation": {
      "terms": {
        "field": "region.keyword"
      },
      "aggs": {
        "total_sales_amount": {
          "sum": {
            "field": "sales_amount"
          }
        }
      }
    },
    "category_aggregation": {
      "terms": {
        "field": "product_category.keyword"
      },
      "aggs": {
        "total_quantity_sold": {
          "sum": {
            "field": "quantity_sold"
          }
        }
      }
    }
  }
}'
```

```json
{
  "took": 3,
  "timed_out": false,
  "hits": {
    "total": {
      "value": 100,
      "relation": "eq"
    },
    "hits": []
  },
  "aggregations": {
    "region_aggregation": {
      "buckets": [
        {
          "key": "North",
          "doc_count": 30,
          "total_sales_amount": {
            "value": 15000.0
          }
        },
        {
          "key": "South",
          "doc_count": 40,
          "total_sales_amount": {
            "value": 20000.0
          }
        }
      ]
    },
    "category_aggregation": {
      "buckets": [
        {
          "key": "Electronics",
          "doc_count": 50,
          "total_quantity_sold": {
            "value": 1000.0
          }
        },
        {
          "key": "Clothes",
          "doc_count": 30,
          "total_quantity_sold": {
            "value": 500.0
          }
        }
      ]
    }
  }
}
```

##### 3.Elastic术语

- 数据分片（Sharding）将索引数据划分为多个独立的部分，每个部分称为一个分片。每个分片本质上是一个独立的Lucene索引
- 副本Replica ES还支持为每个分片创建副本
- 数据结构 以JSON文档的形式存储,简单、扁平的数据结构通常比复杂的嵌套数据结构在存储和查询时更高效
- 索引策略
- 分析器（Analyzer）词法分析、小写转换、停用词去除、构建倒排索引
- 倒排索引
- 自定义分析器通过组合字符过滤器（Character Filter）、分词器（Tokenizer）和词过滤器（Token Filter）来实现
- 索引生命周期管理（ILM）策略
- 映射（Mapping）类似于数据库中的表结构定义，它用于定义索引（Index）中的文档（Document）结构,数据类型定义,如文本（Text）、关键字（Keyword）、长整型（Long）、日期（Date）、布尔（Boolean）等。默认启用动态映射,所以向索引中插入新的文档时，如果文档中的字段在索引的映射中不存在，ES 会自动根据插入文档的字段类型来推断并创建相应的映射。静态映射是在创建索引之前或者索引没有数据时，手动预先定义好索引的映射。

```bash
curl -X PUT "http://localhost:9200/my_index" -H 'Content - Type: application/json' -d '
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text"
      },
      "price": {
        "type": "double"
      }
    }
  }
}'
```
 

##### 4.Elasticsearch的默认索引设置是什么

- 分片数量: 一个索引会被分配 1 个主分片（Primary Shard）.
- 副本数量：默认副本数量为 1,副本分片（Replica Shard）是主分片的拷贝.
- 映射（Mapping）
- 默认的刷新间隔（Refresh Interval）是1秒
- lasticsearch 使用 Lucene 的默认存储格式存储索引数据

##### 5.Elasticsearch为什么快

- 倒排索引（Inverted Index）
- 缓存机制如查询缓存（Query Cache）\过滤器缓存（Filter Cache）
- 分布式架构和分片（Sharding）并行处理. ES 是分布式系统，数据可以被分片存储在多个节点上。当执行查询时，查询请求可以同时发送到多个节点上的分片，这些分片可以并行地处理查询请求，然后将结果汇总返回。
- 高效的文本分析和检索算法: 高效的分析器（Analyzer）和检索算法,索引阶段会对文本进行处理，如词法分析、去除停用词、词干提取等操作，将文本转换为适合索引和查询的形式。

##### 6.Elasticsearch 支持的查询类型

- 词条查询（Term Query）不会对词条进行分析，适用于关键字段（如 ID、产品编号等）的精确匹配。
- 全文查询（Full - Text Query）包括match查询，它会对查询词进行分析，然后查找包含这些分析后的词条的文档。
- 范围查询（Range Query）
- 嵌套查询（Nested Query）
- 布尔查询（Boolean Query）处理嵌套对象（文档中包含的对象数组）的查询
- 聚合查询（Aggregation Query）


### 7.到底什么是倒排索引（Inverted Index）

正向索引会记录文档 1 对应的单词是 “apple” 和 “banana”，文档 2 对应的单词是 “banana” 和 “cherry”。
倒排索引会记录 “apple” 出现在文档 1 中，“banana” 出现在文档 1 和文档 2 中，“cherry” 出现在文档 2 中。

词汇表（Vocabulary）索引基础部分它包含了索引中所有出现过的单词（或词条）
倒排列表（Postings List）记录了包含该单词的文档编号以及该单词在文档中的位置等信息


### 8.ES深度分页

常用的分页方式如 from + size 在深度分页时会暴露出性能问题。`GET /index/_search?from=10000&size=10`随着 from 值增大，Elasticsearch 需要跳过大量数据再获取目标数据，耗时会指数级增长，消耗大量内存与 CPU 资源。

- search_after：它基于上一页最后一个文档的排序值来获取下一页数据。

```json
// 后续查询使用search_after
{
    "query": {
        "match": {
            "title": "keyword"
        }
    },
    "sort": [
        {"id": "asc"}
    ],
    "search_after": [123], // 123是上页最后一个文档的id值
    "size": 10
}
```
- scroll：开启一个滚动查询后，Elasticsearch 会生成一个上下文，在一段时间内保留这个查询的相关资源，让你持续拉取数据，不过它的资源开销较大，用完应及时清理。

```json
// 开启滚动查询
{
    "query": {
        "match": {
            "content": "特定文本"
        }
    },
    "size": 100,
    "scroll": "1m" // 滚动上下文保留1分钟
}
```

### 9.ES的唯一标识

在 Elasticsearch 中，文档的唯一标识是 _id 字段。
自动生成：当向索引插入文档，且未明确指定 _id 时，Elasticsearch 会自动为该文档分配一个唯一的、Base64 编码的 UUID ，长度为 20 个字符，确保集群范围内每份文档都能被精准区分。
```bash
POST /my_index/_doc/
{
    "title": "Sample Document"
}
```
手动指定：用户可自行设定 _id ，这在业务场景里很实用，方便关联外部系统数据、记忆重要文档。

```bash
# 手动指定_id的方式
POST /my_index/_doc/1
{
    "title": "Custom ID Document"
}
```

### 10.ES常见的出现性能问题的场景

- 高写入吞吐量。 ES 在写入数据时，需要进行一系列操作，包括数据的解析、索引创建、分片分配等。当写入速度过快，这些操作可能无法及时完成，导致写入队列堆积，进而影响性能。
- 索引设置不合理。索引的分片（shard）数量和副本（replica）数量设置不当。如果分片数量过多，会增加集群的管理开销。副本数量过多同样会带来性能问题。
- 数据模型复杂。存在多层嵌套的 JSON 数据结构时，ES 在写入过程中需要进行复杂的解析和映射操作。
- 复杂查询语句。使用了大量的嵌套查询、聚合操作和过滤条件。
- 数据量过大的查询。当查询的数据量过大时，比如，在一个存储了多年历史数据的 ES 集群中，需要查询过去五年所有用户的行为记录。
- 缓存未命中。果频繁执行的查询不能有效地利用缓存，每次查询都需要重新执行底层的数据检索和计算操作，查询的参数经常变化，或者数据更新频繁导致缓存失效。

### 11.ES的优化手段


### 12.ES多个索引联表查


- 使用bool查询进行跨索引联合查询。找到同时满足index1和index2的两个数据

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "bool": {
            "must": [
              {
                "term": {
                  "index1.field1": "value1"
                }
              }
            ]
          }
        },
        {
          "bool": {
            "must": [
              {
                "term": {
                  "index2.field2": "value2"
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

- 使用join数据类型实现关联查询（类似联表）

> 原理：join数据类型用于在一个索引内创建父子关系。例如有一个customers索引和一个orders索引，orders索引中的订单数据与customers索引中的客户数据相关联。


```json
# 关系是customer（父）和order（子）
{
  "mappings": {
    "properties": {
      "customer_order_join": {
        "type": "join",
        "relations": {
          "customer": "order"
        }
      },
      "order_amount": {
        "type": "float"
      }
    }
  }
}

# 查询某个客户的所有订单
{
  "query": {
    "has_parent": {
      "parent_type": "customer",
      "query": {
        "term": {
          "customers.customer_id": "customer123"
        }
      }
    }
  }
}
```


### 13.elasticsearch的集群模式有什么特点

- 通过副本（replica）机制实现数据冗余. 每个主分片（primary shard）可以有一个或多个副本分片。
- 集群具有自动检测节点故障的能力.一个节点失效时，集群会自动将该节点上的主分片重新分配到其他健康节点上的副本分片。
- 水平扩展方便。新的节点加入集群，Elasticsearch 就会自动对数据进行重新平衡。会自动将部分分片迁移到新节点上，使得数据分布更加均匀.
- Elasticsearch 集群的分片（shard）机制灵活。如果预估数据量会快速增长，可以设置较多的分片.
- 数据分布式存储。数据被分散存储在各个节点的分片上。
- 分布式计算优势。对于聚合（aggregation）和复杂查询等操作,可以利用多个节点的计算资源进行分布式计算。每个节点负责处理一部分数据的计算，最后将所有节点的计算结果汇总.

### 14.elasticsearch 是如何实现 master 选举的

-  Zen Discovery 机制

    节点之间通过发送和接收 ping 消息来互相通信，以检查彼此的状态。节点的优先级设置,具有较高优先级的节点在选举中有更大的优势。
    节点都维护着一个集群状态版本号。较新版本集群状态的节点会更有优势。


### 15.描述一下Elasticsearch索引文档的过程

### 16.详细描述一下 Elasticsearch 搜索的过程

### 17.部署和使用Elastic的时候有哪些事项需要注意并且这些会带来什么影响


### 18.Elasticsearch 对于大数据量（上亿量级）的聚合如何实现

- Elasticsearch 的数据是分布在多个分片上的。在进行聚合操作时，每个分片会独立地计算本地部分数据的聚合结果。
- 合理的字段类型选择。预聚合。例如，在一个日志索引中，如果经常需要统计每小时的日志数量，那么在写入日志数据时，可以每小时对日志数量进行一次简单的预聚合.
- 查询缓存
- 分片缓存

7. Elasticsearch 中的节点（比如共 20 个），其中的 10 个选了一个 master，另外 10 个选了另一个 master，怎么办
8. 客户端在和集群连接时，如何选择特定的节点执行请求的
9. 详细描述一下 Elasticsearch 更新和删除文档的过程

11. 在并发情况下，Elasticsearch 如果保证读写一致
12. 介绍一下你们的个性化搜索方案
13. Elasticsearch的调优手段(设计\写入查询)


### 二、底层原理理解

倒排索引...

#### 三、高可用方案

1. 多节点 多分片 [集群模式](https://blog.csdn.net/qq_41167306/article/details/122967059)

2. 官方推荐的使用docker-compose搭建Elastic集群[bitnami/elasticsearch](https://registry.hub.docker.com/r/bitnami/elasticsearch)

- [10道不得不会的ElasticSearch面试题](https://cloud.tencent.com/developer/article/1964271)