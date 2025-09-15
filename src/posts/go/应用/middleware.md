---
title: middleware
tags:
  - gin
categories:
  - golang
---

# middleware

#### gin-middlare

> 链式调用将`handler func`注入`router`对象之中某一个`route`对象的`handler func chain`之中，中间件的概念来说是二者之间的中间人，比如请求和业务逻辑之间的管道，这个管道做数据过滤或者指标采集。

``` go
// LogInterceptor 计算请求执行时长
// 如何实现next然后回来时候统计执行时长的
func LogInterceptor() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// 开始计算执行时长
		// ctx.Next 内部开始业务逻辑
		// 本质上是逐个调用上下文注入的执行方法
		ctx.Next()
		// 业务逻辑执行完了
	}
}

// Next 执行ctx.Next()是从执行链之中走下一个执行方法
func (c *Context) Next() {
	c.index++
	for c.index < int8(len(c.handlers)) {
		c.handlers[c.index](c)
		c.index++
	}
}
```

### 相关文档

- [Gin实践](https://www.jishuchi.com/books/gin-practice)
- [open-tracing中文版](https://wu-sheng.gitbooks.io/opentracing-io/content/pages/quick-start.html)
- [Jaeger 链路追踪](https://mp.weixin.qq.com/s/28UBEsLOAHDv530ePilKQA)
- [路由中间件 - Jaeger 链路追踪](https://mp.weixin.qq.com/s/Ea28475_UTNaM9RNfgPqJA)
- [grpc实践](https://www.jishuchi.com/read/gin-practice/3886)
- [GC角度看内存损耗](https://www.jishuchi.com/read/gin-practice/3831)