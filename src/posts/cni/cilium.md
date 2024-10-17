---
hide: true
---

#### 1.如何kubeadm创建集群的时候默认添加节点污点
### 2.kubeadm用来init的配置文件如何配置默认添加污点

要在使用kubeadm init命令创建集群时默认添加节点污点，可以通过编辑kubeadm配置文件来实现。以下是具体的步骤：

1. 在创建集群之前，先创建一个名为"kubeadm-config.yaml"的配置文件。可以使用以下命令创建该文件：
  ```
  vi kubeadm-config.yaml
  ```

2. 在该文件中添加以下内容：
  ```yaml
  apiVersion: kubeadm.k8s.io/v1beta2
  kind: InitConfiguration
  nodeRegistration:
    taints:
    - key: node-role.kubernetes.io/master
      value: "NoSchedule"
      effect: NoSchedule
  ---
  apiVersion: kubeadm.k8s.io/v1beta2
  kind: ClusterConfiguration
  ```

  这段配置的含义是给主节点（即控制平面节点）添加一个名为`node-role.kubernetes.io/master`的污点，并且设置该污点的效果为NoSchedule。

3. 保存并关闭文件。

4. 使用kubeadm init命令时，指定使用上述配置文件：
  ```
  kubeadm init --config=kubeadm-config.yaml
  ```

  这样，在使用kubeadm init命令创建集群时，会根据配置文件中的定义来添加节点污点。

注意：这种方式只适用于初始化集群时，默认添加节点污点。如果要为已有的节点添加污点，可以使用`kubectl taint`命令。

### 3.cilium的k8s网络模型

[https://docs.cilium.io/en/stable/network/kubernetes/](https://docs.cilium.io/en/stable/network/kubernetes/)

### 4.cilium网络模型

5. arp -n