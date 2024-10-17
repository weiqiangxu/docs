---
hide: true
---
# kubeadm

[kubeadm quickstart](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/)

[kubeam create cluster](https://jimmysong.io/kubernetes-handbook/practice/install-kubernetes-on-ubuntu-server-16.04-with-kubeadm.html)

[https://jimmysong.io/ 云原生资料库](https://jimmysong.io/)

[k8s基础教程](https://lib.jimmysong.io/kubernetes-handbook/)

[宝藏博客 - 外部访问pod](https://jimmysong.io/blog/accessing-kubernetes-pods-from-outside-of-the-cluster/)

[云原生 - 必读](https://jimmysong.io/blog/must-read-for-cloud-native-beginner/)

[Kubernetes 中文指南/云原生应用架构实战手册](https://jimmysong.io/kubernetes-handbook/)

### install

```
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl

sudo curl -fsSLo /usr/share/keyrings/kubernetes-archive-keyring.gpg https://packages.cloud.google.com/apt/doc/apt-key.gpg

echo "deb [signed-by=/usr/share/keyrings/kubernetes-archive-keyring.gpg] https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```