---
title: mongodb指标
tags:
  - mongodb
  - prometheus
categories:
  - prometheus
---

### 一、Go采集MongoDB指标

##### 1.定义prometheus指标

``` go
package tool

import (
    "github.com/prometheus/client_golang/prometheus"
)

const Application = "application"
const Command = "command"
const Database = "database"
const RequestID = "request_id"
const Status = "status"

type MongoStatusEnum string

const (
    Success MongoStatusEnum = "success"
    Fail    MongoStatusEnum = "fail"
    Start   MongoStatusEnum = "start"
)

var (
    mongoHistogram = prometheus.NewHistogramVec(prometheus.HistogramOpts{
        Name:    "mongodb_operations_duration_seconds",
        Help:    "mongodb command record",
        Buckets: []float64{0.1, 0.5, 1.0, 1.5, 3.0, 5.0, 10.0},
    }, []string{Application, Command, Database, RequestID, Status})
)

func init() {
    prometheus.MustRegister(mongoHistogram)
}

func AddMetrics(labels prometheus.Labels, speed float64) {
    mongoHistogram.With(labels).Observe(speed)
}
```

##### 2.注册mongo监听器收集指标

``` go
import (
    "context"
    "encoding/json"
    "fmt"
    "github.com/gogf/gf/util/gconv"
    "github.com/pkg/errors"
    "github.com/prometheus/client_golang/prometheus"
    "strconv"
    "sync"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/event"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "go.mongodb.org/mongo-driver/mongo/readpref"
    "log"
    "net/http"
    "time"
)

var RequestIDDatabaseNameMap sync.Map

func Client() *mongo.Client {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    opt := new(options.ClientOptions)
    opt.ApplyURI("mongodb://admin:123456@127.0.0.1:27017/?authSource=admin")
    m := new(event.CommandMonitor)
    m.Started = func(ctx context.Context, startedEvent *event.CommandStartedEvent) {
        RequestIDDatabaseNameMap.Store(strconv.FormatInt(startedEvent.RequestID, 10), startedEvent.DatabaseName)
    }
    m.Succeeded = func(ctx context.Context, succeededEvent *event.CommandSucceededEvent) {
        l := prometheus.Labels{}
        l[Application] = "one"
        l[Command] = succeededEvent.CommandName
        databaseName := ""
        tmp, exist := RequestIDDatabaseNameMap.LoadAndDelete(strconv.FormatInt(succeededEvent.RequestID, 10))
        if exist {
            databaseName = gconv.String(tmp)
        }
        l[Database] = databaseName
        l[Status] = gconv.String(Success)
        l[RequestID] = strconv.FormatInt(succeededEvent.RequestID, 10)
        t, e := time.ParseDuration(fmt.Sprintf("%sns", gconv.String(succeededEvent.DurationNanos)))
        if e != nil {
            panic(e)
        }
        AddMetrics(l, t.Seconds())
    }
    m.Failed = func(ctx context.Context, failedEvent *event.CommandFailedEvent) {
        l := prometheus.Labels{}
        l[Application] = "one"
        l[Command] = failedEvent.CommandName
        databaseName := ""
        tmp, exist := RequestIDDatabaseNameMap.LoadAndDelete(strconv.FormatInt(failedEvent.RequestID, 10))
        if exist {
            databaseName = gconv.String(tmp)
        }
        l[Database] = databaseName
        l[Status] = gconv.String(Fail)
        l[RequestID] = strconv.FormatInt(failedEvent.RequestID, 10)
        t, e := time.ParseDuration(fmt.Sprintf("%sns", gconv.String(failedEvent.DurationNanos)))
        if e != nil {
            panic(e)
        }
        AddMetrics(l, t.Seconds())
    }
    opt.Monitor = m
    client, err := mongo.NewClient(opt)
    if err != nil {
        panic(err)
    }
    err = client.Connect(ctx)
    if err != nil {
        panic(errors.Wrap(err, "connect mongo error"))
    }
    ctx, cancel = context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    err = client.Ping(ctx, readpref.Primary())
    if err != nil {
        panic(errors.Wrap(err, "ping mongo error"))
    }
    return client
}


func find(c *mongo.Client) string {
    _, ee := c.ListDatabases(context.Background(), bson.D{})
    if ee != nil {
        log.Fatalf("list database %s", ee.Error())
    }
    log.Printf("database is %s", c.Database("user").Name())
    ff, _ := c.Database("user").ListCollectionNames(context.Background(), bson.D{})
    dd, _ := json.Marshal(ff)
    fmt.Println(string(dd))
    collection := c.Database("user").Collection("t_incident")
    var result bson.M
    e := collection.FindOne(context.Background(), bson.D{}).Decode(&result)
    if e != nil {
        log.Fatalf("find one %s", e.Error())
    }
    s, _ := json.Marshal(result)
    return string(s)
}

type Handler struct {
}

func (m *Handler) ServeHTTP(r http.ResponseWriter, q *http.Request) {
    s := find(Client())
    result := []byte(s)
    _, e := r.Write(result)
    if e != nil {
        log.Fatal(e)
    }
}
```

