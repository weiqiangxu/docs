# pprof

> 一个用于性能分析的工具，主要用于分析程序的性能瓶颈.


### 一、适用场景

1. CPU性能分析找出占用大量CPU资源的函数
2. 找出内存分配过多或者存在内存泄漏的地方

详细的指标查看可以访问[go pprof使用指南](https://zhuanlan.zhihu.com/p/396363069)查看.

### 二、使用方式

##### 1.对某一个函数做性能数据采集

```go
func main() {
	f, _ := os.OpenFile("cpu.pprof", os.O_CREATE|os.O_RDWR, 0644)
	defer f.Close()
	pprof.StartCPUProfile(f)
	defer pprof.StopCPUProfile()
	n := 10
	for i := 0; i < 5; i++ {
		nums := generate(n)
		bubbleSort(nums)
		n *= 10
	}
}
```

```bash
$ go run main.go
```

```bash
# 使用浏览器web页面查看
$ brew install graphviz
$ go tool pprof -http=:9999 cpu.pprof
```

```bash
$ go tool pprof cpu.pprof
```


##### 2.单元测试命令行生成性能分析数据

```bash
# -blockprofile block.out
#         将协程的阻塞数据写入特定的文件（block.out）。如果-c，则写成二进制文件

# -cpuprofile cpu.out
#     将协程的CPU使用数据写入特定的文件（cpu.out）。如果-c，则写成二进制文件

# -memprofile mem.out
#     将协程的内存申请数据写入特定的文件（mem.out）。如果-c，则写成二进制文件

# -mutexprofile mutex.out
#     将协程的互斥数据写入特定的文件（mutex.out）。如果-c，则写成二进制文件

# -trace trace.out
#     将执行调用链写入特定文件（trace.out）

$ go test -run=^TestAdd$

$ go test -cpuprofile cpu.pprof -run=^TestAdd$

# 查看指标
$ go tool pprof cpu.pprof
```

##### 3.使用http接口在线查看指标

```go
package pprof_tool

import (
	"net/http/pprof"
	"github.com/gin-gonic/gin"
)

func RouteRegister(route *gin.RouterGroup, prefixOptions ...string) {
	prefix := getPrefix(prefixOptions...)
	prefixRouter := route.Group(prefix)
	{
		prefixRouter.GET("/", gin.WrapF(pprof.Index))
		prefixRouter.GET("/cmdline", gin.WrapF(pprof.Cmdline))
		prefixRouter.GET("/profile", gin.WrapF(pprof.Profile))
		prefixRouter.POST("/symbol", gin.WrapF(pprof.Symbol))
		prefixRouter.GET("/symbol", gin.WrapF(pprof.Symbol))
		prefixRouter.GET("/trace", gin.WrapF(pprof.Trace))
		prefixRouter.GET("/allocs", gin.WrapH(pprof.Handler("allocs")))
		prefixRouter.GET("/block", gin.WrapH(pprof.Handler("block")))
		prefixRouter.GET("/goroutine", gin.WrapH(pprof.Handler("goroutine")))
		prefixRouter.GET("/heap", gin.WrapH(pprof.Handler("heap")))
		prefixRouter.GET("/mutex", gin.WrapH(pprof.Handler("mutex")))
		prefixRouter.GET("/threadcreate", gin.WrapH(pprof.Handler("threadcreate")))
	}
}
```

##### 4.三方类库

```go
import (
	"github.com/pkg/profile"
)

func cpu() {
    // 采集CPU的数据指标并且生成 cpu.pprof
	defer profile.Start().Stop()
	doSomething()
}


func mem() {
    // 采集内存消耗数据
    // 这里会生成mem.pprof
	defer profile.Start(profile.MemProfile, profile.MemProfileRate(1)).Stop()
	concat(100)
}
```

### Q&A

- runtime还有哪些少见的用法但是又很有价值的

```go
runtime.Gosched()

runtime.NumGoroutine()

runtime.LockOSThread()
// 在这里可以安全地使用和线程绑定的资源
defer runtime.UnlockOSThread()
// 执行和线程相关的任务
```

### 相关文档

- [Go语言高性能编程-pprof性能分析](https://geektutu.com/post/hpg-pprof.html)
- [实用go pprof使用指南](https://zhuanlan.zhihu.com/p/396363069)