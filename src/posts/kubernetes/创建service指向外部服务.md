---
title: 创建service和endpoints指向外部服务
category:
  - kubernetes
tag:
  - kubernetes
---


### 声明一个elasticsearch-1的服务，它映射到一个外部的地址192.168.11.13的9200端口

``` yml
kind: Service
apiVersion: v1
metadata:
  name: elasticsearch-1
spec:
  type: ClusterIP
  ports:
  - port: 80 #cluster端口，集群内部访问
    targetPort: 9200 #pod端口
---
kind: Endpoints
apiVersion: v1
metadata:
  name: elasticsearch-1
subsets:
  - addresses:
      - ip: 192.168.11.13
    ports:
      - port: 9200
```

``` bash
[root@VM-8-4-centos ~]# kubectl get svc elasticsearch-1
NAME              TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
elasticsearch-1   ClusterIP   10.43.193.41   <none>        80/TCP    17s
```

``` bash
[root@VM-8-4-centos ~]# kubectl get endpoints elasticsearch-1
NAME              ENDPOINTS            AGE
elasticsearch-1   192.168.11.13:9200   55s
```

> 访问服务 elasticsearch-1 最终会指向 192.168.11.13:9200