---
title: kubectl
tags:
  - kubectl
categories:
  - kubernetes
---

### 一、kubectl管理方式

##### 1.命令式操作 Imperative Commands

> 直接使用命令去操作kubernetes的资源

```bash
$ kubectl create deployment xxx --image=nginx

$ kubectl run nginx --image nginx

$ kubectl run\edit\delete\get\describe\logs
```

##### 2.命令式对象配置 Imperative Object Configuration

> 通过命令配置和配置文件去操作kubernetes的资源

```bash
# 侧重于明确的操作指令
# 用户需要精确地告诉 Kubernetes 要执行的操作，如创建、更新或删除某个具体资源
# 并且要提供资源的详细配置信息（通常通过配置文件或者部分命令参数）。
# 命令的对象是Individual files(一个文件)

$ kubectl create - f <file-path>
```



##### 3.声明式配置Declarative Configuration


```bash
# 强调资源的最终状态
# 操作的对象是Directories of files(多个文件)

$ kubectl apply -f ./
```

### 二、常用命令


``` bash
# 查看所有的pod
$ kubectl get pods

# 查看某个pod，以yaml格式展示结果
$ kubectl get pod pod_name -o yaml

# kubernetes中所有的内容都抽象为资源，可以通过下面的命令进行查看
$ kubectl api-resources

# 创建一个namespace
$ kubectl create namespace dev

# 获取namespace
$ kubectl get namespace

# 获取namespace
$ kubectl get namespace
$ kubectl get ns

# 在刚才创建的namespace下创建并运行一个Nginx的Pod
$ kubectl run nginx --image=nginx:1.17.1 -n dev

# 查看名为dev的namespace下的所有Pod，如果不加
$ kubectl get pods # [-n 命名空间的名称]
$ kubectl get pods -n dev

# 删除指定namespace下的指定Pod
$ kubectl delete pod nginx -n dev

# 删除指定的namespace
$ kubectl delete namespace dev

# 执行create命令，创建资源
$ kubectl create -f nginx-pod.yaml

$ kubectl get -f nginx-pod.yaml

# 执行delete命令删除资源
$ kubectl delete -f nginxpod.yaml

# 查看Pod的详细信息
$ kubectl describe pod pod的名称 [-n 命名空间名称]
$ kubectl describe pod nginx -n dev

# Pod的访问
# 获取Pod的IP
$ kubectl get pods -o wide #[-n dev]

# 获取nginx的访问信息
$ kubectl get pods -n dev -o wide

# 通过curl访问
$ curl ip:端口

# 删除指定的Pod
$ kubectl delete pod pod的名称 [-n 命名空间]
$ kubectl delete pod nginx -n dev

$ kubectl create -f pod-nginx.yaml
$ kubectl delete -f pod-nginx.yaml

# 创建指定名称的deployement
$ kubectl create deployment xxx [-n 命名空间]
$ kubectl create deploy xxx [-n 命名空间]
# 示例: 在名称为test的命名空间下创建名为nginx的deployment
$ kubectl create deployment nginx --image=nginx:1.17.1 -n test


# 根据指定的deplyment创建Pod
$ kubectl scale deployment xxx # [--replicas=正整数] [-n 命名空间]
# 在名称为test的命名空间下根据名为nginx的deployment创建4个Pod
$ kubectl scale deployment nginx --replicas=4 -n dev

$ kubectl create -f deploy-nginx.yaml
$ kubectl delete -f deploy-nginx.yaml

$ kubectl get pods # [-n 命名空间]
# 查看名称为dev的namespace下通过deployment创建的3个Pod
$ kubectl get pods -n dev

$ kubectl get deployment # [-n 命名空间]
$ kubectl get deploy # [-n 命名空间]

# 示例: 查看名称为dev的namespace下的deployment
$ kubectl get deployment -n dev

$ kubectl describe deployment xxx #[-n 命名空间]
$ kubectl describe deploy xxx #[-n 命名空间]
# 示例:查看名为dev的namespace下的名为nginx的deployment的详细信息
$ kubectl describe deployment nginx -n dev

$ kubectl delete deployment xxx #[-n 命名空间]
$ kubectl delete deploy xxx #[-n 命名空间]
# 示例：删除名为dev的namespace下的名为nginx的deployment
$ kubectl delete deployment nginx -n dev

# 暴露Service
### 会产生一个CLUSTER-IP，这个就是service的IP，在Service的生命周期内，这个地址是不会变化的
# kubectl expose deployment xxx --name=服务名 --type=ClusterIP --port=暴露的端口 
# --target-port=指向集群中的Pod的端口 [-n 命名空间]
# 示例：暴露名为test的namespace下的名为nginx的deployment，并设置服务名为svc-nginx1
$ kubectl expose deployment nginx --name=svc-nginx1 \
  --type=ClusterIP --port=80 --target-port=80 -n test

$ kubectl get service #[-n 命名空间] [-o wide]
# 示例：查看名为test的命名空间的所有Service
$ kubectl get service -n test

# 会产生一个外部也可以访问的Service
$ kubectl expose deployment xxx --name=服务名 --type=NodePort --port=暴露的端口 \
  --target-port=指向集群中的Pod的端口 [-n 命名空间]
  
# 示例：暴露名为test的namespace下的名为nginx的deployment，并设置服务名为svc-nginx2
$ kubectl expose deploy nginx --name=svc-nginx2 --type=NodePort --port=80 --target-port=80 -n test

# 查看Service
$ kubectl get service #[-n 命名空间] [-o wide]
# 示例：查看名为test的命名空间的所有Service
$ kubectl get service -n test

# 删除服务
$ kubectl delete service xxx # [-n 命名空间]
# 示例：删除服务
$ kubectl delete service svc-nginx1 -n test

$ kubectl  create  -f  svc-nginx.yaml
$ kubectl  delete  -f  svc-nginx.yaml

$ kubectl get po -o wide -n github
```

``` yml
# nginx-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: dev
  # Label是kubernetes的一个重要概念
  # 它的作用就是在资源上添加标识，用来对它们进行区分和选择
  # key/value键值对的形式\一个资源对象可以定义任意数量的Label
  labels:
    version: "3.0"
    env: "test"        
spec:
  containers:
  - image: nginx:1.17.1
    imagePullPolicy: IfNotPresent
    name: pod
    ports: 
    - name: nginx-port
      containerPort: 80
      protocol: TCP
```

``` yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: dev
spec:
  replicas: 3
  selector:
    matchLabels:
      run: nginx
  template:
    metadata:
      labels:
        run: nginx
    spec:
      containers:
      - image: nginx:1.17.1
        name: nginx
        ports:
        - containerPort: 80
          protocol: TCP
```

``` yml
# service-nginx.yaml
apiVersion: v1
kind: Service
metadata:
  name: svc-nginx
  namespace: dev
spec:
  clusterIP: 10.109.179.231
  ports:
  - port: 80
    protocol: TCP
    targetPort: 80
  selector:
    run: nginx
  type: ClusterIP
```

### 三、kubectl底层

  kubectl是一个命令行工具，kubectl工具会首先读取并解析配置文件。用于与 Kubernetes API Server 进行通信。当执行kubectl apply命令时，消息首先会被发送到 API Server。当 API Server 将新的Deployment配置存储到 etcd 后，Deployment 控制器会通过 API Server 监听（Watch）etcd 中Deployment资源的变化。

- [k8s的对象管理一(命令式与声明式API)](https://www.cnblogs.com/shuiguizi/p/12776761.html)