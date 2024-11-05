---
title: CRD控制器
tags:
  - kubernetes
categories:
  - kubernetes
---

#### 一、quick start

> 来个CRD控制器的QuickStart，从code gender代码生成到编译控制器，运行控制器查看监听事件，以及informer设计

``` bash
# 基于版本v1.27.2
$ git clone https://github.com/kubernetes/kubernetes.git
$ git checkout v1.27.2
$ cd /kubernetes/staging/src/k8s.io/sample-controller
```

``` bash
# 执行之前
└── samplecontroller
    ├── register.go      # 定义包package名称
    └── v1alpha1
        ├── doc.go       # 声明要使用deepconpy-gen以及groupName
        ├── register.go  # 注册资源
        └── types.go     # 定义crd资源对应的go中的结构
```

``` bash
# 执行code gender生成代码
$ cd kubernetes/staging/src/k8s.io/sample-controller && sh ./hack/update-codegen.sh
# 更改 addFunc. cache.ResourceEventHandlerFuncs.AddFunc
$ vim kubernetes/staging/src/k8s.io/sample-controller/controller.go
```

``` bash
#  代码生成后的文件
├── apis
│   └── samplecontroller
│       ├── register.go
│       └── v1alpha1
│           ├── doc.go
│           ├── register.go
│           ├── types.go
│           └── zz_generated.deepcopy.go     # 生成的深拷贝方法
├── generated                                # 生成的文件夹
│   ├── clientset                            # 与Kubernetes API交互的Go客户端库
│   ├── informers                            # Kubernetes API资源上监视和响应高级别客户端库
│   └── listers                              # 本地缓存用于资源查询
```

``` bash 
# 编译controller 设置匹配的cpu架构和os
$ go env -w GOOS="linux"
$ go env -w GOARCH="amd64"
$ cd kubernetes/staging/src/k8s.io/sample-controller && go build .
```

``` bash
# 安装k8s的环境
$ kubelet --version
Kubernetes v1.27.2
```

``` bash
# crd import
$ kubectl apply -f kubernetes/staging/src/k8s.io/sample-controller/artifacts/examples/crd.yaml
$ kubectl apply -f kubernetes/staging/src/k8s.io/sample-controller/artifacts/examples/example-foo.yaml
```

``` bash
# 启动控制器查看CRD监听事件
$ ./sample-controller  --kubeconfig=/root/.kube/config
```

### 二、客户端注册实现监听机制

``` golang
// 注册clientset客户端
// 用于生成informer启动
informers.NewSharedInformerFactory(clientset.NewForConfig(cfg)).Start(ctx)

// clientset注入控制器后启动
Controller.run()
```

### Q&A

- List-watch设计

``` txt
1. List-watch : List:http短连接；watch:http长连接；
2. Informer:
        Informer是Client-go中的一个核心工具包
        Informer实例中的Lister()方法（该方法包含 了 Get 和 List 方法） -- 可用于List/Get Kubernetes中的Object
        很少会直接请求k8s的API进行 List Get资源
3. Informer设计：
        依赖Kubernetes List/Watch API
        可监听事件并触发回调函数的二级缓存工具包
        Informer只会调用Kubernetes List和Watch两种类型的API
        List/Get Kubernetes中的Object，Informer不会去请求Kubernetes API，而是查找缓存在本地内存中的数据
        Informer完全依赖Watch API去维护缓存，没有任何resync机制
        Informer通过Kubernetes Watch API监听某种resource下的所有事件
4. Informer回调实现：ResourceEventHandler实例；OnAdd(obj interface{})、OnUpdate(oldObj, newObj interface{})、OnDelete(obj interface{})
5. Informer缓存： 二级缓存 、DeltaFIFO、LocalStore
6. Informaer: Reflect: ListerWatcher的Even丢给Reflector处理、Reflector处理后以Delta结果转入Delta_fifo
7. Indexer: 索引器、加速数据的检索
```

### 参考资料

- [https://github.com/kubernetes/kubernetes/tree/v1.27.2](https://github.com/kubernetes/kubernetes/tree/v1.27.2)
- [知乎/理解 K8S 的设计精髓之 List-Watch机制和Informer模块](https://zhuanlan.zhihu.com/p/59660536)
- [CSDN/理解K8S-Informer机制](https://blog.csdn.net/ChrisYoung95/article/details/111598273)
- [知乎/k8s之informer设计](https://zhuanlan.zhihu.com/p/416371779)
- [https://github.com/kubernetes/code-generator](https://github.com/kubernetes/code-generator)
- [code-generator简单介绍 - 写的挺好](https://juejin.cn/post/7096484178128011277)
- [https://herbguo.gitbook.io/client-go/](https://herbguo.gitbook.io/client-go/)
- [https://github.com/kubernetes/client-go 写的非常非常好](https://github.com/kubernetes/client-go)