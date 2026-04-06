## 一、MongoDB 指标采集概述

### 1. 为什么需要采集 MongoDB 指标

**MongoDB** 作为一种流行的 NoSQL 数据库，在生产环境中需要持续监控以确保其性能和稳定性。通过采集 MongoDB 指标，可以：

- **及时发现问题**：如慢查询、连接数过多、内存使用过高等
- **优化性能**：根据指标数据调整 MongoDB 配置
- **预测容量**：基于历史数据预测资源需求
- **确保高可用**：监控复制集和分片集群的状态
- **满足合规要求**：提供审计和监控记录

### 2. 主要监控指标类型

| 指标类型 | 描述 | 重要性 |
|---------|------|--------|
| **操作性能** | 查询、插入、更新、删除等操作的执行时间和频率 | 高 |
| **连接状态** | 活跃连接数、连接池状态、连接错误等 | 高 |
| **资源使用** | CPU、内存、磁盘 I/O、网络等资源使用情况 | 高 |
| **存储状态** | 数据库大小、集合大小、索引大小等 | 中 |
| **复制状态** | 复制延迟、 oplog 大小、同步状态等 | 高（复制集） |
| **分片状态** | 分片均衡、块分布、迁移状态等 | 高（分片集群） |
| **错误和警告** | 操作错误、连接错误、配置问题等 | 高 |

### 3. 采集方法

**常用的 MongoDB 指标采集方法**：
- **官方 MongoDB Exporter**：Prometheus 官方提供的 MongoDB 指标采集器
- **自定义监控**：使用 MongoDB 驱动的事件监听器采集指标
- **第三方监控工具**：如 Datadog、New Relic 等
- **集成监控**：如 Spring Boot Actuator、Go 应用中的 Prometheus 客户端

## 二、Go 语言采集 MongoDB 指标

### 1. 使用官方 MongoDB Exporter

**MongoDB Exporter** 是 Prometheus 官方提供的 MongoDB 指标采集器，支持采集多种 MongoDB 指标。

#### 1.1 安装和运行

```bash
# 下载
wget https://github.com/percona/mongodb_exporter/releases/download/v0.20.0/mongodb_exporter-0.20.0.linux-amd64.tar.gz

# 解压
tar xvf mongodb_exporter-0.20.0.linux-amd64.tar.gz
cd mongodb_exporter-0.20.0.linux-amd64

# 运行
./mongodb_exporter --mongodb.uri="mongodb://user:password@localhost:27017"
```

#### 1.2 配置 Prometheus

```yaml
scrape_configs:
  - job_name: 'mongodb'
    static_configs:
      - targets: ['localhost:9216']
    scrape_interval: 15s
```

### 2. 自定义指标采集

**使用 MongoDB Go 驱动的事件监听器**采集自定义指标。

#### 2.1 定义 Prometheus 指标

```go
package metrics

import (
    "github.com/prometheus/client_golang/prometheus"
)

const (
    Application = "application"
    Command     = "command"
    Database    = "database"
    Status      = "status"
)

// 操作状态
type MongoStatus string

const (
    Success MongoStatus = "success"
    Fail    MongoStatus = "fail"
)

// 操作耗时直方图
var (
    mongoOperationDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "mongodb_operations_duration_seconds",
            Help:    "MongoDB operation duration in seconds",
            Buckets: prometheus.ExponentialBuckets(0.001, 2, 10), // 1ms 到 512ms
        },
        []string{Application, Command, Database, Status},
    )

    // 操作计数
    mongoOperationCount = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "mongodb_operations_total",
            Help: "Total number of MongoDB operations",
        },
        []string{Application, Command, Database, Status},
    )
)

func init() {
    prometheus.MustRegister(mongoOperationDuration)
    prometheus.MustRegister(mongoOperationCount)
}

// RecordMongoOperation 记录 MongoDB 操作指标
func RecordMongoOperation(app, command, database string, status MongoStatus, durationSeconds float64) {
    labels := prometheus.Labels{
        Application: app,
        Command:     command,
        Database:    database,
        Status:      string(status),
    }
    mongoOperationDuration.With(labels).Observe(durationSeconds)
    mongoOperationCount.With(labels).Inc()
}
```

