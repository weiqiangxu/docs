---
title: alertmanager的历史告警
index_img: /images/prometheus_icon.jpeg
banner_img: /images/bg/5.jpg
tags:
  - alertmanager
  - 告警
  - 高可用
categories:
  - prometheus
date: 2022-07-28 10:13:01
sticky: 1
---


### 一、历史告警存档方案 

[官方webhook集成的方法](https://prometheus.io/docs/operating/integrations/#alertmanager-webhook-receiver)

1. alertsnitch + MySQL
2. alertmanager-webhook-logger

### 二、Alertmanager的本地存储

``` bash
# 本地存储格式和查看方式
alertmanager没有本地存储（持久化通过webhook适配）
```

### 三、服务搭建

#### a.启动prometheus

1. prometheus配置

``` bash
$ mkdir -p /Users/xuweiqiang/Desktop/alert
$ mkdir -p /Users/xuweiqiang/Desktop/alert/rules
$ touch /Users/xuweiqiang/Desktop/alert/prometheus.yml
$ touch /Users/xuweiqiang/Desktop/alert/rules/one.yml
```

``` yml
# prometheus.yml
global:
  scrape_interval:     5s 
  evaluation_interval: 5s 

# Alertmanager configuration
alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alert:9093

scrape_configs:
  - job_name: "request_count"
    metrics_path: '/metrics'
    static_configs:
      - targets: ["docker.for.mac.host.internal:6969"] # 宿主机IP ifconfig获取 en0 的IP
# Load rules once and periodically evaluate them according to the global 'evaluation_interval'.
rule_files:
  - "/etc/prometheus/rules/*.yml"
```

``` yml
# one.yml
groups:
- name: hostStatsAlert
  rules:
  - alert: request_counter
    expr: app_system_request > 3
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Instance {{ $labels.instance }} request count too much"
      description: "{{ $labels.instance }} request count above 3 (current value: {{ $value }})"
```

2. 启动
``` bash
$ docker run \
    --name alert_client \
    -d \
    -p 9090:9090 \
    --network p_net \
    --network-alias alert_client \
    -v /Users/xuweiqiang/Desktop/alert:/etc/prometheus/ \
    prom/prometheus \
    --config.file=/etc/prometheus/prometheus.yml
```

4. 模拟一个指标就是在本机启动一个request_counter指标

[golang实现简单的指标exporter](https://weiqiangxu.github.io/2023/04/10/prometheus/golang%E5%AE%9E%E7%8E%B0%E7%AE%80%E5%8D%95%E7%9A%84%E6%8C%87%E6%A0%87exporter/)

#### b.启动alertmanager

1. 创建配置

``` bash
$ mkdir -p /Users/xuweiqiang/Desktop/manager
$ mkdir -p /Users/xuweiqiang/Desktop/manager/data
$ mkdir -p /Users/xuweiqiang/Desktop/manager/template
$ touch /Users/xuweiqiang/Desktop/manager/alertmanager.yml
$ touch /Users/xuweiqiang/Desktop/manager/template/email.tmpl
```

``` yml
# alertmanager.yml
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
- name: 'web.hook'
  # webhook URL
  webhook_configs:
  - url: 'http://127.0.0.1:7979/webhook'
```

``` html
<!-- email.tmpl -->
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

2. 启动

``` bash
$ docker run -d \
    --network p_net \
    --network-alias alert \
    --name=alertmanager \
    -p 9093:9093 \
    -v /Users/xuweiqiang/Desktop/manager:/etc/alertmanager \
    prom/alertmanager:latest \
    --config.file=/etc/alertmanager/alertmanager.yml
```

### 四、alertmanager提供的http api

[alertmanager 的http api接口](https://pshizhsysu.gitbook.io/prometheus/ff08-san-ff09-prometheus-gao-jing-chu-li/kuo-zhan-yue-du/alertmanagerde-api)
[alertmanager 的http api接口描述文档](https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml)
[http://localhost:9093/api/v2/alerts](http://localhost:9093/api/v2/alerts)

``` json
# alerts获取告警信息返回内容
# 源代码地址 /code/alertmanager/api/v1/api.go
# 依赖的api对象仅仅存储内存之中重启就丢失了这些告警信息了

[
    {
        "annotations":{
            "description":"localhost:6969 request count above 3 (current value: 9)",
            "summary":"Instance localhost:6969 request count too much"
        },
        "endsAt":"2023-04-13T03:12:23.643Z",
        "fingerprint":"33beb4a34b645d5c",
        "receivers":[
            {
                "name":"email"
            }
        ],
        "startsAt":"2023-04-13T03:08:23.643Z",
        "status":{
            "inhibitedBy":[

            ],
            "silencedBy":[

            ],
            "state":"active"
        },
        "updatedAt":"2023-04-13T03:08:26.484Z",
        "generatorURL":"http://xxx.tab=1",
        "labels":{
            "alertname":"request_counter",
            "instance":"docker.for.mac.host.internal:6969",
            "job":"request_count",
            "severity":"critical"
        }
    }
]
```

``` yml
receivers:
# webhook配置
- name: 'web.hook'
  # webhook URL
  webhook_configs:
  - url: 'http://127.0.0.1:9111/alertmanager/hook'
```

### 五、prometheus 的 http api

[官方手册 querying/api](https://prometheus.io/docs/prometheus/latest/querying/api/)

```
GET /api/v1/query
POST /api/v1/query
GET /api/v1/query_range
POST /api/v1/query_range
```


### 参考资料

[Alertmanager告警全方位讲解](https://blog.csdn.net/agonie201218/article/details/126243110)
[基于Alertmanager设计告警降噪系统-转转](https://zhuanlan.zhihu.com/p/598739724)
[webhook-receiver.go](https://pshizhsysu.gitbook.io/prometheus/ff08-san-ff09-prometheus-gao-jing-chu-li/kuo-zhan-yue-du/shi-jian-ff1a-alertmanager#fu-lu)
[官方webhook reveiver集成写法](https://prometheus.io/docs/operating/integrations/#alertmanager-webhook-receiver)
[查看webhook标准写法](https://github.com/tomtom-international/alertmanager-webhook-logger)
[Alertsnitch: saves alerts to a MySQL database](https://gitlab.com/yakshaving.art/alertsnitch)
[rate 和 irate 函数解析](https://pshizhsysu.gitbook.io/prometheus/prometheus/promql/nei-zhi-han-shu/rate)
