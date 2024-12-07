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
    - 给Pod提供了一个稳定的访问入口，实现了负载均衡，访问Service的时候自动转发到Backend服务的Pod
    - 与Ingress结合实现外部访问，Ingress控制器可根据配置将外部请求转发到Service的虚拟IP和端口
2. k8s的service的虚拟IP作用架构图
3. k8s的service的虚拟IP负载均衡的源码理解
4. 集群的带宽够不够如何测试出来的
    - 集群中的节点上或者容器安装iperf或iperf3工具
    - ifconfig可以看到网卡传输的字节数，go程序或者NodeExporter等暴露当前字节传输速度采集Prometheus指标
5. 通用的集群暴露服务是通过什么方式暴露，service的NodePort吗
    - Ingress。因为可以统一用SSL层https的，和自定义域名转发。
6. 请求Service的虚拟IP是怎么转发到Backend的Pod的IP的
    - kube-proxy 组件负责实现 Service 的请求转发， iptables或者ipvs
    - Kubernetes 会根据 Service 的标签选择器自动创建一个对应的 Endpoints 对象。这个Endpoints对象包含了当前与Service关联的所有Pod的IP地址和端口信息。

7. 如何配置Ingress-nginx以使其监听宿主机的80端口
8. Ingress的服务的端口怎么暴露
9. 如何配置Ingress-nginx以使其监听宿主机的80端口
      - NodePort 方式修改端口范围（不推荐用于生产环境）（默认NodePort是30000-32767 ）
      - 使用 LoadBalancer 结合端口转发（云环境适用）】
      - HostNetwork部署