---
title: prometheus
tags:
  - prometheus
  - linux
categories:
  - prometheus
---

### 一、本地启动Prometheus

``` bash
$ /Users/xuweiqiang/Documents/data
```

``` bash
$ ./prometheus --storage.tsdb.path=/Users/xuweiqiang/Documents/data \
--config.file=/Users/xuweiqiang/Documents/prometheus.yml \
--web.listen-address=:8989
```

``` yml
# 自定义标签
scrape_configs:
 - job_name: 'my_job'
   static_configs:
     - targets: ['my_target']
       labels:
         my_label: 'my_value'
```

> 动态地添加标签或从其他源配置目标，请考虑使用服务发现或Relabeling等更高级的配置选项


### 二、查看内存占用

1. top的RES

  "top的RES"可能指的是Linux操作系统中"top"命令中的"RES"列，表示进程使用的实际物理内存大小（以KB为单位）

2. top查看占用内存

``` bash
# 获取pid
$ ps -ef | grep prometheus
# 获取pid对应的内存大小
$ top -p ${pid}
```

``` txt
PID USER      PR  NI    VIRT    RES           
4590 root      20   0 1205660  83016
```

3. metrics端口查看

``` bash
# 指标获取
$ curl localhost:9090/metrics

# 查看 (与top的res一致) 单位kb
process_resident_memory_bytes/1024
```

### 三、golang-metric-exporter

``` go
package main

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var requestCounter = prometheus.NewCounter(prometheus.CounterOpts{
	Namespace:   "app",
	Subsystem:   "system",
	Name:        "request",
	Help:        "request counter",
	ConstLabels: map[string]string{},
})

func init() {
	prometheus.DefaultRegisterer.Unregister(collectors.NewGoCollector())
	prometheus.MustRegister(requestCounter)
}

// go语言实现 http服务端
// http://127.0.0.1:8989/hello
func main() {
	http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		requestCounter.Inc()
		_, _ = w.Write([]byte("hello world"))
	})
	http.Handle("/metrics", promhttp.Handler())
	err := http.ListenAndServe("127.0.0.1:6969", nil)
	if err != nil {
		panic(err)
	}
}

```

### 四、prometheus配置

1. 默认配置

```yaml
global:
  scrape_interval: 15s # 将采集间隔设置为每15秒。默认为1分钟一次
  evaluation_interval: 15s # 每15秒评估一次规则。默认为1分钟。
  # Scrape_timeout被设置为全局默认值(10秒)。

# 告警配置
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          # - alertmanager:9093

# 加载规则一次，并定期根据全局的“evaluation_interval”计算它们
rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

# 一个抓取配置，只包含一个要抓取的端点:这里是Prometheus本身
scrape_configs:
  # 作业名称作为标签' job=<job_name> '添加到从此配置中提取的任何时间序列中
  - job_name: "prometheus"

    # Metrics_path默认为“/metrics”
    # scheme defaults to 'http'.

    static_configs:
      - targets: ["localhost:9090"]
```

2. 配置分类

- 全局配置 global
- 告警配置 alerting
- 规则文件配置 rule_files
- 拉取配置 scrape_configs
- 远程读写配置 remote_read、remote_write

3. 源码配置结构

``` go 
// /prometheus/config/config.go
// Config is the top-level configuration for Prometheus's config files.
type Config struct {
	GlobalConfig   GlobalConfig    `yaml:"global"`
	AlertingConfig AlertingConfig  `yaml:"alerting,omitempty"`
  ...
}
```

### 五、prometheus的资源占用分析

##### 1.内存

1. 怎么看当前实例消耗内存大小

```bash
$ ps -ef | grep prometheus
```

2. 内存消耗的来源是哪些

- 查询负载
- 指标数据（落盘机制）

