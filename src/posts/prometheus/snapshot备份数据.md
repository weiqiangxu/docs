---
title: snapshot备份数据
index_img: /images/prometheus_icon.jpeg
tags:
  - prometheus
categories:
  - prometheus
date: 2023-04-18 06:40:12
sticky: 1
---

### 一、主库搭建

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

### 二、将主库的历史数据同步过来

``` bash
# master
$ curl -XPOST 127.0.0.1:9090/api/v1/admin/tsdb/snapshot
```

``` json
{"status":"success","data":{"name":"20230418T015823Z-29b962a698b24a01"}}
```

### 三、从库搭建

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

### 四、如何保证主库数据完整

主库执行snapshot之前，更改master.prometheus.yml的配置，remote write到slave，此刻开始所有push不过去的数据会被加入队列重试，当slave使用备份快照启动成功后，这些数据会被写入，从而保证不丢失。

> 2小时内（取决于落盘时间）


### 五、remote write数据完整性

``` go
// /prometheus/storage
package remote

func NewWriteStorage(logger log.Logger, reg prometheus.Registerer, dir string, flushDeadline time.Duration, sm ReadyScrapeManager) *WriteStorage

// 阻塞，直到元数据被发送到远程写入端点或hardShutdownContext过期。
mw.writer.AppendMetadata(mw.hardShutdownCtx, metadata)

// AppendMetadata sends metadata to the remote storage. Metadata is sent in batches, but is not parallelized.
// 逐个发送
func (t *QueueManager) AppendMetadata(ctx context.Context, metadata []scrape.MetricMetadata)

// 具体发送动作
// /Users/xuweiqiang/Documents/code/prometheus/storage/remote/queue_manager.go
type WriteClient interface {
    Store(context.Context, []byte) error
}

// 发送失败动作
func sendWriteRequestWithBackoff(ctx context.Context, cfg config.QueueConfig, l log.Logger, attempt func(int) error, onRetry func()) error

MinBackoff: model.Duration(30 * time.Millisecond)
MaxBackoff: model.Duration(5 * time.Second)

// 发送失败以后sleep 30 * time.Millisecond然后再次重试，每次重试间隔不断double，直至最大5s，
// 如果一直失败，不是会跳过而是直接不再发送
func (t *QueueManager) Stop()

// 使用远程写入会增加 Prometheus 的内存占用。大多数用户报告内存使用量增加了约 25%，但该数字取决于数据的形状
// 除非远程端点保持关闭超过 2 小时，否则将重试失败而不会丢失数据。2小时后，WAL会被压缩，没有发送的数据会丢失
```

### 相关疑问

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

### 参考资料

[yunlzheng.gitbook.io/prometheus-book/远程存储](https://yunlzheng.gitbook.io/prometheus-book/part-ii-prometheus-jin-jie/readmd/prometheus-remote-storage)
[yunlzheng.gitbook.io/prometheus-book/高可用方案选型](https://yunlzheng.gitbook.io/prometheus-book/part-ii-prometheus-jin-jie/readmd/prometheus-and-high-availability)
[robustperception.io/snapshot](https://www.robustperception.io/taking-snapshots-of-prometheus-data/)
[prometheus.io/远程写入调整](https://prometheus.io/docs/practices/remote_write/#remote-write-tuning)
[prometheus.io/如何使用快照进行数据备份](https://prometheus.io/docs/prometheus/latest/querying/api/#snapshot)