#### 2.2 注册 MongoDB 命令监听器

```go
package mongo

import (
    "context"
    "fmt"
    "strconv"
    "sync"
    "time"

    "go.mongodb.org/mongo-driver/event"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "go.mongodb.org/mongo-driver/mongo/readpref"

    "your-project/metrics"
)

// 请求ID到数据库名的映射
var requestIDDatabaseMap sync.Map

// NewClient 创建带指标采集的 MongoDB 客户端
func NewClient(uri string, appName string) (*mongo.Client, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // 创建命令监听器
    monitor := &event.CommandMonitor{
        Started: func(ctx context.Context, evt *event.CommandStartedEvent) {
            // 存储请求ID和数据库名的映射
            requestIDDatabaseMap.Store(strconv.FormatInt(evt.RequestID, 10), evt.DatabaseName)
        },
        Succeeded: func(ctx context.Context, evt *event.CommandSucceededEvent) {
            // 获取数据库名
            dbName := ""
            if val, ok := requestIDDatabaseMap.LoadAndDelete(strconv.FormatInt(evt.RequestID, 10)); ok {
                dbName = val.(string)
            }

            // 计算耗时
            duration := time.Duration(evt.DurationNanos) * time.Nanosecond

            // 记录指标
            metrics.RecordMongoOperation(
                appName,
                evt.CommandName,
                dbName,
                metrics.Success,
                duration.Seconds(),
            )
        },
        Failed: func(ctx context.Context, evt *event.CommandFailedEvent) {
            // 获取数据库名
            dbName := ""
            if val, ok := requestIDDatabaseMap.LoadAndDelete(strconv.FormatInt(evt.RequestID, 10)); ok {
                dbName = val.(string)
            }

            // 计算耗时
            duration := time.Duration(evt.DurationNanos) * time.Nanosecond

            // 记录指标
            metrics.RecordMongoOperation(
                appName,
                evt.CommandName,
                dbName,
                metrics.Fail,
                duration.Seconds(),
            )
        },
    }

    // 创建客户端选项
    opts := options.Client().
        ApplyURI(uri).
        SetMonitor(monitor)

    // 创建客户端
    client, err := mongo.NewClient(opts)
    if err != nil {
        return nil, fmt.Errorf("create mongo client error: %w", err)
    }

    // 连接
    if err := client.Connect(ctx); err != nil {
        return nil, fmt.Errorf("connect to mongo error: %w", err)
    }

    //  Ping 检查
    if err := client.Ping(ctx, readpref.Primary()); err != nil {
        return nil, fmt.Errorf("ping mongo error: %w", err)
    }

    return client, nil
}
```

#### 2.3 启动 Prometheus 指标端点

```go
package main

import (
    "net/http"

    "github.com/prometheus/client_golang/prometheus/promhttp"
    "your-project/mongo"
)

func main() {
    // 创建 MongoDB 客户端
    client, err := mongo.NewClient("mongodb://admin:123456@localhost:27017", "my-application")
    if err != nil {
        panic(err)
    }
    defer client.Disconnect(context.Background())

    // 提供 /metrics 端点
    http.Handle("/metrics", promhttp.Handler())
    http.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
        // 测试 MongoDB 操作
        // ...
        w.Write([]byte("OK"))
    })

    // 启动服务器
    http.ListenAndServe(":2112", nil)
}
```

### 3. 采集的指标示例

```
# HELP mongodb_operations_duration_seconds MongoDB operation duration in seconds
# TYPE mongodb_operations_duration_seconds histogram
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="0.001"} 0
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="0.002"} 1
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="0.004"} 1
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="0.008"} 1
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="0.016"} 1
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="0.032"} 1
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="0.064"} 1
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="0.128"} 1
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="0.256"} 1
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="0.512"} 1
mongodb_operations_duration_seconds_bucket{application="my-application",command="find",database="user",status="success",le="+Inf"} 1
mongodb_operations_duration_seconds_sum{application="my-application",command="find",database="user",status="success"} 0.001234
mongodb_operations_duration_seconds_count{application="my-application",command="find",database="user",status="success"} 1

# HELP mongodb_operations_total Total number of MongoDB operations
# TYPE mongodb_operations_total counter
mongodb_operations_total{application="my-application",command="find",database="user",status="success"} 1
```