3. 影响内存消耗的配置有哪些

  - `scrape_interval`和`evaluation_interval`：这两个参数分别控制着Prometheus的采集频率和计算频率，值越小，内存消耗越高

  - `retention`：这个参数控制着数据的保留时间，值越大，内存消耗越高(查询范围大的时候)。
    默认保留数据15天也就是在磁盘超过15天的数据会被清理。
    --storage.tsdb.retention.time=15d

  - `chunk_size`：这个参数控制着每个时间序列数据块的大小，值越大，内存消耗越高。storage.tsdb.max-block-duration（MaxBlockDuration）TSDB 存储时每个块的最大时间范围。默认值为 2 小时. storage.tsdb.max-block-chunk-segment-size(MaxBlockChunkSegmentSize)默认值为32MB.控制每个块（block）中的chunk在持久化时是否分割成多个片段（segment），以及每个片段的大小

  - `query.max-samples`：这个参数控制着每个查询返回的最大样本数，值越大，内存消耗越高。指定了查询语句返回的最大样本数。它是一个安全机制，用于避免由于查询错误或者滥用，导致过多的样本数被返回.参数query.max-samples默认值为5000w.


3. 怎样做可以降低内存消耗

- 落盘机制（缩小数据块加速落盘）
- 缩小指标数量
- 限制查询时间范围
- 减少标签数量

4. 场景模拟

  假设有1000个指标，每个指标有10个标签，每个标签有10种值类型，消耗的内存大小
  Number of Time Series(时间序列数量):100,000
  Average Labels Per Time Series(每个时间序列上平均的标签数):10
  Number of Unique Label Pairs(一个时间序列的标签组合数量):100
  Average Bytes per Label Pair(平均每个标签对所占用的字节数):20
  Scrape Interval(拉取间隔):15s
  Bytes per Sample(每个样本值所占用的字节数):4
  理论上综合消耗内存：827MB

##### 2.磁盘

1. 影响磁盘损耗的因素有：

- 样本数据的数量
- 每个数据点的标签数量和标签值的长度
- 数据点的采样频率
- 存储时间范围

2. 场景

  如果每5秒钟采集`2000`个样本，每个样本在磁盘占用大约1~2字节，假设2字节.那么30天大概需要 0.96GB. `2000*(86400/5)*30/(1024*1024*1024)`=`0.96GB`

##### 3.CPU

1. 怎么查看cpu消耗

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

2. cpu消耗大小

  prometheus启动时长7天左右，process_cpu_seconds_total大概是 1260.77s. 平均每小时占用cpu 7.5秒

3. 影响cpu消耗的因素

  作为一个开源的监控系统，Prometheus 的 CPU 消耗并不算特别大。它的 CPU 消耗主要来源于收集数据、数据进行存储和分析以便后续的查询和报警Prometheus 使用了一些高效的算法和技术，它的 CPU 消耗并不会特别高

4. 如何降低cpu消耗

- 降低抓取频率
- 缩小指标种类
- 优化内存分配
- 优化查询（如时间范围）

##### 4.Query

1. 查询带来的内存消耗多大

  假设范围查询1个月内一个指标的所有样本，假设指标每秒钟有1个样本，一个月大概有30 * 24 * 60 * 60 = 2,592,000个样本。假设该指标的值是64位双精度浮点数，则每个样本需要8个字节。因此，查询一个月内的所有样本将需要大约20 MB的内存。
  但真实的场景下，查询1个月的所有样本，不会把所有样本读取，会设置步长，并且设置标签可以筛选掉很多数据，所以1个查询最多也就10MB不到，并发20个图表的情况下是200MB.查询消耗取决于TSDB查询性能。

2. 如何优化查询降低内存消耗

- 缩小时间范围
- 查询带着具体标签值查询
- 多个Prometheus实例分摊查询压力
- 全局配置超时global.query_timeout:30s
- 单个查询5min以内数据并配置10s超时 query_name{label=value}[5m:10s]

3. 如何强制限制查询时间范围

  storage.retention.time历史数据存储最大时长就等于了最大的查询的时长范围


### 六、snapshot备份数据

##### 1.主库搭建

1. 创建配置文件

``` bash
$ touch /Users/xuweiqiang/Desktop/master.yml
$ mkdir /Users/xuweiqiang/Desktop/tmp
```

2. 文件配置内容

``` yml
# remote write
global:
  scrape_interval: 1s
  evaluation_interval: 1s
remote_write:
  - url: "http://slave:9090/api/v1/write"
scrape_configs:
  - job_name: "request_count"
    metrics_path: '/metrics'
    static_configs:
      - targets: ["docker.for.mac.host.internal:6969"]
```

3. 启动数据采集节点

