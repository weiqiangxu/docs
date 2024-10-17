---
title: 基于远程写同步数据prometheus集群
index_img: /images/prometheus_icon.jpeg
tags:
  - prometheus
categories:
  - prometheus
date: 2023-04-08 06:40:12
sticky: 1
---

### 一、从库搭建

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


### 二、主库搭建

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

### 参考资料

[远程存储](https://yunlzheng.gitbook.io/prometheus-book/part-ii-prometheus-jin-jie/readmd/prometheus-remote-storage)

[高可用方案选型](https://yunlzheng.gitbook.io/prometheus-book/part-ii-prometheus-jin-jie/readmd/prometheus-and-high-availability)