---
title: 配置traefik的ingress服务
tags:
  - kubernetes
categories:
  - kubernetes
---

> 在docker或者k8s集群内部安装traefik并且配置ingress访问内部服务

### 一、docker配置traefik访问Nginx服务

```yml
version: '3'

services:
  reverse-proxy:
    # The official v2 Traefik docker image
    image: traefik:v2.10
    # Enables the web UI and tells Traefik to listen to docker
    command: --api.insecure=true --providers.docker
    ports:
      # The HTTP port
      - "80:80"
      # The Web UI (enabled by --api.insecure=true)
      - "8080:8080"
    volumes:
      # So that Traefik can listen to the Docker events
      - /var/run/docker.sock:/var/run/docker.sock
  nginx:
   image: nginx
   labels:
     - "traefik.http.routers.nginx.rule=Host(`yourdomain.com`)"
     - "traefik.http.services.nginx.loadbalancer.server.port=80"
   restart: always
```

```bash
$ docker-compose up -d nginx

$ docker-compose up -d reverse-proxy
```

```bash
# 127.0.0.1 yourdomain.com
$ vim /etc/hosts
```

- [访问Nginx服务yourdomain.com](yourdomain.com)

- [访问traefik可视化界面](http://127.0.0.1:8080/dashboard/#/)


### 二、kubernetes配置traefik访问内部服务

[https://doc.traefik.io/traefik/getting-started/quick-start-with-kubernetes/](https://doc.traefik.io/traefik/getting-started/quick-start-with-kubernetes/)

```bash
[root@VM-8-4-centos ~]# ls -l
00-account.yml             # 创建账号
00-role.yml                # 创建角色
01-role-binding.yml        # 绑定账号角色
02-traefik-services.yml    # 创建traefik服务
02-traefik.yml             # traefik
03-whoami-services.yml     # 创建测试用的服务
03-whoami.yml              # 创建测试用的后端
04-whoami-ingress.yml      # 给service绑定ingress
```

### 相关疑问

1. k8s的servivc的虚拟ip无论是集群内还是集群外都无法访问，那还有什么用
2. k8s的service的虚拟IP作用架构图
3. k8s的service的虚拟IP负载均衡的源码理解
4. 集群的带宽够不够如何测试出来的
5. 通用的集群暴露服务是通过什么方式暴露，service的NodePort吗