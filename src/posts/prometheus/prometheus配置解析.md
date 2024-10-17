---
title: prometheus配置解析
index_img: /images/prometheus_icon.jpeg
tags:
  - prometheus
categories:
  - prometheus
date: 2023-04-08 06:40:12
sticky: 1
---

### 一、默认配置

```
global:
  scrape_interval: 15s # 将刮擦间隔设置为每15秒。默认为1分钟一次
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

### 二、配置分类

-- 全局配置 global
-- 告警配置 alerting
-- 规则文件配置 rule_files
-- 拉取配置 scrape_configs
-- 远程读写配置 remote_read、remote_write

### 三、源码配置结构

``` go 
// /prometheus/config/config.go
// Config is the top-level configuration for Prometheus's config files.
type Config struct {
	GlobalConfig   GlobalConfig    `yaml:"global"`
	AlertingConfig AlertingConfig  `yaml:"alerting,omitempty"`
  ...
}
```

### 相关资料

[prometheus.io/docs 官网配置解析](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
[cnblogs.com Prometheus之配置详解](https://www.cnblogs.com/wangguishe/p/15598120.html)