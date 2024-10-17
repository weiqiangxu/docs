---
title: springboot的mongodb指标
index_img: /images/prometheus_icon.jpeg
banner_img: /images/bg/5.jpg
tags:
  - springboot
  - mongodb
  - prometheus
  - java
categories:
  - prometheus
date: 2022-07-26 10:13:01
sticky: 1
---

### 一、定义mongo监听器指标采集
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

### 二、注册监听器

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

### 三、查看采集到的指标

``` txt
# HELP mongodb_driver_commands_seconds_max Timer of mongodb commands
# TYPE mongodb_driver_commands_seconds_max gauge
mongodb_driver_commands_seconds_max{application="one",cluster_id="xxx"} 0.
```