## 三、Java/Spring Boot 采集 MongoDB 指标

### 1. 使用 Micrometer + Spring Boot Actuator

**Spring Boot 2.x** 内置了 Micrometer，可通过 Actuator 暴露 MongoDB 指标。

#### 1.1 依赖配置

```xml
<dependencies>
    <!-- Spring Boot Actuator -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>
    
    <!-- Micrometer Prometheus Registry -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
    </dependency>
    
    <!-- MongoDB Driver -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-mongodb</artifactId>
    </dependency>
</dependencies>
```

#### 1.2 配置 application.yml

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  metrics:
    tags:
      application: ${spring.application.name}
```

#### 1.3 自定义 MongoDB 监听器

```java
import com.mongodb.event.CommandEvent;
import com.mongodb.event.CommandFailedEvent;
import com.mongodb.event.CommandListener;
import com.mongodb.event.CommandStartedEvent;
import com.mongodb.event.CommandSucceededEvent;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Component
public class MongoMetricsCommandListener implements CommandListener {

    private final MeterRegistry registry;
    private final Map<Long, String> requestIdDatabaseMap = new ConcurrentHashMap<>();

    public MongoMetricsCommandListener(MeterRegistry registry) {
        this.registry = registry;
    }

    @Override
    public void commandStarted(CommandStartedEvent event) {
        requestIdDatabaseMap.put(event.getRequestId(), event.getDatabaseName());
    }

    @Override
    public void commandSucceeded(CommandSucceededEvent event) {
        recordMetrics(event, "SUCCESS");
    }

    @Override
    public void commandFailed(CommandFailedEvent event) {
        recordMetrics(event, "FAILED");
    }

