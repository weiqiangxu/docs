---
title: kubectl常用的命令
tags:
  - kubectl
categories:
  - kubernetes
---

### 命令式对象管理

1. 查看所有的pod

``` bash
$ kubectl get pods
```

2. 查看某个pod，以yaml格式展示结果

``` bash
$ kubectl get pod pod_name -o yaml
```

3. kubernetes中所有的内容都抽象为资源，可以通过下面的命令进行查看

``` bash
$ kubectl api-resources
```

4. 创建一个namespace

``` bash
$ kubectl create namespace dev
```

5. 获取namespace

``` bash
$ kubectl get namespace
```

6. 获取namespace

``` bash
$ kubectl get namespace
$ kubectl get ns
```

7. 在刚才创建的namespace下创建并运行一个Nginx的Pod

``` bash
$ kubectl run nginx --image=nginx:1.17.1 -n dev
```

8. 查看名为dev的namespace下的所有Pod，如果不加-n，默认就是default的namespace

``` bash
$ kubectl get pods [-n 命名空间的名称]
$ kubectl get pods -n dev
```

9. 删除指定namespace下的指定Pod

``` bash
$ kubectl delete pod nginx -n dev
```

10. 删除指定的namespace

``` bash
$ kubectl delete namespace dev
```

11. 创建一个nginxpod.yaml，内容如下

``` yml
apiVersion: v1
kind: Namespace
metadata:
  name: dev
---
apiVersion: v1
kind: Pod
metadata:
  name: nginxpod
  namespace: dev
spec:
  containers:
    - name: nginx-containers
      image: nginx:1.17.1
```

12. 执行create命令，创建资源

``` bash
$ kubectl create -f nginxpod.yaml
```

13. 执行get命令，查看资源：

``` bash
$ kubectl get -f nginxpod.yaml
```

14. 执行delete命令，删除资源：

``` bash
$ kubectl delete -f nginxpod.yaml
```

### 资源管理方式总结

```
a. 命令式对象管理：直接使用命令去操作kubernetes的资源。
b. 命令式对象配置：通过命令配置和配置文件去操作kubernetes的资源。
c. 声明式对象配置：通过apply命令和配置文件去操作kubernetes的资源

创建和更新资源使用声明式对象配置：kubectl apply -f xxx.yaml。
删除资源使用命令式对象配置：kubectl delete -f xxx.yaml。
查询资源使用命令式对象管理：kubectl get(describe) 资源名称。
```

1. 查看Pod的详细信息

``` bash
$ kubectl describe pod pod的名称 [-n 命名空间名称]
$ kubectl describe pod nginx -n dev
```

2. Pod的访问

``` bash
# 获取Pod的IP
$ kubectl get pods [-n dev] -o wide

# 获取nginx的访问信息
$ kubectl get pods -n dev -o wide

# 通过curl访问
$ curl ip:端口


# 删除指定的Pod
$ kubectl delete pod pod的名称 [-n 命名空间]
$ kubectl delete pod nginx -n dev
```

3. 新建pod-nginx.yaml：

``` yml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: dev
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

4. 执行创建和删除命令

``` bash
$ kubectl create -f pod-nginx.yaml
$ kubectl delete -f pod-nginx.yaml
```

Label是kubernetes的一个重要概念。它的作用就是在资源上添加标识，用来对它们进行区分和选择
key/value键值对的形式\一个资源对象可以定义任意数量的Label

示例 pod-nginx.yaml：

``` yml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  namespace: dev
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


5. 执行创建和删除命令

``` bash
$ kubectl create -f pod-nginx.yaml
$ kubectl delete -f pod-nginx.yaml
```


### Deployment

1. 创建指定名称的deployement

``` bash
$ kubectl create deployment xxx [-n 命名空间]
$ kubectl create deploy xxx [-n 命名空间]
# 示例: 在名称为test的命名空间下创建名为nginx的deployment
$ kubectl create deployment nginx --image=nginx:1.17.1 -n test
```

