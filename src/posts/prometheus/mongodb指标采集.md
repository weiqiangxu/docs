---
title: mongodb的指标采集
index_img: /images/prometheus_icon.jpeg
banner_img: /images/bg/5.jpg
tags:
  - mongodb
  - prometheus
  - golang
categories:
  - prometheus
date: 2022-04-12 18:40:12
excerpt: 采集golang/mongodb-driver的查询数据相关的性能指标
sticky: 1
---

### 一、定义prometheus指标

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

### 二、注册mongo监听器收集指标

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

### 三、启动服务查看指标

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

### 相关资料

[https://github.com/prometheus/client_golang](https://github.com/prometheus/client_golang)