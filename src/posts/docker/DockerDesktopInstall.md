---
hide: true
---
# DockerDesktopInstall 在Docker上搭建k8s集群

1. Docker Desktop 自带 kubenetes

```
setting/general/kubenetes 

打开选项

Enable Kubernetes
```

2. 如何访问服务
```
# 本地安装 kubectl
# 本地执行kubectl连接desktop
kubectl config use-context docker-desktop
```
```
# 启动dashboard
kubectl get pod -n kubernetes-dashboard

kubectl proxy

# 登陆dashboard
127.0.0.1:8001
```

### 搭建好集群以后安装 Nginx 服务

[语雀许大仙kubenetes](https://www.yuque.com/fairy-era/yg511q/gqx2mr#1f99473f)

```
kubectl create -f ./nginx_pod.yml 
```
```
# 查看Nginx服务Pod已经是Running状态
kubectl get pods -n dev
```
```
# 将dev的Nginx的80端口暴露出给本地使用
kubectl port-forward nginxpod -n dev --address 0.0.0.0 8090:80

# 访问本地8090端口
http://localhost:8090/
```

```
# 换一种服务暴露的方式 - 启动service的NodePort

# service安装
kubectl create -f nginx_service.yml

# 查看svc端口
kubectl get svc -n dev

# 访问svc.NodePort
http://127.0.0.1:30681
```


### 试试用Helm包安装MySQL

[Helm QuickStart](https://helm.sh/zh/docs/intro/quickstart/)

```
$ helm repo add bitnami https://charts.bitnami.com/bitnami
$ helm install bitnami/mysql --generate-name
```

> 安装以后看到 service 和 Pod 都有 MySQL 的

### 书写 Chart 包

1. 生成chart包并安装

```
# 初始化一个目录结构
helm create mychart
```

```
# 删除无用的示例文件
rm -rf mychart/templates/*
```

2. 开始创建资源文件

```
touch mychart/templates/configmap.yaml
```

```
apiVersion: v1
kind: ConfigMap
metadata:
  name: mychart-configmap
data:
  myvalue: "Hello World"
```

```
touch mychart/templates/nginx_pod.yaml
touch mychart/templates/nginx_service.yaml
```

```
helm install full-coral ./mychart
```

```
# 卸载发布
helm uninstall full-coral
```

2. 查看安装好的configmap

```
kubectl get configmap
```

