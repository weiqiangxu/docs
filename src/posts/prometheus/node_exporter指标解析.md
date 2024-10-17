---
title: node_exporter指标解析
index_img: /images/prometheus_icon.jpeg
tags:
  - prometheus
  - api
  - 监控
categories:
  - prometheus
date: 2023-04-10 06:40:12
excerpt: 使用docker搭建prometheus和node exporter，解释本机cpu、内存等指标查看方式，以及如何通过http api接口查看监控数据
sticky: 1
---

### 一、本机运行node-exporter

1. 启动node exporter

``` bash
# 常驻进程启动
$ nohup ./node_exporter > ./node_exporter.log 2>&1 &
# 查看采集到的指标
$ curl 127.0.0.1:9100/metrics
```

2. 配置prometheus采集node exporter指标

``` yml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          # - alertmanager:9093

scrape_configs:
  - job_name: "prometheus"
    metrics_path: "/metrics"
    static_configs:
      - targets: ["localhost:9090"]
  - job_name: "node_exporter"
    metrics_path: "/metrics"
    static_configs:
      - targets: ["localhost:9100"]
```

3. 本地启动prometheus

``` bash
$ nohup ./prometheus --config.file=prometheus.yml --web.enable-lifecycle > run.log 2>&1 &
$ kill -HUP pid
$ curl -X POST http://127.0.0.1/-/reload
```

### 二、docker运行node-exporter

``` bash
# docker内启动一个node-exporter
docker run -d \
  --name node_exporter \
  --network p_net \
  --network-alias node_exporter \
  -p 9100:9100 \
  quay.io/prometheus/node-exporter
```

### 三、node-exporter指标解析

1. cpu指标查看

``` bash
# node exporter 指标解释
# 要对节点进行 CPU 监控，需要用到 node_cpu_seconds_total 这个监控指标

node_cpu_seconds_total{cpu="0",mode="idle"} 13172.76 
node_cpu_seconds_total{cpu="0",mode="iowait"} 0.25
node_cpu_seconds_total{cpu="0",mode="irq"} 0
node_cpu_seconds_total{cpu="0",mode="nice"} 0.01
node_cpu_seconds_total{cpu="0",mode="softirq"} 87.99
node_cpu_seconds_total{cpu="0",mode="steal"} 0
node_cpu_seconds_total{cpu="0",mode="system"} 309.38
node_cpu_seconds_total{cpu="0",mode="user"} 79.93

# cpu idle cpu空闲
# iowait 属于idle的子类 - 1种等待 IO 造成的 idle状态
# irq就是Interrupt ReQuest 中断请求 - 硬件接口设备会透过IRQ对CPU送出中断请求讯号请求处理硬件需求
# nice 优先级用户态 CPU 时间
# softirq 软中断的 CPU 时间
# steal 当系统运行在虚拟机中的时候，被其他虚拟机占用的 CPU 时间
# guest 通过虚拟化运行其他操作系统的时间，也就是运行虚拟机的 CPU 时间
# guest_nice 低优先级运行虚拟机的时间

CPU 使用率是 CPU 除空闲（idle）状态之外的其他所有 CPU 状态的时间总和除以总的 CPU 时间

# 每分钟空闲cpu总数
increase(node_cpu_seconds_total{mode="idle"}[1m])
# 每分钟cpu总数
sum(increase(node_cpu_seconds_total[1m])) by (instance)

# 每分钟空闲cpu占比
(1 - sum(rate(node_cpu_seconds_total{mode="idle"}[1m])) by (instance) / sum(rate(node_cpu_seconds_total[1m])) by (instance) ) * 100
```

2. 内存监控

``` bash
available 是从应用程序的角度看到的可用内存
available = free + buffer + cache

# node_memory_* 相关指标
node_memory_Buffers_bytes + node_memory_Cached_bytes + node_memory_MemFree_bytes

# 可用内存的使用率，和总的内存相除
(1- (node_memory_Buffers_bytes + node_memory_Cached_bytes + node_memory_MemFree_bytes) / node_memory_MemTotal_bytes) * 100

# 查看节点总内存
node_memory_MemTotal_bytes{instance="node2"}/1024/1024/1024

# linux查看内存使用使用率 free -m
其中的free列的值和 node_memory_MemFree_bytes/1024/1024 一致
其中的total列的值和 node_memory_MemTotal_bytes/1024/1024 一致

              total        used        free      shared  buff/cache   available
Mem:           1999         153        1063           8         782        1679
Swap:          1023           0        1023
```

