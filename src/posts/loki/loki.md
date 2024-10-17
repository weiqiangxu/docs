---
title: loki
index_img: /images/bg/linux.jpeg
banner_img: /images/bg/5.jpg
tags:
  - linux
categories:
  - linux
date: 2023-05-18 18:40:12
excerpt: 使用loki存储日志数据
hide: true
---

### loki

1. 如何搭建loki服务

``` bash

mkdir evaluate-loki

cd evaluate-loki

wget https://raw.githubusercontent.com/grafana/loki/main/examples/getting-started/loki-config.yaml -O loki-config.yaml
wget https://raw.githubusercontent.com/grafana/loki/main/examples/getting-started/promtail-local-config.yaml -O promtail-local-config.yaml
wget https://raw.githubusercontent.com/grafana/loki/main/examples/getting-started/docker-compose.yaml -O docker-compose.yaml

docker-compose up -d

http://localhost:3101/ready.
http://localhost:3000

{container="evaluate-loki-flog-1"}
```

2. loki如何写入日志
3. 如何查看日志数据



### 相关文档

[https://grafana.com/docs/loki/latest/v2.8x](https://grafana.com/docs/loki/latest/)
[https://grafana.com/docs/loki/latest/getting-started/](https://grafana.com/docs/loki/latest/getting-started/)


