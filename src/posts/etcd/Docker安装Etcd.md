---
title: Docker安装Etcd
category:
  - etcd
tag:
  - etcd
---


# docker install

```
docker run --name etcd -d -p 2379:2379 -p 2380:2380 -e ALLOW_NONE_AUTHENTICATION=yes bitnami/etcd:3.3.11 etcd 
```
```
docker exec -it etcd /bin/bash
```
```
etcdctl get  / --prefix 
```