3. 磁盘空间监控

``` bash
node_filesystem_* 相关的指标

# 磁盘空间使用率
# fstype 标签过滤关心的磁盘信息，比如 ext4 或者 xfs 格式的磁盘
(1 - node_filesystem_avail_bytes{fstype=~"ext4|xfs"} / node_filesystem_size_bytes{fstype=~"ext4|xfs"}) * 100
```

4. 磁盘的读写监控

``` bash
# 读 IO 使用 node_disk_reads_completed
# 写 IO 使用 node_disk_writes_completed_total

# 磁盘读IO
sum by (instance) (rate(node_disk_reads_completed_total[5m]))

# 磁盘写IO
sum by (instance) (rate(node_disk_writes_completed_total[5m]))

# 读写IO
rate(node_disk_reads_completed_total[5m]) + rate(node_disk_writes_completed_total[5m])
```

5. 网络IO

``` bash
# 上行带宽需要用到的指标是 node_network_receive_bytes
# 计算上行带宽用
sum by(instance) (irate(node_network_receive_bytes_total{device!~"bond.*?|lo"}[5m]))

# 下行带宽 node_network_transmit_bytes
sum by(instance) (irate(node_network_transmit_bytes{device!~"bond.*?|lo"}[5m]))
```

### 四、docker启动prometheus采集指标

1. prometheus配置

``` yml
# prometheus.yml 监控容器
global:
  scrape_interval: 15s
  evaluation_interval: 15s
scrape_configs:
  - job_name: "node_exporter"
    metrics_path: "/metrics"
    static_configs:
      - targets: ["node_exporter:9100"]
```

2. 启动

``` bash
# 启动prometheus
$ docker run \
    --name node_exporter_prometheus \
    -d \
    -p 9090:9090 \
    --network p_net \
    --network-alias master \
    -v /Users/xuweiqiang/Desktop/prometheus.yml:/etc/prometheus/prometheus.yml \
    prom/prometheus \
    --config.file=/etc/prometheus/prometheus.yml
```

### 五、golang调用接口查询各个指标

``` go
package bingo_monitor

import (
	"context"
	"errors"
	"fmt"
	"github.com/prometheus/client_golang/api"
	v1 "github.com/prometheus/client_golang/api/prometheus/v1"
	"github.com/prometheus/common/model"
	"time"
)

const PrometheusServer = "http://127.0.0.1:9090"
const RangeQueryPath = "api/v1/query_range"

type QueryRangeType string

const (
	// FreeMemory 获取剩余内存大小 单位: MB
	FreeMemory QueryRangeType = "node_memory_MemFree_bytes/(1024*1024)"

	// TotalMemory 获取总内存大小 单位 MB
	TotalMemory QueryRangeType = "node_memory_MemTotal_bytes/(1024*1024)"

	// MemoryUsageRate 可用内存剩余（百分比）
	MemoryUsageRate QueryRangeType = "(1- (node_memory_Buffers_bytes + node_memory_Cached_bytes + node_memory_MemFree_bytes) / node_memory_MemTotal_bytes) * 100"

	// FileSystemUsageRate 磁盘空间使用率(百分比) df -h 验证正确
	FileSystemUsageRate QueryRangeType = "(1 - node_filesystem_avail_bytes{fstype=~\"ext4|xfs\"} / node_filesystem_size_bytes{fstype=~\"ext4|xfs\"}) * 100"

	// CPUUsageRate cpu消耗占用
	CPUUsageRate QueryRangeType = "(1 - sum(rate(node_cpu_seconds_total{mode=\"idle\"}[1m])) by (instance) / sum(rate(node_cpu_seconds_total[1m])) by (instance) ) * 100"

	// DiskRate 磁盘读写IO
	DiskRate QueryRangeType = "rate(node_disk_reads_completed_total[5m]) + rate(node_disk_writes_completed_total[5m])"

	// DownloadNetwork 下行带宽
	DownloadNetwork QueryRangeType = "sum by(instance) (irate(node_network_transmit_bytes_total{device!~\"bond.*?|lo\"}[5m]))"

	// UPNetwork 上行带宽
	UPNetwork QueryRangeType = "sum by(instance) (irate(node_network_receive_bytes_total{device!~\"bond.*?|lo\"}[5m]))"
)

// ObtainChangesInIdleMemory 获取空闲内存变化
func ObtainChangesInIdleMemory(queryType QueryRangeType, start time.Time, end time.Time, step time.Duration) ([]model.SamplePair, error) {
	client, err := api.NewClient(api.Config{
		Address: PrometheusServer,
	})
	if err != nil {
		return nil, err
	}
	v1api := v1.NewAPI(client)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	r := v1.Range{
		Start: start,
		End:   end,
		Step:  step,
	}
	result, warnings, err := v1api.QueryRange(ctx, string(queryType), r, v1.WithTimeout(5*time.Second))
	if err != nil {
		return nil, err
	}
	if len(warnings) > 0 {
		return nil, fmt.Errorf("warning:%v", warnings)
	}
	if result.Type() != model.ValMatrix {
		return nil, errors.New("query result is not ValMatrix")
	}
	z := result.(model.Matrix)
	var metricsDataList []model.SamplePair
	for _, v := range z {
		metricsDataList = append(metricsDataList, v.Values...)
	}
	return metricsDataList, nil
}
```