    private void recordMetrics(CommandEvent event, String status) {
        String databaseName = requestIdDatabaseMap.remove(event.getRequestId());
        if (databaseName == null) {
            databaseName = "unknown";
        }

        Timer.builder("mongodb.operations.duration")
                .tag("command", event.getCommandName())
                .tag("database", databaseName)
                .tag("status", status)
                .tag("server", event.getConnectionDescription().getServerAddress().toString())
                .register(registry)
                .record(event.getElapsedTime(TimeUnit.NANOSECONDS), TimeUnit.NANOSECONDS);
    }
}
```

#### 1.4 注册监听器

```java
import com.mongodb.MongoClientSettings;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MongoConfiguration {

    @Bean
    public MongoClientSettings.Builder mongoClientSettingsBuilder(MeterRegistry registry, MongoMetricsCommandListener listener) {
        return MongoClientSettings.builder()
                .addCommandListener(listener);
    }
}
```

### 2. 查看采集的指标

**访问 Actuator 端点**：
```
http://localhost:8080/actuator/prometheus
```

**采集的指标示例**：

```
# HELP mongodb_operations_duration_seconds Timer of MongoDB operations
# TYPE mongodb_operations_duration_seconds histogram
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="0.001"} 0.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="0.002"} 1.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="0.004"} 1.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="0.008"} 1.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="0.016"} 1.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="0.032"} 1.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="0.064"} 1.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="0.128"} 1.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="0.256"} 1.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="0.512"} 1.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="1.0"} 1.0
mongodb_operations_duration_seconds_bucket{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS",le="+Inf"} 1.0
mongodb_operations_duration_seconds_sum{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS"} 0.001567
mongodb_operations_duration_seconds_count{application="my-app",command="find",database="user",server="localhost:27017",status="SUCCESS"} 1.0
```

## 四、Python 采集 MongoDB 指标

### 1. 使用 pymongo + prometheus_client

**Python** 可以使用 `pymongo` 驱动和 `prometheus_client` 库采集 MongoDB 指标。

#### 1.1 安装依赖

```bash
pip install pymongo prometheus_client
```

#### 1.2 实现指标采集

```python
from prometheus_client import start_http_server, Histogram, Counter
from pymongo import MongoClient
import time
import threading

# 定义指标
MONGODB_OPERATION_DURATION = Histogram(
    'mongodb_operations_duration_seconds',
    'MongoDB operation duration in seconds',
    ['application', 'command', 'database', 'status']
)

MONGODB_OPERATION_COUNT = Counter(
    'mongodb_operations_total',
    'Total number of MongoDB operations',
    ['application', 'command', 'database', 'status']
)

# 请求ID到数据库名的映射
request_id_db_map = {}
lock = threading.Lock()

class CommandListener:
    def __init__(self, app_name):
        self.app_name = app_name
    
    def started(self, event):
        with lock:
            request_id_db_map[event.request_id] = event.database_name
    
    def succeeded(self, event):
        with lock:
            db_name = request_id_db_map.pop(event.request_id, 'unknown')
        
        duration = event.duration_millis / 1000.0
        MONGODB_OPERATION_DURATION.labels(
            application=self.app_name,
            command=event.command_name,
            database=db_name,
            status='success'
        ).observe(duration)
        MONGODB_OPERATION_COUNT.labels(
            application=self.app_name,
            command=event.command_name,
            database=db_name,
            status='success'
        ).inc()
    
    def failed(self, event):
        with lock:
            db_name = request_id_db_map.pop(event.request_id, 'unknown')
        
        duration = event.duration_millis / 1000.0
        MONGODB_OPERATION_DURATION.labels(
            application=self.app_name,
            command=event.command_name,
            database=db_name,
            status='fail'
        ).observe(duration)
        MONGODB_OPERATION_COUNT.labels(
            application=self.app_name,
            command=event.command_name,
            database=db_name,
            status='fail'
        ).inc()

def main():
    # 启动 Prometheus 指标服务器
    start_http_server(8000)
    
    # 创建 MongoDB 客户端
    client = MongoClient('mongodb://admin:123456@localhost:27017')
    
    # 注册命令监听器
    listener = CommandListener('my-python-app')
    client._event_listeners.append(listener)
    
    # 测试操作
    db = client['user']
    collection = db['t_incident']
    
    while True:
        # 执行查询操作
        try:
            result = collection.find_one({})
            print(f"Query result: {result}")
        except Exception as e:
            print(f"Error: {e}")
        
        time.sleep(5)

if __name__ == '__main__':
    main()
```

## 五、MongoDB 关键指标详解

### 1. 操作性能指标

| 指标名称 | 描述 | 正常范围 | 告警阈值 |
|---------|------|---------|----------|
| `mongodb_operations_duration_seconds` | 操作执行时间 | < 100ms | > 500ms |
| `mongodb_operations_total` | 操作总次数 | - | 根据业务情况 |
| `mongodb_operations_failed_total` | 失败操作次数 | 0 | > 0 |
| `mongodb_query_execution_time` | 查询执行时间 | < 50ms | > 200ms |

### 2. 连接指标

| 指标名称 | 描述 | 正常范围 | 告警阈值 |
|---------|------|---------|----------|
| `mongodb_connections_current` | 当前连接数 | < 80% 最大连接数 | > 90% 最大连接数 |
| `mongodb_connections_available` | 可用连接数 | > 20% 最大连接数 | < 10% 最大连接数 |
| `mongodb_connections_rejected` | 被拒绝的连接数 | 0 | > 0 |

### 3. 资源使用指标

| 指标名称 | 描述 | 正常范围 | 告警阈值 |
|---------|------|---------|----------|
| `mongodb_memory_resident` | 物理内存使用 | < 80% 系统内存 | > 90% 系统内存 |
| `mongodb_memory_virtual` | 虚拟内存使用 | - | 根据系统配置 |
| `mongodb_cpu_usage` | CPU 使用率 | < 70% | > 85% |
| `mongodb_disk_io_read_bytes` | 磁盘读取字节数 | - | 根据磁盘性能 |
| `mongodb_disk_io_write_bytes` | 磁盘写入字节数 | - | 根据磁盘性能 |

### 4. 复制集指标

| 指标名称 | 描述 | 正常范围 | 告警阈值 |
|---------|------|---------|----------|
| `mongodb_repl_lag_seconds` | 复制延迟 | < 10s | > 30s |
| `mongodb_repl_oplog_window_seconds` | Oplog 窗口大小 | > 24h | < 1h |
| `mongodb_repl_members` | 复制集成员数 | 根据配置 | < 配置数量 |
| `mongodb_repl_primary` | 主节点状态 | 1 | 0 或 > 1 |

### 5. 分片集群指标

| 指标名称 | 描述 | 正常范围 | 告警阈值 |
|---------|------|---------|----------|
| `mongodb_shard_chunks` | 分片块数量 | - | 根据数据量 |
| `mongodb_shard_balancer_active` | 均衡器状态 | 0 或 1 | - |
| `mongodb_shard_migrations` | 块迁移数量 | 0 (稳定状态) | > 0 (长时间) |

## 六、MongoDB 指标可视化

### 1. Grafana 面板

**推荐使用 Grafana** 可视化 MongoDB 指标，可使用以下面板：

#### 1.1 官方 MongoDB 面板

- **MongoDB Overview**：整体状态概览
- **MongoDB Operations**：操作性能分析
- **MongoDB Replication**：复制集状态监控
- **MongoDB Sharding**：分片集群监控

#### 1.2 自定义面板

**关键指标面板**：
- **操作性能**：查询、插入、更新、删除的执行时间和频率
- **连接状态**：当前连接数、连接池状态
- **资源使用**：CPU、内存、磁盘 I/O 使用情况
- **复制状态**：复制延迟、Oplog 大小
- **错误率**：操作失败率、连接错误率

### 2. 示例 Dashboard

```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "custom": {}
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 2,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.3.7",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "rate(mongodb_operations_total[5m])",
          "legendFormat": "{{command}}",
          "refId": "A"
        }
      ],
      "thresholds": [],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "MongoDB Operations Rate",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "ops",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": "0",
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    }
  ],
  "refresh": "10s",
  "schemaVersion": 26,
  "style": "dark",
  "tags": ["mongodb"],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "MongoDB Monitoring",
  "uid": "mongodb-monitoring",
  "version": 1
}
```

## 七、MongoDB 指标告警

### 1. 告警规则配置

**Prometheus 告警规则**示例：

```yaml
groups:
- name: mongodb-alerts
  rules:
  # 操作执行时间过长
  - alert: MongoDBOperationSlow
    expr: histogram_quantile(0.95, sum(rate(mongodb_operations_duration_seconds_bucket[5m])) by (le, command, database)) > 0.5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Slow MongoDB operation"
      description: "95th percentile operation duration for {{ $labels.command }} in {{ $labels.database }} is {{ $value }} seconds"

  # 连接数过多
  - alert: MongoDBConnectionLimit
    expr: mongodb_connections_current / mongodb_connections_available > 0.9
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "MongoDB connection limit"
      description: "MongoDB connection usage is {{ $value | humanizePercentage }} of available connections"

  # 复制延迟过高
  - alert: MongoDBReplicationLag
    expr: mongodb_repl_lag_seconds > 30
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "MongoDB replication lag"
      description: "Replication lag is {{ $value }} seconds"

  # 操作失败率过高
  - alert: MongoDBOperationFailure
    expr: rate(mongodb_operations_total{status="fail"}[5m]) / rate(mongodb_operations_total[5m]) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "MongoDB operation failure rate"
      description: "Failure rate is {{ $value | humanizePercentage }}"
