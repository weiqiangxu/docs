---
hide: true
---
# 买了两台腾讯云服务器尝试搭建一个k8s集群


搭建目标：

1、安装k8s集群

2、集群内部安装一个lnmp、golang、springboot搭建的java服务，分别占据端口，通过nginx指向对外提供服务，输出一个 hello world

3、安装内部docker hub，或者直接将自己的pod镜像上传递公网hub

4、安装一个Elastic集群、Redis集群、Mongo集群

5、安装一个ELK模式日志采集，以filebeat为采集节点，logstash作为数据分析，Elastic存储数据，Kibana作为数据呈现

6、内部的服务必须是多节点，通过负载均衡模式共同对外提供服务，节点高可用，高负载，热重启等


主要的目的：

1、对 k8s 的高可用有深刻的认识，对集群的概念和大部分的kubectl命令有比较熟练地掌握

2、对Elastic、Mongo和Redis的集群模式有深刻的认识

3、使用Kibanna做服务监控、审计日志采集等


验证目标：

1、MySQL和Mongo等数据库的持久化

2、集群和单机下的性能压测报告


操作系统 

腾讯云 - 轻量应用级服务器 - centos 7.6


语雀-搭建k8s集群

教程地址: https://www.yuque.com/fairy-era/yg511q/hg3u04


[yuque/kubernetes](https://www.yuque.com/fairy-era/yg511q/hg3u04)

[jimmysong BLOG](https://jimmysong.io/blog/accessing-kubernetes-pods-from-outside-of-the-cluster/)

[helm Quickstart](https://helm.sh/zh/docs/intro/quickstart/)

[k8s 中文社区](https://www.kubernetes.org.cn/docs)