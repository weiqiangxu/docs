---
title: prometheus的资源占用分析
index_img: /images/prometheus_icon.jpeg
tags:
  - prometheus
  - api
  - 监控
  - 内存分析
categories:
  - prometheus
date: 2023-04-13 16:15:12
excerpt: 理解prometheus的内存消耗波动曲线、磁盘占用大小计算规则等
sticky: 1
---

### 一、消耗多少内存

#### 1. 怎么看当前实例消耗内存大小

[查看prometheus占用内存大小](https://weiqiangxu.github.io/2023/04/12/prometheus/%E6%9F%A5%E7%9C%8Bprometheus%E5%8D%A0%E7%94%A8%E5%86%85%E5%AD%98/)

#### 2. 内存消耗的来源是哪些

- 查询负载
- 指标数据（落盘机制）

#### 3. 影响内存消耗的配置有哪些

- `scrape_interval`和`evaluation_interval`：这两个参数分别控制着Prometheus的采集频率和计算频率，值越小，内存消耗越高

- `retention`：这个参数控制着数据的保留时间，值越大，内存消耗越高(查询范围大的时候)。
    默认保留数据15天也就是在磁盘超过15天的数据会被清理。
    --storage.tsdb.retention.time=15d

- `chunk_size`：这个参数控制着每个时间序列数据块的大小，值越大，内存消耗越高。
    --storage.tsdb.max-block-duration（MaxBlockDuration）TSDB 存储时每个块的最大时间范围。默认值为 2 小时
    --storage.tsdb.max-block-chunk-segment-size(MaxBlockChunkSegmentSize)默认值为32MB 
      控制每个块（block）中的chunk在持久化时是否分割成多个片段（segment），以及每个片段的大小

- `query.max-samples`：这个参数控制着每个查询返回的最大样本数，值越大，内存消耗越高。
     指定了查询语句返回的最大样本数。它是一个安全机制，用于避免由于查询错误或者滥用，导致过多的样本数被返回
     参数--query.max-samples默认值为5000w


#### 3. 怎样做可以降低内存消耗

- 落盘机制（缩小数据块加速落盘）
- 缩小指标数量
- 限制查询时间范围
- 减少标签数量

#### 4. 场景模拟

```
假设有1000个指标，每个指标有10个标签，每个标签有10种值类型，消耗的内存大小

Number of Time Series(时间序列数量):100,000
Average Labels Per Time Series(每个时间序列上平均的标签数):10
Number of Unique Label Pairs(一个时间序列的标签组合数量):100
Average Bytes per Label Pair(平均每个标签对所占用的字节数):20
Scrape Interval(拉取间隔):15s
Bytes per Sample(每个样本值所占用的字节数):4

理论上综合消耗内存：827MB
```

### 二、磁盘占用多少

#### 1. 影响磁盘损耗的因素有：

- 样本数据的数量
- 每个数据点的标签数量和标签值的长度
- 数据点的采样频率
- 存储时间范围

#### 2. 场景

``` txt
如果每5秒钟采集 2000个样本，每个样本在磁盘占用大约1~2字节，假设2字节
那么30天大概需要 0.96GB

2000 * (86400 / 5) * 30 / (1024*1024*1024) = 0.96GB
```

### 三、CPU消耗情况

#### 1. 怎么查看cpu消耗

``` bash
# metrics端点查看
$ curl http://localhost:9300/metrics

# 指标名称
process_cpu_seconds_total
```

``` bash
# top命令查看
$ ps -ef | grep prometheus

$ top -p ${pid}
```

#### 2. cpu消耗大小

``` txt
# 场景描述
prometheus启动时长7天左右，process_cpu_seconds_total大概是 1260.77s
平均每小时占用cpu 7.5秒
```

#### 3. 影响cpu消耗的因素

``` txt
作为一个开源的监控系统，Prometheus 的 CPU 消耗并不算特别大。
它的 CPU 消耗主要来源于收集数据、数据进行存储和分析以便后续的查询和报警
 Prometheus 使用了一些高效的算法和技术，它的 CPU 消耗并不会特别高
```

#### 4. 如何降低cpu消耗

- 降低抓取频率
- 缩小指标种类
- 优化内存分配
- 优化查询（如时间范围）

### 四、查询优化

#### 1. 查询带来的内存消耗多大

``` txt
# 范围查询1个月内一个指标的所有样本

假设指标每秒钟有1个样本，一个月大概有30 * 24 * 60 * 60 = 2,592,000个样本
假设该指标的值是64位双精度浮点数，则每个样本需要8个字节。
因此，查询一个月内的所有样本将需要大约20 MB的内存。

但真实的场景下，查询1个月的所有样本，不会把所有样本读取
会设置步长，并且设置标签可以筛选掉很多数据;
所以1个查询最多也就10MB不到，并发20个图表的情况下是200MB

查询消耗取决于TSDB查询性能
```

#### 2. 如何优化查询降低内存消耗

- 缩小时间范围
- 查询带着具体标签值查询
- 多个Prometheus实例分摊查询压力
- 全局配置超时global.query_timeout:30s
- 单个查询5min以内数据并配置10s超时 
  query_name{label=value}[5m:10s]

#### 3. 如何强制限制查询时间范围

``` txt
storage.retention.time
历史数据存储最大时长就等于了最大的查询的时长范围
```

### 相关疑问

- 理论上prometheus的内存和指标等计算规则是什么

- evaluation 和 scrape 是什么意思

``` txt
evaluation_interval被设置为1分钟。Prometheus会在每分钟计算一次告警规则和记录规则。
scrape_interval被设置为15秒，表示Prometheus每15秒向job_name为prometheus的job收集监控数据
```

- chunk_size是什么意思

``` txt 
一个概念，tsdb的数据块大小，以时间为单位的。
在prometheus的main.go之中有配置项（storate.tsdb为前缀的配置）
默认2小时；

1. 当查询Prometheus时，如果需要的数据超出了一个块的范围，那么Prometheus会将多个块合并成一个大块
然后在该大块上执行查询操作。chunk_size参数的值越小，需要合并的块的数量就越多，查询效率就越低；

2. 设置的块很大查询的时候如果需要合并数据块，又会因为合并的时间很久而降低了查询效率；
```

- storage.tsdb.max-block-duration的具体意义

``` txt
该参数确实可以影响Prometheus的落盘机制的时间，因为它决定了TSDB块文件的最大持续时间。
当块文件的持续时间达到该参数设置的值时，Prometheus会停止在该文件中写入新的数据，并创建一个新的块文件。
从而实现了落盘机制。默认情况下，该参数设置为2小时。
因此，可以通过调整该参数的值来控制Prometheus的落盘机制的时间
```

- 时间序列

``` txt
每个指标（Metric）都有一个名称（Name）和多个标签（Label）
指标将与时间戳形成一个样本（Sample），它包含指标值、时间戳和标签值。
这些样本被存储在称为时间序列（Time Series）的数据结构中。
时间序列将由指标名称和标签集合唯一确定
每一个时间序列由指标名称和一组标签共同标识
```

- prometheus理论上每个样本在磁盘之中占据多少内存

``` txt
prometheus的存储模型是基于TSDB，影响样本在磁盘占据内存大小的因素有：
压缩格式、标签数量、附加属性预测、抽样和分析等；

通常情况下，一个时间序列的每个样本占用的磁盘空间大约在1-2字节左右
```

- process_cpu_seconds_total指标

``` txt
process_cpu_seconds_total是Prometheus指标名称，表示当前进程（一个应用程序）的CPU使用时间总量。
它是一个累加器指标，可以用来监控进程的CPU利用率和运行时间。
该指标记录了进程启动以来的总CPU时间，单位为秒。
```

- 文件拷贝data目录时候网络选择问题

``` txt
待定...
```

### 相关资料

[官方计算prometheus理论上的内存消耗](https://www.robustperception.io/how-much-ram-does-prometheus-2-x-need-for-cardinality-and-ingestion/)
[Series在prometheus是什么概念](https://www.kancloud.cn/pshizhsysu/prometheus/1803792)
[yasongxu.gitbook高可用完问题-大内存问题以及容量规划](https://yasongxu.gitbook.io/container-monitor/yi-.-kai-yuan-fang-an/di-2-zhang-prometheus/prometheus-use)
[容器监控实践—Prometheus存储机制](http://www.xuyasong.com/?p=1601)
