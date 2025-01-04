---
title: jaegertracing
category:
  - go
tag:
  - go
---

### 一、如何使用

##### 1.创建Jaeger的Tracer追踪器

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

      // 可选项
      // 如果不配置CollectorEndpoint的话就需要配置这个Agent代理人端口
      // jaeger-agent会接收这些数据，进行缓冲和批量处理后，再发送给jaeger-collector
      // 将数据发送到jaeger - agent的6831/udp端口
      LocalAgentHostPort: "127.0.0.1:6831",
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

##### 2.在GRPC一元调用注入拦截器(child跨度)

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

##### 3.在HTTP请求入口注入OpenTrace采集拦截器

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

```bash
# http://localhost:16686/ 查看Jaeger的指标数据
# http://127.0.0.1:14268/api/traces 是Jaeger的Collector的端点Endpoints
# 14268这个端口是jaeger-collector用于接收通过 HTTP 发送的追踪数据的端口
$ docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \
  -p 16686:16686 \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 14250:14250 \
  -p 14268:14268 \
  -p 14269:14269 \
  -p 9411:9411 \
  jaegertracing/all-in-one:1.63.0
```

```bash
# 1.代理人
# Jaeger-agent 主要充当数据收集代理的角色
# 负责接收来自应用程序（通过 Jaeger 客户端库）发送的追踪数据
# Jaeger-agent 会将这些数据收集起来，形成批量后再发送给 Jaeger收集器（Jaeger Collector）
jaeger-agent	    hub.docker.com/r/jaegertracing/jaeger-agent/

# 2.收集器
# client产生追踪信息后推送到Collector的Endpoint之中
# 可以指定写入到Kafka
jaeger-collector	hub.docker.com/r/jaegertracing/jaeger-collector/


# 3.查询器
# 提供 API 端点和 React/Javascript UI 用于查看采集到的数据
jaeger-query	    hub.docker.com/r/jaegertracing/jaeger-query/ 

# 4.摄取者
# 一种从 Kafka 主题读取跨度数据并将其写入另一个存储后端（Elasticsearch 或 Cassandra）的服务。
jaeger-ingester	  hub.docker.com/r/jaegertracing/jaeger-ingester/ 
```

##### 4.如何部署Jaeger做数据分析和存储

1. 代理人


```bash
## 启动agent代理
# 可以直接通过--reporter.grpc.host-port配置Collector负载的域名
docker run \
  --rm \
  -p5775:5775/udp \
  -p6831:6831/udp \
  -p6832:6832/udp \
  -p5778:5778/tcp \
  jaegertracing/jaeger-agent:1.21.0 \
  --reporter.grpc.host-port=jaeger-collector.jaeger-infra.svc:14250
```


2. 收集者

```bash
# Kafka 可用作收集器和实际存储之间的中间缓冲区
# 收集器 Collector 配置为SPAN_STORAGE_TYPE=kafka将所有收到的跨度写入 Kafka 主题
docker run \
  -e SPAN_STORAGE_TYPE=kafka \
  -e KAFKA_PRODUCER_BROKERS=<...> \
  -e KAFKA_TOPIC=<...> \
  jaegertracing/jaeger-collector:1.21.0
```

```yaml
# Elastic的索引别名、索引和索引模板初始化支持滚动更新
# jaegertracing/jaeger-es-rollover

# 将kafka的数据load到Elasticsearch
# jaeger-ingester-config.yaml
ingester:
  kafka:
    brokers: "kafka:9092"
    topic: "jaeger-traces-topic"
  elasticsearch:
    servers: "http://elasticsearch:9200"
    index-name: "jaeger-traces-index"
```

```bash
# 启动jaeger-ingester将kafka的数据load到elasticsearch
docker run -d --name jaeger-ingester \
  --network jaeger-network \
  -v $(pwd)/jaeger-ingester-config.yaml:/etc/jaeger-ingester/config.yaml \
  jaegertracing/jaeger-ingester
```

3. 查询器

```bash
# 部署查询器并且指定后端存储是Elastic
docker run -d --rm \
  -p 16686:16686 \
  -p 16687:16687 \
  -e SPAN_STORAGE_TYPE=elasticsearch \
  -e ES_SERVER_URLS=http://<ES_SERVER_IP>:<ES_SERVER_PORT> \
  jaegertracing/jaeger-query:1.21.0
```


### 二、数据存储

```go
// 默认情况下创建Jaeger的客户端的时候指定的
// jaegerConfig.Configuration<Reporter.CollectorEndpoint>
// 就是收集器的端点
// client主动push到jaeger的收集器Collecter
jaegerConfig.Configuration<<Reporter.CollectorEndpoint>>
```

1. Kafka
2. Elasticsearch



### 三、Opentracing

1. 什么是opentracing

	OpenTracing 是一个用于分布式追踪的开源标准和工具集。提供了一种标准的方式来追踪请求在这些服务中的完整路径，包括每个服务的处理时间、调用顺序、是否出现错误等信息。
	Span（跨度）一个逻辑工作单元、Trace（追踪）一系列相关的 Span 组成，代表了一个完整的请求处理流程、Tracer（追踪器）创建、管理和报告 Span 和 Trace。


2. jaegertracing是怎样将trace里面的各个span串起来的

	一个请求追踪的全局唯一标识符（`Trace ID`）。处理流程的多个Span都共享这个`Trace ID`。`Span ID`用于唯一标识每个单独的 `Span`,而`Parent Span ID`则用于建立`Span`之间的父子关系。将`Span`上下文信息（如`Trace ID`、`Span ID`和`Parent Span ID`）编码并添加到`HTTP`请求头中。
	
	> 主要是`context`的`parent span id`串起来. 链路追踪之中很多时候是分两步注入`Inject Span`上下文,提取`Extract Parent Span`上下文然后用于`Tracer.StartSpan`.

### Q&A

1. client推送数据怎么提升速度

    异步推送、可以发送到代理人jaeger-agent，代理人会自动做批量发送到收集者Collector，收集者可以使用kafka做缓冲，再通过jaeger-ingester摄取者从kafka加载到Elasticsearch，jaeger-query从Elastic读取数据提升查询速度。
    Agent批量发送、Kafka做异步缓冲、Elastic做数据存储。

2. client可以直接将数据推送到Collector或者jaeger-agent代理人

### 相关疑问

1. opentracing是什么，定义了什么标准
2. jaegertracing的实现架构图，设计是怎么样的
3. go搭建的微服务如何接入jaegertracing做分布式追踪

- [https://opentracing.io/](https://opentracing.io/)
- [https://www.jaegertracing.io/](https://www.jaegertracing.io/)
- [https://www.jaegertracing.io/docs/1.21/deployment/](https://www.jaegertracing.io/docs/1.21/deployment/)
- [github.com/yurishkuro/opentracing-tutorial/](https://github.com/yurishkuro/opentracing-tutorial/)
- [opentracing.io/docs/getting-started/][https://opentracing.io/docs/getting-started/]
- [jaegertracing.io/](https://www.jaegertracing.io/)
- [JaegerClientGo链路追踪|](https://www.cnblogs.com/whuanle/p/14598049.html)
- [go-gin-api路由中间件-Jaeger 链路追踪](https://www.cnblogs.com/xinliangcoder/p/11604880.html)
- [github.com/xinliangnote/go-jaeger-demo](https://github.com/xinliangnote/go-jaeger-demo)