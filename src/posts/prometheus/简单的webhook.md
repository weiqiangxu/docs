---
title: 简单的webhook
index_img: /images/prometheus_icon.jpeg
tags:
  - prometheus
  - 告警
  - alertmanager
categories:
  - prometheus
date: 2023-04-10 18:40:12
excerpt: 编写简单的webhook程序验证alertmanager告警服务
sticky: 1
---

### 一、webhook

``` go
package main

import (
	"encoding/json"
	"github.com/prometheus/alertmanager/template"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/hook", ServeHTTP)
	_ = http.ListenAndServe(":7979", nil)
}

func ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var alerts template.Data
	err := json.NewDecoder(r.Body).Decode(&alerts)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	alertsBytes, err := json.Marshal(alerts)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	log.Println(string(alertsBytes))
	w.WriteHeader(http.StatusNoContent)
}
```

### 二、alertmanager配置

``` bash
$ touch /Users/xuweiqiang/Desktop/alert.yml
```

``` yml
global:
  resolve_timeout: 5s
route:
  group_by: ['alertname'] # 告警分组
  group_wait: 2s
  group_interval: 2s
  repeat_interval: 2s
  receiver: 'my_webhook'
receivers:
- name: 'my_webhook'
  webhook_configs:
  - url: 'http://docker.for.mac.host.internal:7979/hook'
```

### 三、启动alertmanager

``` bash
$ docker run -d \
    --name=hook_alert \
    -p 9095:9095 \
    -v /Users/xuweiqiang/Desktop/alert.yml:/etc/alertmanager/config.yml \
    prom/alertmanager:latest \
    --web.listen-address=":9095" \
    --config.file=/etc/alertmanager/config.yml \
    --log.level=debug
```

### 四、发送告警

``` bash
alerts1='[
  {
    "labels": {
       "alertname": "DiskRunningFull",
       "instance": "node one"
     },
     "annotations": {
        "info": "disk full",
        "summary": "please check disk"
      }
  }
]'

curl -XPOST -d"$alerts1" http://localhost:9095/api/v1/alerts
```

### 参考资料

[官方手册alerting/configuration/#webhook_config](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)
[官方推荐webhook实现](https://prometheus.io/docs/operating/integrations/#alertmanager-webhook-receiver)