---
title: 本地启动prometheus服务
tags:
  - prometheus
categories:
  - prometheus
---

### 本地存储

``` bash
$ /Users/xuweiqiang/Documents/data
```

``` bash
$ ./prometheus --storage.tsdb.path=/Users/xuweiqiang/Documents/data \
--config.file=/Users/xuweiqiang/Documents/prometheus.yml \
--web.listen-address=:8989
```

### 自定义标签

``` yml
scrape_configs:
 - job_name: 'my_job'
   static_configs:
     - targets: ['my_target']
       labels:
         my_label: 'my_value'
```

> 动态地添加标签或从其他源配置目标，请考虑使用服务发现或Relabeling等更高级的配置选项

