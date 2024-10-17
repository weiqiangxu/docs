---
title: chartmuseum
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - chartmuseum
categories:
  - kubernetes
date: 2023-07-05 18:40:12
excerpt: 了解chart仓库的安装和使用
sticky: 1
hide: false
---

### 1.docker启动单机的chart仓库服务

```bash
docker run --name=chartmuseum --restart=always -it -d \
  -p 8080:8080 \
  -v ~/charts:/charts \
  -e STORAGE=local \
  -e STORAGE_LOCAL_ROOTDIR=/charts \
  chartmuseum/chartmuseum:v0.12.0
```

### 2.使用helm工具添加chart仓库到本地

```bash
# 添加chart库
$ helm repo add chartrepo http://localhost:8080

$ helm repo list
NAME            URL
chartrepo       http://localhost:8080

# 我们创建并打包一个新的chart
$ helm create test
Creating test

$ helm package test

# 将生成的tgz文件放到chartmuseum的文件夹下
$ mv test-0.1.0.tgz ~/charts/

# 然后helm运行helm repo update更新，并搜索
$ helm repo update

$ helm search repo test
NAME            CHART VERSION   APP VERSION     DESCRIPTION
chartrepo/test  0.1.0           1.16.0          A Helm chart

$ helm show chart chartrepo/test
apiVersion: v2
appVersion: 1.16.0
description: A Helm chart for Kubernetes
name: test
type: application
version: 0.1.0
```

### 3. 查看chart仓库的helm包有哪些

```bash
# 安装helm push 插件
$ helm plugin install https://github.com/chartmuseum/helm-push.git

# helm push命令将chart发布到chartmuseum上
$ helm push test-0.1.0.tgz chartrepo

# 更新helm repo，搜索刚刚上传的chart。
$ helm repo upgrade

$ helm search repo chartrepo
NAME                  CHART   VERSION  
chartmuseum/test      0.1.0   1.16.0     
```

### 4.API接口

```bash
# 查询chart
GET ${http}/api/charts

# 下载chart
GET ${http}/charts/${chart-name}.tgz

# 上传chart
POST ${http}/api/charts 
{chart:${local_path/chart-name}.tgz}
```

> 手动拷贝chart包到`/charts`目录，charts仓库路径`STORAGE_LOCAL_ROOTDIR`有一个`index-cache.yaml`必须删除才会看到完整的chart包列表