2. 根据指定的deplyment创建Pod

``` bash
$ kubectl scale deployment xxx [--replicas=正整数] [-n 命名空间]
# 在名称为test的命名空间下根据名为nginx的deployment创建4个Pod
$ kubectl scale deployment nginx --replicas=4 -n dev
```

3. 创建一个deploy-nginx.yaml

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

4. 执行创建和删除命令：

``` bash
$ kubectl create -f deploy-nginx.yaml
$ kubectl delete -f deploy-nginx.yaml
```

5. 查看创建的Pod

``` bash
$ kubectl get pods [-n 命名空间]
# 查看名称为dev的namespace下通过deployment创建的3个Pod
$ kubectl get pods -n dev
```

6. 查看deployment的信息

``` bash
$ kubectl get deployment [-n 命名空间]
$ kubectl get deploy [-n 命名空间]
# 示例: 查看名称为dev的namespace下的deployment
$ kubectl get deployment -n dev
```

7. 查看deployment的详细信息

``` bash
$ kubectl describe deployment xxx [-n 命名空间]
$ kubectl describe deploy xxx [-n 命名空间]
# 示例:查看名为dev的namespace下的名为nginx的deployment的详细信息
$ kubectl describe deployment nginx -n dev
```


8. 删除deployment

``` bash
$ kubectl delete deployment xxx [-n 命名空间]
$ kubectl delete deploy xxx [-n 命名空间]
# 示例：删除名为dev的namespace下的名为nginx的deployment
$ kubectl delete deployment nginx -n dev
```



### Service

Pod的IP会随着Pod的重建产生变化
Pod的IP仅仅是集群内部可见的虚拟的IP，外部无法访问。
Service可以看做是一组同类的Pod对外的访问接口，借助Service，应用可以方便的实现服务发现和负载均衡

### 创建集群内部可访问的Service

1. 暴露Service

``` txt
### 会产生一个CLUSTER-IP，这个就是service的IP，在Service的生命周期内，这个地址是不会变化的
kubectl expose deployment xxx --name=服务名 --type=ClusterIP --port=暴露的端口 --target-port=指向集群中的Pod的端口 [-n 命名空间]
示例：暴露名为test的namespace下的名为nginx的deployment，并设置服务名为svc-nginx1
kubectl expose deployment nginx --name=svc-nginx1 --type=ClusterIP --port=80 --target-port=80 -n test
```

2. 查看Service

``` bash
$ kubectl get service [-n 命名空间] [-o wide]
# 示例：查看名为test的命名空间的所有Service
$ kubectl get service -n test
```

### 创建集群外部可访问的Service


1. 暴露Service

``` bash
# 会产生一个外部也可以访问的Service
$ kubectl expose deployment xxx --name=服务名 --type=NodePort --port=暴露的端口 --target-port=指向集群中的Pod的端口 [-n 命名空间]
# 示例：暴露名为test的namespace下的名为nginx的deployment，并设置服务名为svc-nginx2
$ kubectl expose deploy nginx --name=svc-nginx2 --type=NodePort --port=80 --target-port=80 -n test
```

2. 查看Service

``` bash
$ kubectl get service [-n 命名空间] [-o wide]
# 示例：查看名为test的命名空间的所有Service
$ kubectl get service -n test
```

3. 删除服务

``` bash
$ kubectl delete service xxx [-n 命名空间]
# 示例：删除服务
$ kubectl delete service svc-nginx1 -n test
```

4. 对象配置方式，新建svc-nginx.yaml,内容如下

``` yml
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


5. 执行创建和删除命令

``` bash
$ kubectl  create  -f  svc-nginx.yaml
$ kubectl  delete  -f  svc-nginx.yaml
```

6. 获取pod IP
``` bash
$ kubectl get po -o wide -n github
```

