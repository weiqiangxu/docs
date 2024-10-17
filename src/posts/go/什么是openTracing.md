---
hide: true
---
# opentracing

1. 什么是opentracing
2. 什么是jaeger
3. 如何实现服务可观测


### 启动jaeger

```
docker run -d -p 5775:5775/udp -p 16686:16686 jaegertracing/all-in-one:latest
```

[http://127.0.0.1:16686/search](http://127.0.0.1:16686/search)


### 如何注入trace到Gin

```
1. 在路由中间件StartSpan并且gin.Context.Set将parentSpan.Context往下传递
2. GRPC的client的Dial的时候注入unaryTraceInterceptor（带上全局的tracer）拦截请求的时候start child span
tips: 关于UnaryClientInterceptor的invoke，相当于middlware.next
UnaryInvoker is called by UnaryClientInterceptor to complete RPCs
命令模式关键字
```

### 相关地址

[github.com/yurishkuro/opentracing-tutorial/](https://github.com/yurishkuro/opentracing-tutorial/)

[opentracing.io/docs/getting-started/][https://opentracing.io/docs/getting-started/]

[jaegertracing.io/](https://www.jaegertracing.io/)

[https://www.cnblogs.com/whuanle/p/14598049.html](https://www.cnblogs.com/whuanle/p/14598049.html)

[go-gin-api 路由中间件 - Jaeger 链路追踪](https://www.cnblogs.com/xinliangcoder/p/11604880.html)

[github.com/xinliangnote/go-jaeger-demo](https://github.com/xinliangnote/go-jaeger-demo)