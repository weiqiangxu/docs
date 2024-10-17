---
hide: true
---
# MySQL集群方案

1. 一主多从，主库更新和写入，从库只负责读。 [博客](https://blog.51cto.com/u_15127571/2715035)

2. 官方推荐 Docker Compose 一键搭建一主多从 [bitnami/mysql](https://registry.hub.docker.com/r/bitnami/mysql)

3. kubernetes集群搭建MySQL集群


# 源地址

https://www.jianshu.com/p/58ad9584a4a9

https://www.yuque.com/fairy-era/yg511q/od4gy0

### 1. mysql-rc.yaml

```
apiVersion: v1
kind: ReplicationController
metadata:
  name: mysql-rc
  labels:
    name: mysql-rc
spec:
  replicas: 1
  selector:
    name: mysql-pod
  template:
    metadata:
      labels:
        name: mysql-pod
    spec:
      containers:
      - name: mysql
        image: mysql
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "mysql"
```

### 2. mysql-svc.yaml

```
apiVersion: v1
kind: Service
metadata:
  name: mysql-svc
  labels:
    name: mysql-svc
spec:
  type: NodePort
  ports:
  - port: 3306
    protocol: TCP
    targetPort: 3306
    name: http
    nodePort: 32306
  selector:
    name: mysql-pod
```

### 3. 创建

```
kubectl create -f mysql-rc.yaml

kubectl create -f mysql-svc.yaml
```

### 4. 查看状态

```
 kubectl get pod -o wide
```

# 参考博客

https://zhuanlan.zhihu.com/p/420110247