``` bash
$ docker run \
    --name master \
    -d \
    -p 8989:9090 \
    --network p_net \
    --network-alias master \
    -v /Users/xuweiqiang/Desktop/tmp:/tmp \
    -v /Users/xuweiqiang/Desktop/master.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus \
    --storage.tsdb.path=/tmp \
    --web.enable-admin-api \
    --config.file=/etc/prometheus/prometheus.yml
```

##### 2.将主库的历史数据同步过来

``` bash
# master
$ curl -XPOST 127.0.0.1:9090/api/v1/admin/tsdb/snapshot
```

``` json
{"status":"success","data":{"name":"20230418T015823Z-29b962a698b24a01"}}
```

##### 3.从库搭建

1. 创建写主机配置

``` bash
$ touch /Users/xuweiqiang/Desktop/slave.yml
```

2. 写主机配置内容

``` yml
# write config
global:
  scrape_interval: 1s
  evaluation_interval: 1s
```

3. 启动写主机

``` bash
# 注意:storage.tsdb.path执行快照数据
# 也就是执行 /api/v1/admin/tsdb/snapshot 后返回的data里面的name表示文件夹名称 
# 原来的prometheus的实例指向的 storage.tsdb.path/data.name
$ docker run \
    --name slave \
    -d \
    -p 7979:9090 \
    --network p_net \
    --network-alias slave \
    -v /Users/xuweiqiang/Desktop/tmp:/tmp \
    -v /Users/xuweiqiang/Desktop/slave.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus \
    --storage.tsdb.path=/tmp/snapshots/20230418T015823Z-29b962a698b24a01 \
    --web.enable-remote-write-receiver \
    --config.file=/etc/prometheus/prometheus.yml
```

##### 4.如何保证主库数据完整

  主库执行snapshot之前，更改master.prometheus.yml的配置，remote write到slave，此刻开始所有push不过去的数据会被加入队列重试，当slave使用备份快照启动成功后，这些数据会被写入，从而保证不丢失。
  > 2小时内（取决于落盘时间）


##### 5.remote write数据完整性

  > 发送失败会不断重试,而不是直接跳过发送失败的数据,如果发送失败超过2个小时,WAL日志会被压缩,没有发送的数据会丢失.

  ``` go
  // /prometheus/storage
  package remote

  // AppendMetadata 发送数据到远程存储,批量发送, 但并未进行并行化处理。
  func (t *QueueManager) AppendMetadata(ctx context.Context, metadata []scrape.MetricMetadata)

  // 具体发送动作
  // /Users/xuweiqiang/Documents/code/prometheus/storage/remote/queue_manager.go
  type WriteClient interface {
      Store(context.Context, []byte) error
  }

  // sendWriteRequestWithBackoff 发送失败动作
  // MinBackoff: model.Duration(30 * time.Millisecond) MaxBackoff: model.Duration(5 * time.Second)
  // 发送失败以后sleep 30 * time.Millisecond然后再次重试，每次重试间隔不断double，直至最大5s，
  // 如果一直失败，不是会跳过而是直接不再发送 func (t *QueueManager) Stop()
  // 使用远程写入会增加 Prometheus 的内存占用。大多数用户报告内存使用量增加了约 25%，但该数字取决于数据的形状
  // 除非远程端点保持关闭超过 2 小时，否则将重试失败而不会丢失数据。2小时后，WAL会被压缩，没有发送的数据会丢失
  func sendWriteReqWithBackoff(ctx context.Context, cfg config.QueueConfig, l log.Logger, att func(int) error, onRetry func()) error
  ```

### 七、TSDB

	时间序列数据库（Time - Series Database）专门用于存储和管理时间序列数据的数据库。时间序列数据是按时间顺序排列的一系列数据点，通常由一个或多个指标（metric）在不同时间点的值组成。


### 八、Prometheus远程写集群

##### 1.从库搭建

1. 创建写主机配置

``` bash
$ touch /Users/prometheus/slave.yml
```

2. 写主机配置内容

``` yml
# write config
global:
  scrape_interval: 15s
  evaluation_interval: 15s
```

3. 启动写主机

``` bash
$ docker run \
    --name slave \
    -d \
    -p 7979:9090 \
    --network p_net \
    --network-alias slave \
    -v /Users/prometheus/write.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus \
    --web.enable-remote-write-receiver \
    --config.file=/etc/prometheus/prometheus.yml 
```


##### 2.主库搭建

1. 创建配置文件

