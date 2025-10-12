---
title: mybatis监控指标
tags:
  - mongodb
  - prometheus
categories:
  - prometheus
---

### 一、定义各个prometheus指标

``` java
public class MybatisMetrics {

    private static final String[] labelNames = new String[] { "class", "command", "status" };

    public static final Counter QUERY_COUNT = Counter.build()
            .name("mybatis_requests_total").help("total sql command.")
            .labelNames(labelNames).register();

    public static final Gauge QUERY_MAX = Gauge.build()
            .name("mybatis_requests_max").help("run sql command latency in seconds.")
            .labelNames(labelNames).register();

    public static final Summary QUERY_SUMMARY = Summary.build()
            .name("mybatis_latency_seconds").help("Request latency in seconds.").labelNames(labelNames)
            .register();

}
```

### 二、将指标注册到prometheus收集器

``` java
@Component
public class PrometheusConfigation {
    @Autowired
    private CollectorRegistry collectorRegistry;

    @PostConstruct
    public void init() {
        /**
         * 自定义指标
         */
        MybatisMetrics.QUERY_COUNT.register(collectorRegistry);
        MybatisMetrics.QUERY_MAX.register(collectorRegistry);
        MybatisMetrics.QUERY_SUMMARY.register(collectorRegistry);
    }
}
```

### 三、定义mybatis的拦截器收集SQL COMMAND信息
``` java
@SuppressWarnings({"rawtypes"})
@Intercepts(
    {
        @Signature(type = Executor.class, method = "update", args = { MappedStatement.class, Object.class}),
        @Signature(type = Executor.class, method = "query", args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class}),
        @Signature(type = Executor.class, method = "query", args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class, CacheKey.class, BoundSql.class}),
    }
)
public class MyBatisInterceptor implements Interceptor {

    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        final Object[] args = invocation.getArgs();
        if (args != null && args.length > 0) {
            final MappedStatement mappedStatement = (MappedStatement) args[0];
            if (mappedStatement != null) {
                final String className = mappedStatement.getId();
                final String command = mappedStatement.getSqlCommandType().name();
                String status = "";
                //以类名和方法名为标签
                String[] labelValues = new String[3];
                labelValues[0] = className;
                labelValues[1] = command;
                labelValues[2] = status;
                SimpleTimer startTimer = new SimpleTimer();
                try {
                    status = MybatisMetricsStatusEnum.success.getCode();
                    return invocation.proceed();
                } catch (Throwable throwable) {
                    status = MybatisMetricsStatusEnum.fail.getCode();
                    throw throwable;
                } finally {
                    labelValues[2] = status;
                    MybatisMetrics.QUERY_MAX.labels(labelValues).set(startTimer.elapsedSeconds());
                    MybatisMetrics.QUERY_SUMMARY.labels(labelValues).observe(startTimer.elapsedSeconds());
                    MybatisMetrics.QUERY_COUNT.labels(labelValues).inc();
                }
            }
        }
        return invocation.proceed();
    }

    @Override
    public Object plugin(Object target) {
        if (target instanceof Executor || target instanceof StatementHandler) {
            return Plugin.wrap(target, this);
        }
        return target;
    }

    @Override
    public void setProperties(Properties properties) {
    }
}
```

### 四、注册拦截器到Mybatis

``` java
@Configuration
public class MybatisConfig {
    @Bean
    public ConfigurationCustomizer mybatisConfigurationCustomizer() {
        return configuration -> configuration.addInterceptor(new MyBatisInterceptor());
    }
}
```

### 五、查看收集到的指标

``` txt
# 请求次数和总时长
# HELP mybatis_latency_seconds Request latency in seconds.
# TYPE mybatis_latency_seconds summary
mybatis_latency_seconds_count{class="com.example.one",command="SELECT",status="fail",} 1.0
mybatis_latency_seconds_count{class="com.example.one",command="SELECT",status="success",} 4.0
```