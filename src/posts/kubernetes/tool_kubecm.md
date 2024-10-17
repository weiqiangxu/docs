---
hide: true
---
# kubecm

> 管理kube config的

[kubecm Github Link](https://github.com/sunny0826/kubecm)

[kubecm.cloud/](https://kubecm.cloud/)

### 安装多个config | 常用指令

```
cd ~/.kube/ && mkdir tmp && cd tmp
vim develop
vim testing
cd ..
kubecm -m tmp

# 合并多个配置为一个
kubecm merge -f [$dir]
kubecm merge -f tmp

kubecm swtich

telepresence quit -u -r
telepresence connect
```

### 参考文章

[阿里云开发者社区/Kubecm:管理你的kubeconfig](https://developer.aliyun.com/article/738438)

