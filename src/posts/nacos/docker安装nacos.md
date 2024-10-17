---
hide: true
---
# Docker 安装学习

```
docker run --name nacos-quick -e MODE=standalone -p 8849:8848 -d nacos/nacos-server:v2.1.2-slim
```

[http://127.0.0.1:8849/nacos](http://127.0.0.1:8849/nacos)

```
nacos/nacos
```

### 搭建go-client

```
1. 配置热更新实现
```