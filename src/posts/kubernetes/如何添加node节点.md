---
title: 如何添加node节点
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - kubernetes
categories:
  - kubernetes
date: 2023-05-06 18:40:12
excerpt: 如何使用kubeadm在master节点，然后在裸机centos安装节点环境(containerd\runc\cni)，使用kubeadm加入节点，并且配置kubectl环境
sticky: 1
---


1. master节点生成token

[setup-tools/kubeadm/kubeadm-token/](https://kubernetes.io/zh-cn/docs/reference/setup-tools/kubeadm/kubeadm-token/)
[setup-tools/kubeadm/kubeadm-join/](https://kubernetes.io/zh-cn/docs/reference/setup-tools/kubeadm/kubeadm-join/)

``` bash
$ kubeadm token create  --description "test-token" --ttl=0 --print-join-command | grep discovery-token-ca-cert-hash
$ kubeadm token list
$ kubeadm token delete <token>
```

2. node节点环境搭建

``` bash
containerd
cni
kubeadm\kubelet\kubectl
```

3. node节点加入集群

``` bash
# 已经有集群环境的可以reset一下
$ kubeadm reset

# discovery-token对应token
# discovery-token-ca-cert-hash对应上面的hash
$ kubeadm join <control-plane-host>:<control-plane-port> --token <token> --discovery-token-ca-cert-hash sha256:<hash>
$ kubeadm join --discovery-token cmjgty.wy9bqt0y6v8nmkln --discovery-token-ca-cert-hash sha256:93a525dfa1ead4fae6901dabc4bbb3d0467040118b1c8d68bbbb7fc688f069d1 10.16.203.160:6443

# 查看kubectl配置
$ kubectl config view
$ cp /etc/kubernetes/kubelet.conf ~/.kube/config
$ kubectl get pod
```