---
title: 制作helm包和自建Chart仓库
index_img: /images/bg/k8s.webp
banner_img: /images/bg/5.jpg
tags:
  - helm
categories:
  - kubernetes
date: 2023-06-01 16:28:12
excerpt: 介绍如何使用image镜像制作helm包，自建仓库，以及使用自建仓库部署
sticky: 1
hide: false
---

### 一、Helm相关概念

Helm是一个kubernetes的包管理工具，软件包管理器 (类似ubuntu.apt centos.yum python.pip)，主要解决Kubernetes原生资源文件如deployment、replicationcontroller、service或pod等资源过于分散不好管理的问题。

- helm 命令行管理工具，kubernetes应用chart（创建、打包、发布和管理）
- chart 应用描述（kubernetes资源相关文件的集合），相当于是k8s的Yum RPM
- release 基于chart的部署实体，chart被Helm运行后生成一个release,比如MySQL chart可以有很多个实例（每一次安装有它自己的 release && release name）
- Repository 存放和共享 charts 的地方

[Helm QuickStart](https://helm.sh/zh/docs/intro/using_helm/)

### 二、安装方式

1. 使用脚本安装
2. 用二进制版本安装(tar -zxvf)

### 三、常用功能

##### 1.安装开源包

``` bash
# https://artifacthub.io/
# 如MySQL https://artifacthub.io/packages/helm/bitnami/mysql
$ helm repo add bitnami https://charts.bitnami.com/bitnami
$ helm install my-mysql bitnami/mysql --version 9.10.4
$ helm status my-mysql
$ helm repo update
$ helm --help
```

##### 2.自定义包

``` bash
# https://helm.sh/zh/docs/intro/using_helm/#创建你自己的-charts
$ helm create my-package
$ cd my-package && tree .
.
├── Chart.yaml                    # Helm chart 包的元数据文件，包含 chart 的名称、版本、描述等信息。
├── charts                        # 子 chart 的目录，用于管理依赖的 chart
├── templates                     # 模板文件的目录，用于生成 Kubernetes 的资源清单
│   ├── NOTES.txt                 # 包含了 chart 的信息和指引用户如何使用 chart
│   ├── _helpers.tpl              # 定义和存储可重用的模板函数
│   ├── deployment.yaml           # 模板文件，用来生成 Kubernetes Deployment 资源的清单
│   ├── hpa.yaml                  # 创建 Kubernetes 的 HorizontalPodAutoscaler（HPA）资源对象
│   ├── ingress.yaml              # 模板文件，用来生成 Kubernetes Ingress 资源的清单
│   ├── service.yaml              # 模板文件，用来生成 Kubernetes Service 资源的清单
│   ├── serviceaccount.yaml       # 模板文件，用来生成 Kubernetes ServiceAccount 资源的清单
│   └── tests                     # 测试文件夹
│       └── test-connection.yaml  # 测试Kubernetes集群连接是否正常的配置文件
└── values.yaml                   # 默认的值文件，存储所有的配置项及其默认值。


# 打包当前文件夹
$ helm package ./my-package
my-package-0.1.0.tgz

$ helm install my-package ./my-package-0.1.0.tgz
```

### 四、自建仓库

##### 1.创建仓库

``` bash
# github page 可以用于建设helm repo
# 响应GET请求的HTTP服务器即可作为chart仓库
$ mkdir my-repo
$ mv ./my-package-0.1.0.tgz my-repo
# helm repo index [DIR] [flags]
# helm repo index命令会基于给定的包含chart包的本地目录生成一个index文件
# --url 会在生成的 index.yaml 的package注明完整的包访问路径
$ helm repo index my-repo --url http://127.0.0.1:9090
$ tree ./my-repo 
./my-repo
├── deis-workflow-0.1.0.tgz
└── index.yaml
```

##### 2.启动http文件服务

``` golang
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func readFile(w http.ResponseWriter, r *http.Request) {
	file, err := os.Open(fmt.Sprintf("/home/my-repo/%s", r.RequestURI))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer func(file *os.File) {
		_ = file.Close()
	}(file)
	content := make([]byte, 1024)
	for {
		bytesRead, err := file.Read(content)
		if err != nil {
			break
		}
		_, _ = w.Write(content[:bytesRead])
	}
}

func main() {
	http.HandleFunc("/", readFile)
	err := http.ListenAndServe(":9090", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
```

``` bash
# 下面访问可以下载文件则chart仓库可用
$ wget http://127.0.0.1:9090/deis-workflow-0.1.0.tgz
$ wget http://127.0.0.1:9090/index.yaml
```

##### 3.添加仓库到本地并拉取helm包

``` bash
# github page 可以用于建设helm repo
$ helm repo add my-repo http://localhost:9191/      
"my-repo" has been added to your repositories

$ helm repo list
xuweiqiang@xuweiqiangs-Mac-mini Documents % helm repo list
NAME     	URL                                              
bitnami  	https://charts.bitnami.com/bitnami
my-repo  	http://localhost:9191/

# 罗列仓库my-repo包
$ helm search repo my-repo
NAME                 	CHART  VERSION	  APP VERSION	DESCRIPTION                
my-repo/deis-workflow	0.1.0  1.16.0     A Helm chart for Kubernetes

# 拉取helm包到本地
$ helm pull my-repo/deis-workflow --version 0.1.0 --destination=./
```

### 五、使用harbor建Chart仓库

[https://goharbor.io/](https://goharbor.io/)

### Q&A

- 在没有k8s环境下执行helm install提示

``` bash
Error: INSTALLATION FAILED: Kubernetes cluster unreachable: 
Get "https://10.76.138.115:6443/version": dial tcp 10.76.138.115:6443: connect: no route to host
```

### 相关资料

[自定义chart](https://helm.sh/zh/docs/intro/using_helm/#%E5%AE%89%E8%A3%85%E5%89%8D%E8%87%AA%E5%AE%9A%E4%B9%89-chart)
[Helm 命令集合](https://helm.sh/zh/docs/helm/helm/)
[chart 语法大全](https://helm.sh/zh/docs/chart_template_guide/getting_started/)
[helm究竟是什么](https://bbs.huaweicloud.com/blogs/280351)
[https://artifacthub.io/](https://artifacthub.io/)
[https://pkg.go.dev/text/template](https://pkg.go.dev/text/template)
[helm自建Chart仓库指南](https://helm.sh/zh/docs/topics/chart_repository/)