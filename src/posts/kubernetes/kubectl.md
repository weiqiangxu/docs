---
hide: true
---
# kubectl

> $HOME/.kube/config

```
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config
```

### 常用

```
kubectl get ns
kubectl get pods -n db
kubectl get pods -n cms
```

```
kubectl describe pod ${pod_name} -n ${namespace_name}
```

```
kubectl get deployment -n db
kubectl describe deployment xxx -n db
```

```
kubectl get svc -n db
kubectl describe svc redis-master -n db
```