```

### 2. 告警通知渠道

**配置 AlertManager** 发送告警通知：

```yaml
receivers:
- name: 'mongodb-team'
  email_configs:
  - to: 'mongodb-team@example.com'
    send_resolved: true
  slack_configs:
  - channel: '#mongodb-alerts'
    send_resolved: true

route:
  group_by: ['alertname', 'database', 'command']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'mongodb-team'
  routes:
  - match:
      severity: critical
    receiver: 'mongodb-team-pager'
```

## 八、最佳实践

### 1. 指标采集最佳实践

- **合理设置采集间隔**：根据业务需求设置适当的采集间隔，一般为 15-30 秒
- **选择合适的指标**：只采集必要的指标，避免采集过多无用指标
- **使用标签区分**：使用标签区分不同的应用、数据库、命令等
- **设置合理的桶**：为直方图指标设置合理的桶，以便准确反映操作时间分布
- **监控自身**：监控指标采集服务本身的健康状态

### 2. 性能优化

- **使用连接池**：合理配置 MongoDB 连接池大小
- **索引优化**：为常用查询创建适当的索引
- **查询优化**：避免全表扫描和复杂查询
- **数据分片**：对于大数据集，使用分片集群
- **定期维护**：定期进行数据库维护，如压缩、索引重建等

### 3. 高可用配置

- **复制集**：使用复制集提高可用性
- **监控复制状态**：密切监控复制延迟和 oplog 大小
- **自动故障转移**：确保复制集配置了自动故障转移
- **备份策略**：定期备份数据，确保数据安全

### 4. 安全考虑

- **认证和授权**：启用 MongoDB 认证和授权
- **网络隔离**：使用网络隔离保护 MongoDB 实例
- **加密**：启用传输加密和静态加密
- **审计**：启用审计日志，记录操作历史

## 九、常见问题与解决方案

### 1. 指标采集失败

**可能原因**：
- MongoDB 连接失败
- 权限不足
- 网络问题

**解决方案**：
- 检查 MongoDB 连接字符串
- 确保用户有足够的权限
- 检查网络连接和防火墙设置

### 2. 指标数据不准确

**可能原因**：
- 采集间隔不合理
- 指标定义错误
- 标签使用不当

**解决方案**：
- 调整采集间隔
- 检查指标定义和计算方法
- 统一标签使用规范

### 3. 性能影响

**可能原因**：
- 采集频率过高
- 指标数量过多
- 监听器开销

**解决方案**：
- 降低采集频率
- 减少不必要的指标
- 优化监听器实现

### 4. 告警误报

**可能原因**：
- 阈值设置不合理
- 采集数据波动
- 业务高峰期

**解决方案**：
- 调整告警阈值
- 使用合适的 for  duration
- 考虑业务周期

### 5. 存储问题

**可能原因**：
- 指标数据增长过快
- Prometheus 存储配置不当

**解决方案**：
- 设置合理的 retention 时间
- 使用远程存储
- 实现指标聚合

## 十、总结

### 1. 核心要点

- **MongoDB 指标采集**是确保数据库性能和稳定性的关键
- **多种采集方法**：官方 Exporter、自定义监听器、第三方工具
- **关键指标**：操作性能、连接状态、资源使用、复制状态
- **可视化和告警**：使用 Grafana 可视化，Prometheus 告警
- **最佳实践**：合理配置、性能优化、高可用设置

### 2. 实践建议

- **全面监控**：覆盖所有关键指标
- **分层告警**：根据严重程度设置不同级别的告警
- **定期分析**：定期分析指标数据，优化数据库性能
- **持续改进**：根据业务发展调整监控策略
- **自动化**：实现监控和告警的自动化管理

### 3. 未来发展

- **智能化监控**：使用机器学习预测性能问题
- **一体化监控**：集成 MongoDB 监控到整体系统监控
- **云原生监控**：适应云环境的监控方案
- **实时分析**：实时分析 MongoDB 性能数据

通过有效的 MongoDB 指标采集和监控，可以及时发现并解决问题，确保数据库的稳定运行，为业务提供可靠的数据服务。

## 参考资料

- [MongoDB 官方文档](https://docs.mongodb.com/manual/monitoring/)
- [Prometheus MongoDB Exporter](https://github.com/percona/mongodb_exporter)
- [Spring Boot Actuator 文档](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Micrometer 文档](https://micrometer.io/docs)
- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana 官方文档](https://grafana.com/docs/)
- [MongoDB Go Driver 文档](https://pkg.go.dev/go.mongodb.org/mongo-driver)
- [PyMongo 文档](https://pymongo.readthedocs.io/)
