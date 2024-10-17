---
title: 搭建alertmanager告警服务
index_img: /images/prometheus_icon.jpeg
tags:
  - prometheus
  - 告警
categories:
  - prometheus
date: 2023-04-10 18:40:12
excerpt: 使用docker和自定义指标搭建promethus服务、alertmanager服务，试用邮件告警功能
sticky: 1
---

### 一、启动alert manager

1. 配置

``` bash
$ mkdir -p /Users/xuweiqiang/Documents/alertmanager/
$ mkdir -p /Users/xuweiqiang/Documents/alertmanager/template
$ touch /Users/xuweiqiang/Documents/alertmanager/config.yml
$ touch /Users/xuweiqiang/Documents/alertmanager/template/email.tmpl
$ cd /Users/xuweiqiang/Documents/alertmanager
```

``` bash
$ vim /Users/xuweiqiang/Documents/alertmanager/alertmanager.yml
$ touch /Users/xuweiqiang/Documents/alertmanager/template/email.tmpl
```

``` yml
# config.yml
global:
  resolve_timeout: 5m
  smtp_from: '435861851@qq.com' # 发件人
  smtp_smarthost: 'smtp.qq.com:587' # 邮箱服务器的 POP3/SMTP 主机配置 smtp.qq.com 端口为 465 或 587
  smtp_auth_username: '435861851@qq.com' # 用户名
  smtp_auth_password: '123' # 授权码 
  smtp_require_tls: true
  smtp_hello: 'qq.com'
templates:
  - '/etc/alertmanager/template/*.tmpl'
route:
  group_by: ['alertname'] # 告警分组
  group_wait: 5s # 在组内等待所配置的时间，如果同组内，5 秒内出现相同报警，在一个组内出现。
  group_interval: 5m # 如果组内内容不变化，合并为一条警报信息，5 分钟后发送。
  repeat_interval: 5m # 发送告警间隔时间 s/m/h，如果指定时间内没有修复，则重新发送告警
  receiver: 'email' # 优先使用 wechat 发送
  routes: #子路由，使用 email 发送
  - receiver: email
    match_re:
      serverity: email
receivers:
- name: 'email'
  email_configs:
  - to: '435861851@qq.com' # 如果想发送多个人就以 ',' 做分割
    send_resolved: true
    html: '{{ template "email.html" . }}'   #使用自定义的模板发送
```

``` html
{{ define "email.html" }}
{{ range $i, $alert :=.Alerts }}
========监控报警==========<br>
告警状态：{{   .Status }}<br>
告警级别：{{ $alert.Labels.severity }}<br>
告警类型：{{ $alert.Labels.alertname }}<br>
告警应用：{{ $alert.Annotations.summary }}<br>
告警主机：{{ $alert.Labels.instance }}<br>
告警详情：{{ $alert.Annotations.description }}<br>
触发阀值：{{ $alert.Annotations.value }}<br>
告警时间：{{ $alert.StartsAt.Format "2006-01-02 15:04:05" }}<br>
========end=============<br>
{{ end }}
{{ end }}
```

2. 启动alertmanager

``` bash
$ docker run -d \
    --network p_net \
    --network-alias alert \
    --name=alertmanager \
    -p 9093:9093 \
    -v /Users/xuweiqiang/Documents/alertmanager:/etc/alertmanager \
    prom/alertmanager:latest
```

### 二、启动prometheus

1. 配置

``` bash
$ touch /Users/xuweiqiang/Documents/alertmanager/prometheus.yml
$ mkdir -p /Users/xuweiqiang/Documents/alertmanager/rules
$ touch /Users/xuweiqiang/Documents/alertmanager/rules/one.yml
```

``` yml
# prometheus.yml
global:
  scrape_interval:     5s 
  evaluation_interval: 5s 

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alert:9093

scrape_configs:
  - job_name: "request_count"
    metrics_path: '/metrics'
    static_configs:
      - targets: ["docker.for.mac.host.internal:6969"]
      
rule_files:
  - "/etc/prometheus/rules/*.yml"
```

``` yml
# rules/one.yml
groups:
- name: hostStatsAlert
  rules:
  - alert: hostCpuUsageAlert
    expr: (1 - avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance))*100 > 85
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Instance {{ $labels.instance }} CPU usage high"
      description: "{{ $labels.instance }} CPU usage above 85% (current value: {{ $value }})"
  - alert: hostMemUsageAlert
    expr: (1 - (node_memory_MemAvailable_bytes{} / (node_memory_MemTotal_bytes{})))* 100 > 70
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Instance {{ $labels.instance }} MEM usage high"
      description: "{{ $labels.instance }} MEM usage above 70% (current value: {{ $value }})"
  - alert: request_counter
    expr: app_system_request > 3
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Instance {{ $labels.instance }} request count too much"
      description: "{{ $labels.instance }} request count above 3 (current value: {{ $value }})"
```

