# elastic

### 一、基本使用

1. elasticsearch 的集群架构、索引数据大小、分片有多少
2. elasticsearch 的倒排索引是什么
3. elasticsearch 是如何实现 master 选举的
4. 描述一下 Elasticsearch 索引文档的过程
5. 详细描述一下 Elasticsearch 搜索的过程
6. 部署时 Linux 的设置有哪些优化方法
7. Elasticsearch 中的节点（比如共 20 个），其中的 10 个选了一个 master，另外 10 个选了另一个 master，怎么办
8. 客户端在和集群连接时，如何选择特定的节点执行请求的
9. 详细描述一下 Elasticsearch 更新和删除文档的过程
10. Elasticsearch 对于大数据量（上亿量级）的聚合如何实现
11. 在并发情况下，Elasticsearch 如果保证读写一致
12. 介绍一下你们的个性化搜索方案
13. Elasticsearch的调优手段(设计\写入查询)

### 二、底层原理理解

倒排索引...

#### 三、高可用方案

1. 多节点 多分片 [集群模式](https://blog.csdn.net/qq_41167306/article/details/122967059)

2. 官方推荐的使用docker-compose搭建Elastic集群[bitnami/elasticsearch](https://registry.hub.docker.com/r/bitnami/elasticsearch)

- [10道不得不会的ElasticSearch面试题](https://cloud.tencent.com/developer/article/1964271)