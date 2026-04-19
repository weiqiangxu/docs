---
title: nginx-ingress
tags:
  - kubernetes
categories:
  - kubernetes
---

## 目录

- [一、概述](#一概述)
- [二、部署Nginx Ingress](#二部署nginx-ingress)
- [三、创建Ingress规则](#三创建ingress规则)
- [四、相关资料](#四相关资料)

## 一、概述

Nginx Ingress是Kubernetes中常用的Ingress控制器，用于将外部HTTP/HTTPS流量路由到集群内部的Service。

## 二、部署Nginx Ingress

### 2.1 Helm部署方式

``` bash
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

### 2.2 YAML部署方式

[install-ingress-nginx.yaml](https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml)

``` bash
kubectl apply -f install-ingress-nginx.yaml
```

### 2.3 镜像配置

如果需要使用国内镜像源，修改镜像地址：

``` yaml
# 原始
image: k8s.gcr.io/ingress-nginx/controller:v1.1.1@sha256:xxx

# 修改为
image: registry.cn-hangzhou.aliyuncs.com/google_containers/nginx-ingress-controller:v1.1.1

# 原始
image: k8s.gcr.io/ingress-nginx/kube-webhook-certgen:v1.1.1@sha256:xxx

# 修改为
image: registry.cn-hangzhou.aliyuncs.com/google_containers/kube-webhook-certgen:v1.1.1
```

## 三、创建Ingress规则

### 3.1 示例应用

``` yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
  - name: nginx-container
    image: nginx:latest
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
    nodePort: 30089
  type: NodePort
```

### 3.2 创建Ingress

``` yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minimal-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx-example
  defaultBackend:
    service:
      name: nginx-service
      port:
        number: 8989
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-service
            port:
              number: 8989
```

### 3.3 常用Annotations

| Annotation | 说明 |
|------------|------|
| `nginx.ingress.kubernetes.io/rewrite-target` | 重写目标URL |
| `nginx.ingress.kubernetes.io/ssl-redirect` | 是否强制HTTPS重定向 |
| `nginx.ingress.kubernetes.io/proxy-body-size` | 请求体大小限制 |
| `nginx.ingress.kubernetes.io/proxy-connect-timeout` | 连接超时时间 |
| `nginx.ingress.kubernetes.io/proxy-read-timeout` | 读取超时时间 |
| `nginx.ingress.kubernetes.io/proxy-send-timeout` | 发送超时时间 |

### 3.4 验证部署

``` bash
# 查看Ingress控制器服务
kubectl get service -n ingress-nginx

# 查看Ingress规则
kubectl get ingress
```

## 四、相关资料

- [ingress-nginx官方文档](https://kubernetes.github.io/ingress-nginx/)
