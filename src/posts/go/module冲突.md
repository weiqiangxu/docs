---
title: module冲突
tags:
  - golang
categories:
  - golang
---

### 一、由于依赖包k8s.io/apimachinery@latest不兼容company/client-go/cache导致的冲突

``` bash

# 包company/client-go/cache与k8s.io/apimachinery@latest不兼容
# 需要指定k8s.io/apimachinery的版本为旧版 (默认会指向最新版)
# 并且k8s.io/api@latest也依赖了k8s.io/apimachinery@latest
# 所以k8s.io也需要指定旧版

company-nvs/internal/vnetstore imports
company/client-go/cache imports
	k8s.io/apimachinery/pkg/util/clock: 
	module k8s.io/apimachinery@latest found (v0.27.3),
	but does not contain package k8s.io/apimachinery/pkg/util/clock
```


![go module冲突](/images/conflict-package.png)

> 解决问题的关键在于指定k8s.io/apimachinery和k8s.io/api的版本，但是很难找出k8s.io/api的版本问题


### 二、解决包冲突的方式

##### 1.指定包`apimachinery`版本，看`k8s.io/client-go`和`company/client-go`都兼容

``` bash
# 手动指定版本依赖
$ go mod edit -require k8s.io/apimachinery@v0.22.4
```

``` yml
module new_kube

go 1.20

require (
	gitlab.company.net/company/client-go v0.22.21
    // 手动指定的版本
	k8s.io/apimachinery v0.22.4
	k8s.io v0.22.4
)

// go mod tidy自动整理的依赖
require (
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/go-logr/logr v1.2.0 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
)
```

``` bash
# 查看依赖关系
go mod graph | grep apimachinery
go help mod
``` 

```shell
# 清理已下载的模块缓存
# 该命令会删除 `$GOPATH/pkg/mod/cache` 目录下的所有缓存文件
go clean -modcache

# 清理未使用的模块缓存
# 该命令会检查项目中的依赖，并清理掉没有使用的模块缓存
go mod tidy

# 将 `<module>` 替换为具体的模块路径，该命令会删除指定模块的缓存
# Go mod 的缓存是全局的，清理缓存可能会导致其他项目的构建时间增长
go clean -modcache -i <module>
```


##### 2.更新`company/client-go`依赖的`apimachinery`版本

就是更改`company/client-go`的代码，让其兼容`apimachinery@latest`;


##### 3.有时候无论怎么指定版本都无法生效

``` bash
# 比如明明指定版本 k8s.io/apimachinery v0.22.4
# 但是 go mod tidy时候却是 k8s.io/apimachinery v0.27.4
# 这是因为有其他包依赖了 @v0.27.4


# 查看依赖关系
$ go mod graph > a.txt

# 有下面一行
# 是因为api版本27.4依赖了apimachinery@v0.27.4
k8s.io/api@v0.27.4 k8s.io/apimachinery@v0.27.4

# 所以指定使用才可以解决问题
k8s.io/api@v0.22.4
```


#### 三、一些经验

1. 直接依赖和间接依赖
   
``` bash
# 没有 indirect 的是直接依赖，可以直接后面的version指定版本
# 也可以通过 replace 指定版本
# indirect 是间接依赖会跟随着直接依赖的包升级而升级间接依赖
require (
	github.com/bytedance/sonic v1.9.1 // indirect
)
```

2. 如何找出直接依赖的包的位置

> 项目代码直接全局走索

3. 如何找出间接依赖的包的引用位置

``` bash
go mod why go.uber.org/multierr
go mod graph
```


### 相关文档

- [go mod tidy module x found, but does not contain package x](https://budougumi0617.github.io/2019/09/20/fix-go-mod-tidy-does-not-contain-package/)
- [Gin实践](https://www.jishuchi.com/books/gin-practice)
- [open-tracing中文版](https://wu-sheng.gitbooks.io/opentracing-io/content/pages/quick-start.html)
- [Jaeger 链路追踪](https://mp.weixin.qq.com/s/28UBEsLOAHDv530ePilKQA)
- [路由中间件 - Jaeger 链路追踪](https://mp.weixin.qq.com/s/Ea28475_UTNaM9RNfgPqJA)
- [grpc实践](https://www.jishuchi.com/read/gin-practice/3886)
- [GC角度看内存损耗](https://www.jishuchi.com/read/gin-practice/3831)