---
title: loki采集日志
tags:
  - loki
categories:
  - docker
---

> 使用docker compose搭建loki和promtail服务，支持自定义采集目标，并且通过 loki http API查看日志数据

### 一、使用compose搭建loki服务

1. 创建文件夹

``` bash
$ mkdir loki-compose
$ cd loki-compose
$ mkdir data && mkdir log && mkdir config
$ cd config && touch local-config.yaml && touch promtail-config.yaml
$ touch docker-compose.yml
```

2. 容器内配置文件

``` bash
$ vim config/local-config.yaml
```

``` yml
# local-config.yaml
# 是否开启认证
auth_enabled: false
# HTTP和gRPC服务监听地址
server:
  http_listen_port: 3100
  grpc_listen_port: 9095
# 配置日志索引和存储
schema_config:
  configs:
    - from: 2018-04-15
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

# 配置日志存储后端
storage_config:
  boltdb:
    directory: /data/loki/index
  filesystem:
    directory: /data/loki/chunks

# 配置日志收集
ingester:
  wal:
    enabled: true
    dir: "/tmp/wal"
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
      heartbeat_timeout: 1m
    final_sleep: 0s
  chunk_idle_period: 5m
  chunk_retain_period: 30s
```

``` bash
$ vim config/promtail-config.yaml
```

``` yml
# promtail config yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki-svc:3100/loki/api/v1/push

scrape_configs:
- job_name: log
  static_configs:
  - targets:
      - localhost
    labels:
      job: audit
      __path__: /log/*log
```

2. 启动文件 docker-compose.yml

``` bash
$ vim docker-compose.yml
```

``` yml
# docker-compose.yml
version: '3.7'
networks:
  loki-net:
    driver: bridge
services:
  loki:
    networks:
      loki-net:
        aliases:
         - loki-svc
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./config:/etc/loki
      - ./data:/data/loki

  promtail:
    networks:
      loki-net:
        aliases:
         - promtail-svc
    image: grafana/promtail:latest
    privileged: true
    volumes:
      - ./config:/config
      - ./log:/log
    command: -config.file=/config/promtail-config.yaml
```

``` bash
# 目录结构
$ tree .
.
├── config
│   ├── local-config.yaml
│   └── promtail-config.yaml
├── data
├── docker-compose.yml
└── log
```


### 二、启动服务

``` bash
$ cd loki-compose && docker-compose up -d
```

``` bash
# 制造测试数据
$ cd loki-compose && touch log/audit.log
$ echo '{"name":"jack"}' | sudo tee -a log/audit.log
```


### 三、服务访问

``` bash
$ curl http://localhost:3100/loki/api/v1/series
{
  "status": "success",
  "data": [
    {
      "job": "audit",
      "filename": "/log/audit.log"
    },
    {
      "filename": "/var/log/dpkg.log",
      "job": "varlogs"
    }
  ]
}
```
``` bash
$ curl http://localhost:3100/loki/api/v1/query_range?query={job="audit"}|json

{
  "status": "success",
  "data": {
    "resultType": "streams",
    "result": [
      {
        "stream": {
          "filename": "/log/audit.log",
          "job": "audit",
          "name": "jack"
        },
        "values": [
          [
            "1686537086403538378",
            "{\"name\":\"jack\"}"
          ]
        ]
      }
...
```

### 相关资料

- [https://hub.docker.com/r/grafana/loki](https://hub.docker.com/r/grafana/loki)
- [https://grafana.com/docs/loki/latest/clients/promtail/installation/](https://grafana.com/docs/loki/latest/clients/promtail/installation/)