``` bash
$ touch /Users/prometheus/master.yml
```

2. 文件配置内容

``` yml
# remote write
global:
  scrape_interval: 15s
  evaluation_interval: 15s
remote_write:
  - url: "http://slave:9090/api/v1/write"
scrape_configs:
  - job_name: "request_count"
    metrics_path: '/metrics'
    static_configs:
      - targets: ["docker.for.mac.host.internal:6969"] # 宿主机IP ifconfig获取 en0 的IP
```

3. 启动数据采集节点

``` bash
$ docker run \
    --name master \
    -d \
    -p 8989:9090 \
    --network p_net \
    --network-alias master \
    -v /Users/prometheus/master.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus
```



### 九、联邦机制

##### 1.配置热重载

1. main.main函数启动时候更改 config.LoadFile(cfg.configFile 为 config.LoadConfigFromEtcd(cfg.configFile,
2. 在 <-hub (chan os.Signal) 监听的select之中添加 <-etcd.Listen() 监听，有配置更改时候调用 reladConfig 函数

##### 2.federation

1. docker install两个prometheus
2. 本地mac启动一个exporter暴露系统指标
3. 指定一个prometheus采集指标
4. federation机制让另一个prometheus也采集到一样的指标

##### 3.mac的本机器指标

``` bash
# https://prometheus.io/download/
# http://localhost:9100/metrics
$ ./node_exporter
```

##### 4.主节点prometheus

``` bash
$ docker network create p_net

$ docker run \
    --name master \
    -d \
    -p 9090:9090 \
    --network p_net \
    --network-alias master \
    -v /Users/master.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus \
    --query.lookback-delta=15d \
    --config.file=/etc/prometheus/prometheus.yml

$ ./prometheus --query.lookback-delta=15d \
--config.file=/prometheus/config.yml
```

``` yml
# master.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
scrape_configs:
  - job_name: "request_count"
    metrics_path: '/metrics'
    static_configs:
      - targets: ["docker.for.mac.host.internal:6969"]
```

##### 5.从节点prometheus

``` bash
$ docker run \
    --name slave \
    -d \
    -p 8989:9090 \
    --network p_net \
    --network-alias slave \
    -v /home/prometheus.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus
```

``` yml
# slave.yml
global:
  scrape_interval: 15s 
  evaluation_interval: 15s 

scrape_configs:
  - job_name: 'federate'
    scrape_timeout: 15s # timeout limit small than scrape_interval
    body_size_limit: 0 # no limit size
    scrape_interval: 15s
    honor_labels: true # 保留原有metrics的标签
    metrics_path: '/federate'
    params:
      'match[]':
        - '{__name__=~".+"}'
    static_configs:
      - targets:
        - 'master:9090'
```


### Q&A

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


- WAL落盘机制

> 是每隔2小时落盘1次还是不断地将超过2小时的数据落盘，如果是每隔2小时一次那开始和结束时间怎么计算

``` txt
Prometheus 默认情况下是每个块的时间范围为 2 个小时。
当一个块完成时，它将被写入磁盘。
块的开始时间和结束时间是按照 Prometheus 的时间轴进行计算的。
例如，如果当前时间是 9:00 AM，那么 Prometheus 将从 7:00 AM 到 9:00 AM 计算该块的开始和结束时间。
因此，Prometheus会每隔2小时落盘，并且块的开始和结束时间是基于当前时间计算的
```
- remote write 丢数据

> remote write如果发送数据时候目标机器挂了，后面目标机器服务又起来了，会丢失多少数据

``` txt 
prometheus间隔2h落盘在1h55min时候，打了快照，并且在2h1min之后服务才起来，那么是不是意味着这5min的数据丢失了
```


- 如何解决docker exec容器报错su: must be suid to work properly

``` bash
$ docker exec -ti --user root 容器id /bin/sh
```

- 在容器中如何访问宿主机服务

``` txt
ifconfig docker0 网卡IP
daemon.json 中定义的虚拟网桥来与宿主机进行通讯
域名 docker.for.mac.host.internal
```

- 如何配置pfederate拉取所有指标

``` yml
# slave
global:
  scrape_interval: 15s 
  evaluation_interval: 15s 

scrape_configs:
  - job_name: 'federate'
    scrape_interval: 15s
    honor_labels: true # 保留原有metrics的标签
    metrics_path: '/federate'
    params:
      'match[]':
        - '{__name__=~".+"}'
    static_configs:
      - targets:
        - 'master:9090'
    # Endpoint的标签
    relabel_configs:
     - target_label: 'instance'
       replacement: 'docker.for.mac.host.internal:6969'
```

- 健康检查接口

[http://localhost:8989/-/healthy](http://localhost:8989/-/healthy)

- 基于ETCD选主3台prometheus实现高可用

1. 主节点配置 scrape_configs 直接从exporter_node拉取数据
2. 从节点配置 scrape_configs 从主节点通过 federate机制同步数据
3. 每台prometheus守护进程中有一个定时器从 etcd 获取主节点的IP，通过/-/health判定主节点的存活状态
4. 如果主节点挂了，选主，将新的主IP同步至etcd，并且更改各个节点的 prometheus配置
5. 如果主节点挂了，发送告警
6. 主节点拉取数据，从节点继续从主节点同步数据

- 基于ETCD的集群选主设计方案设计

1. master节点直接从http接口拉取数据
2. node节点从master/federate端口拉取数据
3. master节点存活信息存储在etcd(etcd有一个TTL key)，master节点每隔30s发送一次心跳，重新设置TTL key否则任务master节点已经挂了
4. master节点挂了以后，剩下的节点竞选 - master节点出来以后，更新master节点的配置和更新node节点的配置，主要是实现主从

- 如何进入容器内部执行命令

``` bash
$ docker exec -it --user root ${容器id} /bin/sh
```

### 相关文档

- [官方计算prometheus理论上的内存消耗](https://www.robustperception.io/how-much-ram-does-prometheus-2-x-need-for-cardinality-and-ingestion/)
- [Series在prometheus是什么概念](https://www.kancloud.cn/pshizhsysu/prometheus/1803792)
- [yasongxu.gitbook高可用完问题-大内存问题以及容量规划](https://yasongxu.gitbook.io/container-monitor/yi-.-kai-yuan-fang-an/di-2-zhang-prometheus/prometheus-use)
- [容器监控实践—Prometheus存储机制](http://www.xuyasong.com/?p=1601)
- [prometheus.io/docs 官网配置解析](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [cnblogs.com Prometheus之配置详解](https://www.cnblogs.com/wangguishe/p/15598120.html)
- [yunlzheng.gitbook.io/prometheus-book/远程存储](https://yunlzheng.gitbook.io/prometheus-book/part-ii-prometheus-jin-jie/readmd/prometheus-remote-storage)
- [yunlzheng.gitbook.io/prometheus-book/高可用方案选型](https://yunlzheng.gitbook.io/prometheus-book/part-ii-prometheus-jin-jie/readmd/prometheus-and-high-availability)
- [robustperception.io/snapshot](https://www.robustperception.io/taking-snapshots-of-prometheus-data/)
- [prometheus.io/远程写入调整](https://prometheus.io/docs/practices/remote_write/#remote-write-tuning)
- [prometheus.io/如何使用快照进行数据备份](https://prometheus.io/docs/prometheus/latest/querying/api/#snapshot)
- [github.com/prometheus的TSDB数据库用法](https://github.com/prometheus/prometheus/blob/main/tsdb/docs/usage.md)
- [github.com/prometheus关于时序数据库的文档](https://github.com/prometheus/prometheus/tree/main/tsdb/docs/format)
- [Prometheus TSDB (Part 1): The Head Block](https://blog.csdn.net/chenhuiqqq/article/details/119521435)
- [Prometheus远程存储](https://yunlzheng.gitbook.io/prometheus-book/part-ii-prometheus-jin-jie/readmd/prometheus-remote-storage)
- [Prometheus高可用](https://yunlzheng.gitbook.io/prometheus-book/part-ii-prometheus-jin-jie/readmd/prometheus-and-high-availability)
- [https://prometheus.io/docs/prometheus/latest/federation/](https://prometheus.io/docs/prometheus/latest/federation/)
- [快猫监控P高可用](http://flashcat.cloud/docs/content/flashcat-monitor/prometheus/ha/local-storage/)
- [本地存储配置](https://blog.csdn.net/m0_60244783/article/details/127641195)
- [https://www.ifsvc.cn/posts/156](https://www.ifsvc.cn/posts/156)