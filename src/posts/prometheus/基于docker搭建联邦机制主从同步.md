---
title: 基于docker搭建联邦机制主从同步
index_img: /images/prometheus_icon.jpeg
tags:
  - prometheus
categories:
  - prometheus
date: 2023-04-08 06:40:12
sticky: 1
---

### 一、配置热重载

1. main.main函数启动时候更改 config.LoadFile(cfg.configFile 为 config.LoadConfigFromEtcd(cfg.configFile,
2. 在 <-hub (chan os.Signal) 监听的select之中添加 <-etcd.Listen() 监听，有配置更改时候调用 reladConfig 函数

### 二、federation

1. docker install两个prometheus
2. 本地mac启动一个exporter暴露系统指标
3. 指定一个prometheus采集指标
4. federation机制让另一个prometheus也采集到一样的指标

### 三、mac的本机器指标

``` bash
# https://prometheus.io/download/
# http://localhost:9100/metrics
$ ./node_exporter
```

### 四、主节点prometheus

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

### 五、从节点prometheus

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

### 相关疑问

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

### 参考资料

[https://prometheus.io/docs/prometheus/latest/federation/](https://prometheus.io/docs/prometheus/latest/federation/)
[快猫监控P高可用](http://flashcat.cloud/docs/content/flashcat-monitor/prometheus/ha/local-storage/)
[本地存储配置](https://blog.csdn.net/m0_60244783/article/details/127641195)
[https://www.ifsvc.cn/posts/156](https://www.ifsvc.cn/posts/156)