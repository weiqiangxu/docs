---
title: moddleware底层实现原理
index_img: /images/bg/文章通用.png
tags:
  - gin
categories:
  - golang
date: 2023-04-11 09:40:12
excerpt: gin的中间件实现原理
hide: true
---

# middlare如何实现next然后回来时候统计执行时长的

> 责任链模式将handler func注入router对象之中某一个route对象的handler func chain之中

``` go
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