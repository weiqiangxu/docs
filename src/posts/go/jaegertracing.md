---
title: jaegertracing
category:
  - go
tag:
  - go
---

### 一、如何使用

1. 创建Jaeger的Tracer追踪器

```go
// InitJaeger 初始化一个opentracing.Tracer链路追踪实例
// 100%的请求都会记录跨度
// 初始化jaeger的指标
func InitJaeger(service string) (opentracing.Tracer, io.Closer) {
	cfg := &jaegerConfig.Configuration{
		ServiceName: service, // 指定了要被追踪的服务的名称
		Sampler: &jaegerConfig.SamplerConfig{
			// 采用恒定采样策略
			// 意味着对于每一个请求或操作，都会按照固定的方式决定是否进行追踪
			Type: "const",
			// 与 Type 字段配合，决定具体的采样行为
			Param: 1,
		},
		Reporter: &jaegerConfig.ReporterConfig{
			// 设置为 true，表示要记录追踪的跨度（Span）信息到日志中
			LogSpans: true,
			// 指定了 Jaeger 收集器（Collector）的端点地址
			// 追踪数据最终需要发送到 Jaeger 的收集器进行处理和存储
			// 通过设置这个字段，告诉程序将追踪数据发送到哪里
			// 指定客户端（应用程序）将追踪数据发送到的目标地址，即 Jaeger 收集器（Collector）的端点
			// TODO 客户端主动push
			//  Jaeger 的这种配置下，是客户端主动将数据推送给收集器，
			// 	这种方式使得客户端对数据的发送有更多的控制权，能够根据自身的情况（如数据量、网络状况等）来决定何时发送数据
			//	 而不是等待服务端来请求
			// TODO 需要做优化更改为kafka - 异步PUSH
			CollectorEndpoint: config.Conf.JaegerConfig.Addr,
		},
	}
	// 基于前面初始化好的配置结构体 cfg
	// 使用 NewTracer 方法来创建一个 Jaeger 追踪器（Tracer）以及一个用于关闭追踪器相关资源的函数 closer
	// jaegerConfig.Logger(jaeger.StdLogger) 是在为追踪器设置日志记录器
	tracer, closer, err := cfg.NewTracer(jaegerConfig.Logger(jaeger.StdLogger))
	if err != nil {
		logger.Fatal(err)
	}
	return tracer, closer
}

// 创建一个 Jaeger 追踪器（Tracer）
tracer, _ := InitJaeger(fmt.Sprintf("%s:%s",
		config.Conf.Application.Name,
		config.Conf.Application.Version))
```

2. 在GRPC一元调用注入拦截器(child跨度)

```go
// ClientInterceptor 记录RPC调用这个Span的执行时长
func ClientInterceptor(tracer opentracing.Tracer) grpc.UnaryClientInterceptor {
	return func(ctx context.Context, method string, req, reply interface{}, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
		// 实现一个一元调用拦截器
		// 从上下文之中获取父跨度标识
		fmt.Println("ClientInterceptor")
		parentSpan := ctx.Value(enum.TraceSpanName)
		if parentSpan != nil {
			parentSpanContext := parentSpan.(opentracing.SpanContext)
			// 在当前的http请求跨度下面创建一个子span也就是子跨度
			// 使用Jaeger 追踪器（Tracer）创建子跨度span
			child := tracer.StartSpan(
				fmt.Sprintf("grpc.request:%s", method),
				opentracing.ChildOf(parentSpanContext))
			// 调用完成以后标识此Span结束
			defer child.Finish()
		}
		return invoker(ctx, method, req, reply, cc, opts...)
	}
}
```

3. 在HTTP请求入口注入OpenTrace采集拦截器

```go
// RequestTracingInterceptor Http请求的拦截器,在请求进入后
func RequestTracingInterceptor() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// StartSpan 是 Tracer 对象的一个方法，用于启动一个新的跨度。
		span := application.App.Tracer.StartSpan(fmt.Sprintf("http.request:%s", ctx.FullPath()))
		// 获取当前 Span（跨度）对应的 SpanContext（跨度上下文）
		// SpanContext 则包含了与这个 Span 相关的关键信息，比如该 Span 的唯一标识符、所属的追踪链路、相关的标签等
		spanContext := span.Context()
		// 并且设置到context的固定Key之中(用于子模块创建child-Span)
		ctx.Set(enum.TraceSpanName, spanContext)
		// ctx.Next() 通常表示让请求处理流程继续往下进行
		ctx.Next()
		// Finish() 方法的主要功能是设置当前 Span（跨度）的结束时间戳，并完成对 Span 状态的最终确定
		// 通过 Finish() 方法来标记它的结束，记录下结束的时间点
		span.Finish()
	}
}
```

### 二、数据存储


```go
// 默认情况下创建Jaeger的客户端的时候指定的
// jaegerConfig.Configuration<Reporter.CollectorEndpoint>
// 就是收集器的端点
// client主动push到jaeger的收集器Collecter
jaegerConfig.Configuration<<Reporter.CollectorEndpoint>?
```

### 三、底层原理

1. client主动push到Jaeger的收集器Collecter
2. 怎么优化数据存储
3. 数据存储底层用的是什么数据库(运维需要注意什么)

### 相关疑问

1. opentracing是什么，定义了什么标准
2. jaegertracing的实现架构图，设计是怎么样的
3. go搭建的微服务如何接入jaegertracing做分布式追踪

- [https://opentracing.io/](https://opentracing.io/)
- [https://www.jaegertracing.io/](https://www.jaegertracing.io/)