---
hide: true
---

1. 初始化集群后的宿主机的目录

``` bash
[root@i-C5B261D3 kubernetes]# pwd
/etc/kubernetes
[root@i-C5B261D3 kubernetes]# tree .
.
├── admin.conf
├── controller-manager.conf
├── kubelet.conf
├── manifests
│   ├── etcd.yaml
│   ├── kube-apiserver.yaml
│   ├── kube-controller-manager.yaml
│   └── kube-scheduler.yaml
├── pki
│   ├── apiserver.crt
│   ├── apiserver-etcd-client.crt
│   ├── apiserver-etcd-client.key
│   ├── apiserver.key
│   ├── apiserver-kubelet-client.crt
│   ├── apiserver-kubelet-client.key
│   ├── ca.crt
│   ├── ca.key
│   ├── etcd
│   │   ├── ca.crt
│   │   ├── ca.key
│   │   ├── healthcheck-client.crt
│   │   ├── healthcheck-client.key
│   │   ├── peer.crt
│   │   ├── peer.key
│   │   ├── server.crt
│   │   └── server.key
│   ├── front-proxy-ca.crt
│   ├── front-proxy-ca.key
│   ├── front-proxy-client.crt
│   ├── front-proxy-client.key
│   ├── sa.key
│   └── sa.pub
└── scheduler.conf
```

> 如果要更改apiserver静态容器，更改manifests的kube-apiserver.yaml就可以，不用额外执行 `kubectl apply -f xxx`



2. 初始化集群后的所有POD

``` bash
[root@i-C5B261D3 kubernetes]# kubectl get pod -A
NAMESPACE      NAME                                                            READY   STATUS      RESTARTS        AGE
cert-manager   cert-manager-89fc69499-hrfzk                                    1/1     Running     1 (2d18h ago)   4d
cert-manager   cert-manager-cainjector-9d4f8786b-gqlzk                         1/1     Running     1 (2d18h ago)   4d
cert-manager   cert-manager-webhook-65d5698b84-tbtcp                           1/1     Running     0               4d
kube-backup    backup-cron-i-c5b261d3-backup-k8s-28077120-s8n87                0/1     Completed   0               30h
kube-backup    backup-cron-i-c5b261d3-backup-k8s-28078560-jmqzt                0/1     Completed   0               6h35m
kube-system    bingokube-console-6bcd885d85-gk7jc                              1/1     Running     0               4d
kube-system    bingokube-sdn-6stl6                                             1/1     Running     0               4d
kube-system    coredns-67d4546989-mmwnm                                        1/1     Running     0               4d
kube-system    coredns-67d4546989-ncdkj                                        0/1     Pending     0               4d
kube-system    csi-cephfsplugin-attacher-79848c7dd4-sctgm                      1/1     Running     0               4d
kube-system    csi-cephfsplugin-provisioner-69dfcb5cf4-wcj9n                   2/2     Running     0               4d
kube-system    csi-cephfsplugin-vgg7d                                          2/2     Running     0               4d
kube-system    csi-rbdplugin-attacher-5449d9649c-lchs2                         1/1     Running     0               4d
kube-system    csi-rbdplugin-cgmpl                                             2/2     Running     0               4d
kube-system    csi-rbdplugin-provisioner-795964d5d6-zjhwt                      2/2     Running     0               4d
kube-system    elastic-autoscaler-manager-66cfb4fbd9-nmths                     1/1     Running     0               4d
kube-system    etcd-i-c5b261d3                                                 1/1     Running     1 (2d18h ago)   4d
kube-system    kube-apiserver-i-c5b261d3                                       1/1     Running     0               4d
kube-system    kube-controller-manager-i-c5b261d3                              1/1     Running     9 (45h ago)     4d
kube-system    kube-scheduler-i-c5b261d3                                       1/1     Running     9 (45h ago)     4d
kube-system    metrics-server-b455c4f6-vn6sb                                   1/1     Running     0               4d
kube-system    renew-component-cert-cron-renew-component-cert-28077120-4vjtn   0/1     Completed   0               30h
kube-system    renew-component-cert-cron-renew-component-cert-28078560-b7h9s   0/1     Completed   0               6h35m
kube-system    resourcequota-webhook-manager-67fd44fc75-ccjmb                  1/1     Running     0               4d
kube-system    traefik-g7krv                                                   1/1     Running     0               4d
loki           loki-0                                                          2/2     Running     0               4d
loki           loki-event-exporter-7f5f4945f8-hpp7d                            1/1     Running     0               4d
loki           loki-grafana-6bd9668c6-js9vr                                    2/2     Running     0               4d
loki           loki-promtail-tdptb                                             1/1     Running     0               4d
monitoring     alertmanager-84cb549758-fq5vv                                   2/2     Running     0               4d
monitoring     node-exporter-mchdp                                             1/1     Running     0               4d
monitoring     prometheus-86dd696f-rzpjk                                       2/2     Running     0               4d
vpc-across     vpc-across-controller-576fcfb55-wg9mx                           1/1     Running     0               4d
```

3. 初始化集群后的所有NS

``` bash
[root@i-C5B261D3 kubernetes]# kubectl get ns
NAME              STATUS   AGE
cert-manager      Active   4d
default           Active   4d
kube-backup       Active   4d
kube-node-lease   Active   4d
kube-public       Active   4d
kube-system       Active   4d
loki              Active   4d
monitoring        Active   4d
vpc-across        Active   4d
```