### 相关疑问

- 剩余内存转换为MB单位

``` bash
# node_memory_free_bytes 空闲内存多少MB
node_memory_free_bytes/(1024*1024) 
```

- 如何通过http接口查看监控数据

``` bash
$ curl 'http://localhost:9090/api/v1/query?query=node_memory_free_bytes/(1024*1024)'

# 返回结果
{
    "status":"success",
    "data":{
        "resultType":"vector",
        "result":[
            {
                "metric":{
                    "instance":"docker.for.mac.host.internal:9100",
                    "job":"node_exporter"
                },
                "value":[
                    1680861573.392, #时间戳
                    "108.4375" #剩余108MB
                ]
            }
        ]
    }
}
```

- 如何通过http接口区间数据查询

``` bash
# 查询区间数据 start和end分别表示开始和结束的unix_timestamp、step表示间隔多少秒1条数据 
# 1680862582表示2023-04-07 18:16:22 ； 1680862782表示2023-04-07 18:19:42
# curl 'http://localhost:9090/api/v1/query_range?query=&start=&end=&step='
$ curl 'http://localhost:9090/api/v1/query_range?query=node_memory_free_bytes/(1024*1024)&start=1680862582&end=1680862782&step=15'

#返回结果 每一个时刻的空闲内存
{
    "status":"success",
    "data":{
        "resultType":"matrix",
        "result":[
            {
                "metric":{
                    "instance":"docker.for.mac.host.internal:9100",
                    "job":"node_exporter"
                },
                "values":[
                    [
                        1680862582, #2023-04-07 18:16:22
                        "62.59375"
                    ],
                    [
                        1680862597, #2023-04-07 18:16:37 间隔15s
                        "39.875"
                    ],
                    [
                        1680862612, #2023-04-07 18:16:52 间隔15s
                        "54.75"
                    ],...
                ]
            }
        ]
    }
}
```

### 参考资料

[Linux性能之CPU使用率](http://www.west999.com/info/html/caozuoxitong/Linux/20200408/4668695.html)
[Prometheus Node Exporter 常用监控指标](https://blog.csdn.net/qq_34556414/article/details/126003112)
[在 HTTP API 中使用 PromQL](https://prometheus.fuckcloudnative.io/di-san-zhang-prometheus/di-4-jie-cha-xun/api)
[容器监控实践—node-exporter](https://www.jianshu.com/p/e3c9fc929d8a/)
[Linux 查看磁盘空间](https://www.runoob.com/w3cnote/linux-view-disk-space.html)