---
title: registry
tags:
  - registry
categories:
  - kubernetes
---

# registry

### 1.docker单机启动镜像服务

```bash
$ docker run -d \
  -p 5005:5000 --restart=always \
  --name registry registry:latest
```

### 2.启动以后访问服务

```bash
docker pull nginx:alpine

docker tag nginx:alpine 127.0.0.1:5005/test/mynginx:v1

# 推送镜像给单机镜像仓库
docker push 127.0.0.1:5005/test/mynginx:v1

# 访问registry服务
curl http://localhost:5005/v2/_catalog

{
  "repositories": [
    "test/mynginx"
  ]
}
```

### 3.镜像拉取

```bash
# 其他节点拉取镜像
docker pull x.x.x.x:5005/test/mynginx:v1
```

