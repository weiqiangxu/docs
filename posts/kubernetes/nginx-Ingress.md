---
title: nginx-ingress
tags:
  - kubernetes
categories:
  - kubernetes
---

### 1. nginx pod

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

### 2. ingress-nginx 

[install-ingress-nginx.yaml](https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml)

```bash
$ helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace


# 更改镜像地址
# image: k8s.gcr.io/ingress-nginx/controller:v1.1.1@sha256:xxx
# 变成
# image: registry.cn-hangzhou.aliyuncs.com/google_containers/nginx-ingress-controller:v1.1.1

# image: k8s.gcr.io/ingress-nginx/kube-webhook-certgen:v1.1.1@sha256:xxx
# 变成
# image: registry.cn-hangzhou.aliyuncs.com/google_containers/kube-webhook-certgen:v1.1.1

$ kubectl apply -f install-ingress-nginx.yaml
```

### 3. 创建ingress yaml

``` yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minimal-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  defaultBackend:
    service:
      name: nginx-service
      port:
        number: 8989
  ingressClassName: nginx-example
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

``` bash
$ kubectl get service -n ingress-nginx
```


### 相关地址

- [kubernetes.github.io/ingress-nginx/](https://kubernetes.github.io/ingress-nginx/)