##### 3.启动服务查看指标

``` go
package main

import (
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "net/http"
    "sangfor.com/tool"
)

func main() {
    //提供 /metrics HTTP 端点
    http.Handle("/metrics", promhttp.Handler())
    http.Handle("/get", new(tool.Handler))
    //端口号
    http.ListenAndServe(":2112", nil)
}
```

### 二、Springboot-MongoDB指标


##### 1.定义mongo监听器指标采集

``` java
import com.mongodb.event.*;
import io.micrometer.core.annotation.Incubating;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.lang.NonNullApi;
import io.micrometer.core.lang.NonNullFields;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * todo {这里必须加注释}
 *
 * @author xuweiqiang
 * @version 2.0.0
 * @date 2022/7/25 9:50
 */
@NonNullApi
@NonNullFields
@Incubating(since = "1.2.0")
public class MyMongoMetricsCommandListener implements CommandListener {

    private String database;

    private final Timer.Builder timerBuilder = Timer.builder("mongo.operations.duration")
            .description("Timer of mongodb commands");

    private final MeterRegistry registry;

    public MyMongoMetricsCommandListener(MeterRegistry registry,String database) {
        this.registry = registry;
        this.database = database;
    }

    @Override
    public void commandStarted(CommandStartedEvent commandStartedEvent) {
        String d = commandStartedEvent.getDatabaseName();
        MongoRequestIdShareHolder.set(String.valueOf(commandStartedEvent.getRequestId()),d);
    }

    @Override
    public void commandSucceeded(CommandSucceededEvent event) {
        timeCommand(event, "SUCCESS", event.getElapsedTime(TimeUnit.NANOSECONDS));
    }

    @Override
    public void commandFailed(CommandFailedEvent event) {
        timeCommand(event, "FAILED", event.getElapsedTime(TimeUnit.NANOSECONDS));
    }

    private void timeCommand(CommandEvent event, String status, long elapsedTimeInNanoseconds) {
        String d = "";
        if (event instanceof CommandSucceededEvent || event instanceof CommandFailedEvent){
            d = MongoRequestIdShareHolder.get(String.valueOf(event.getRequestId()));
            MongoRequestIdShareHolder.remove(String.valueOf(event.getRequestId()));
        }
        timerBuilder
                .publishPercentileHistogram()
                .minimumExpectedValue(Duration.ofSeconds(10))
                .maximumExpectedValue(Duration.ofSeconds(10))
                .serviceLevelObjectives(
                        Duration.ofMillis(100),
                        Duration.ofMillis(500),
                        Duration.ofMillis(1000),
                        Duration.ofMillis(1500),
                        Duration.ofSeconds(3),
                        Duration.ofSeconds(5)
                )
                .tag("database",d)
                .tag("request_id", String.valueOf(event.getRequestId()))
                .tag("command", event.getCommandName())
                //.tag("cluster.id", event.getConnectionDescription().getConnectionId().getServerId().getClusterId().getValue())
                .tag("server.address", event.getConnectionDescription().getServerAddress().toString())
                .tag("status", status)
                .register(registry)
                .record(elapsedTimeInNanoseconds, TimeUnit.NANOSECONDS);
    }
}
```

##### 2.注册监听器

``` java
import cn.hutool.json.JSONUtil;
import com.example.one.listener.MyMongoMetricsCommandListener;
import com.mongodb.Block;
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.connection.ConnectionPoolSettings;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.mongodb.MongoMetricsCommandListener;
import io.micrometer.core.instrument.binder.mongodb.MongoMetricsConnectionPoolListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.mongo.MongoClientFactory;
import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.boot.autoconfigure.mongo.MongoProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.data.mongodb.core.MongoClientFactoryBean;

@Configuration
public class MongoConfiguration {
    /**
     * register
     *
     * @param meterRegistry me
     * @return https://stackoverflow.com/questions/60991985/spring-boot-micrometer-metrics-for-mongodb
     */
    @Bean
    public MongoClientSettingsBuilderCustomizer mongoClientSettingsBuilderCustomizer(MeterRegistry meterRegistry) {
        Block<ConnectionPoolSettings.Builder> z = b -> b.addConnectionPoolListener(new MongoMetricsConnectionPoolListener(meterRegistry));
        return builder -> builder.applyToConnectionPoolSettings(z).addCommandListener(new MyMongoMetricsCommandListener(meterRegistry,""));
    }
}
```

##### 3.查看采集到的指标

``` txt
# HELP mongodb_driver_commands_seconds_max Timer of mongodb commands
# TYPE mongodb_driver_commands_seconds_max gauge
mongodb_driver_commands_seconds_max{application="one",cluster_id="xxx"} 0.
```

### 相关资料

- [https://github.com/prometheus/client_golang](https://github.com/prometheus/client_golang)