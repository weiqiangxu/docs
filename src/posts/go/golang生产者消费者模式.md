---
title: golang生产者消费者模式
index_img: /images/bg/golang.webp
banner_img: /images/bg/5.jpg
tags:
  - golang
categories:
  - golang
date: 2020-08-20 17:43:12
excerpt: 使用协程实现生产者消费者模式
hide: true
---

### 一、逻辑封装

``` go
package utils

import (
    "context"
    "errors"
    "fmt"
)

// ConsumerFunc param second is list.item
type ConsumerFunc func(context.Context, interface{}) error

func Run(ctx context.Context, consumerNumber int, list []interface{}, f ConsumerFunc) (chan string, error) {
    if consumerNumber == 0 {
        return nil, errors.New("consumer number must gt 0")
    }
    result := make(chan string, len(list))
    defer close(result)
    taskList := make(chan interface{}, len(list))
    defer close(taskList)
    for _, v := range list {
        taskList <- v
    }
    finishList := make(chan interface{}, len(list))
    go func() {
        for i := 0; i < consumerNumber; i++ {
            go func() {
                for v := range taskList {
                    func() {
                        defer func() {
                            finishList <- v
                        }()
                        err := f(ctx, v)
                        if err != nil {
                            result <- fmt.Sprintf("%s catch exception %s", fmt.Sprint(v), err.Error())
                        }
                    }()
                }
            }()
        }
    }()
    finishCount := 0
L:
    for {
        select {
        case <-ctx.Done():
            break L
        case <-finishList:
            finishCount++
            if finishCount == len(list) {
                break L
            }
        }
    }
    return result, nil
}
```

### 二、调用示例

``` go
package utils

import (
    "context"
    "fmt"
    "strconv"
    "testing"
    "time"
)

func C(ctx context.Context, i interface{}) error {
    z := i.(string)
    s, _ := strconv.Atoi(z)
    time.Sleep(time.Second * time.Duration(s))
    fmt.Println(i)
    return nil
}

func TestRun(t *testing.T) {
    type args struct {
        ctx            context.Context
        consumerNumber int
        list           []interface{}
        f              func(context.Context, interface{}) error
    }
    ctx, cancel := context.WithTimeout(context.Background(), time.Second*1)
    defer cancel()
    tests := []struct {
        name string
        args args
    }{
        {
            name: "test one consumer",
            args: args{
                ctx:            ctx,
                consumerNumber: 1,
                list:           []interface{}{"1", "2", "3", "1", "2", "1", "2"},
                f:              C,
            },
        },
        {
            name: "test seven consumer",
            args: args{
                ctx:            ctx,
                consumerNumber: 7,
                list:           []interface{}{"1", "2", "3", "1", "2", "1", "2"},
                f:              C,
            },
        },
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := Run(tt.args.ctx, tt.args.consumerNumber, tt.args.list, tt.args.f)
            if err != nil {
                t.Log(err)
            }
            for v := range result {
                t.Logf("%v", v)
            }
        })
    }
}
```

### 相关资料

[官方包并发消费errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup)