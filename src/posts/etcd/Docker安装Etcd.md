---
title: Docker安装Etcd
category:
  - etcd
tag:
  - etcd
---


### 1.Docker安装Etcd单机

```bash
$ docker run --name etcd -d -p 2379:2379 \
  -p 2380:2380 \
  -e ALLOW_NONE_AUTHENTICATION=yes \
  bitnami/etcd:3.3.11 etcd 

$ docker exec -it etcd /bin/bash

$ etcdctl get  / --prefix 
```

### 2.Etcd集群安装

```bash
version: '3'
services:
  etcd1:
    image: quay.io/coreos/etcd:v3.5.7
    container_name: etcd1
    command: etcd -name etcd1 -advertise-client-urls http://etcd1:2379 -listen-client-urls http://0.0.0.0:2379 -initial-advertise-peer-urls http://etcd1:2380 -listen-peer-urls http://0.0.0.0:2380 -initial-cluster etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
    ports:
      - "2379:2379"
      - "2380:2380"
    networks:
      - etcd-net

  etcd2:
    image: quay.io/coreos/etcd:v3.5.7
    container_name: etcd2
    command: etcd -name etcd2 -advertise-client-urls http://etcd2:2379 -listen-client-urls http://0.0.0.0:2379 -initial-advertise-peer-urls http://etcd2:2380 -listen-peer-urls http://0.0.0.0:2380 -initial-cluster etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
    ports:
      - "2379:2379"
      - "2380:2380"
    networks:
      - etcd-net

  etcd3:
    image: quay.io/coreos/etcd:v3.5.7
    container_name: etcd3
    command: etcd -name etcd3 -advertise-client-urls http://etcd3:2379 -listen-client-urls http://0.0.0.0:2379 -initial-advertise-peer-urls http://etcd3:2380 -listen-peer-urls http://0.0.0.0:2380 -initial-cluster etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
    ports:
      - "2379:2379"
      - "2380:2380"
    networks:
      - etcd-net

networks:
  etcd-net:
    driver: bridge
```



[etcdctl下载](https://github.com/etcd-io/etcd/releases/tag/v3.3.11)