2. 启动prometheus

``` bash
$ docker run \
    --name alert_client \
    -d \
    -p 9090:9090 \
    --network p_net \
    --network-alias alert_client \
    -v /Users/xuweiqiang/Documents/alertmanager:/etc/prometheus/ \
    prom/prometheus \
    --config.file=/etc/prometheus/prometheus.yml
```

### 三、模拟告警指标

[golang实现简单的指标exporter](https://weiqiangxu.github.io/2023/04/10/prometheus/golang%E5%AE%9E%E7%8E%B0%E7%AE%80%E5%8D%95%E7%9A%84%E6%8C%87%E6%A0%87exporter/)


### 相关疑问

- 告警状态有哪些

```
Inactive：这里什么都没有发生。
Pending：已触发阈值，但未知足告警持续时间（即rule中的for字段）
Firing：已触发阈值且满足告警持续时间。警报发送到Notification Pipeline
        通过处理，目的是屡次判断失败才发告警，减小邮件
```

- prometheus告警机制如何降噪的

``` txt
# 简要描述：
Prometheus会根据rules中的规则，不断的评估是否需要发出告警信息,
如果满足规则中的条件，则会向alertmanagers中配置的地址发送告警
告警是通过alertmanager配置的地址post告警,比如targets: [node1:8090']
则会向node1:8090/api/v2/alerts发送告警信息

# 如何验证：
自己实现alertmanger程序，来接收Prometheus发送的告警，并将告警打印出来

# 告警间隔 
[prometheus.yml] > global.evaluation_interval = 15s (告警周期)
[rules.yml] > groups[].rules[].for = 1m (具体某一条告警规则的告警时长)

1m 15s就是prometheus推送告警信息的间隔

# 如何理解
1m 是prometheus拉取指标的间隔 (隔1m拉指标1次)
15s是对应的告警设置的持续时间（需要持续15s以上才会告警）
所以第一次pull到异常时候，到第二次再次pull到异常才满足了15s持续的条件
如果设置为0则立刻告警
```

- alertmanager处理告警信息有哪些重要机制

1. 路由: 不同的告警来源发给不同的收件人
2. 分组: 相同的告警类型合并为一封告警

- 什么情况下会有Firing状态值

```
Firing状态值通常在Prometheus规则中定义的触发条件成立时出现。
也就是说，当监控指标满足预设的规则条件时，Prometheus会发出告警
并将告警状态设置为Firing，以通知用户进行相应的处理。
常见的情况包括CPU使用率过高、内存使用率超标、网络延迟过高等问题。

这个状态值的意义在于，当你的机器一直处于cpu爆满或其他某一个状态值的时候
不会每隔一段时间发送告警，相当于降噪
```

- 告警路由是什么

``` yml
route:
  receiver: admin-receiver
  routes:
  - receiver: database-receiver
    match: 
      component: database    
  - receiver: memcache-receiver
    macth: 
      componnet: memcache
```

``` txt
以上的路由达到的效果是：

告警的标签匹配 component=database 的发送告警给 database-receiver
```

- 分组是什么

``` yml
route:
  receiver: admin-receiver
  group_by: ["instance"]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
```

``` txt
当alertmanager在一分钟内收到6封告警
其中3封邮件是instance=A
领完3封邮件是instance=B
并且group wait为1分钟以上
在group wait期间收到的这6封告警
会合并为2封告警信息
```

``` txt
对于告警

{alertname="NodeCPU",instance="peng01",...}

会创建分组

{instance="peng01"}

那么同一个组的告警，将会等待group_wait的时间，alertManager会把这一组告警一次性发给Receiver
假设group_interval为5分钟，意思是，同一个组的告警，在发送了告警之后，这个时间间隔内，不会再次发送告警
但是超过了这个时间（5min），有同一个组的告警到达，会在等待group_wait时间后立刻发送告警
```

- 主从多台alertmanager之下如何滤重告警

``` 
Gossip协议下的集群
```

### 参考资料

[csdn.net之Prometheus一条告警是怎么触发的](https://blog.csdn.net/ActionTech/article/details/82421894)
[cnblogs.com之Prometheus发送告警机制](https://www.cnblogs.com/zydev/p/16848444.html)
[zhuanlan.zhihu.com开箱即用的 Prometheus 告警规则集](https://zhuanlan.zhihu.com/p/371967435)
[cloud.tencent.com使用Docker部署alertmanager并配置prometheus告警](https://cloud.tencent.com/developer/article/2211153)
[pshizhsysu.gitbook.io告警的路由与分组](https://pshizhsysu.gitbook.io/prometheus/ff08-san-ff09-prometheus-gao-jing-chu-li/gao-jing-de-lu-you-yu-fen-zu)