---
title: 优雅拼接URL
tags:
  - golang
categories:
  - golang
---

### 一、代码

``` go
package tool

import (
	"errors"
	"fmt"
	"net/url"
	"reflect"
)

// QueryRange 范围查找结构体
type QueryRange struct {
	Query string `json:"query"`
	Start int64  `json:"start"`
	End   int64  `json:"end"`
	Step  int    `json:"step"`
}

// GetStructTag 获取结构体标签
func GetStructTag(s interface{}) (map[string]string, error) {
	getValue := reflect.ValueOf(s)
	if getValue.Kind() != reflect.Struct {
		return nil, errors.New("not struct")
	}
	getType := reflect.TypeOf(s)
	t := map[string]string{}
	for i := 0; i < getValue.NumField(); i++ {
		t[getType.Field(i).Name] = getType.Field(i).Tag.Get("json")
	}
	return t, nil
}

// BuildURLByStruct build url
func BuildURLByStruct(path string, queryRange *QueryRange) (string, error) {
	if queryRange == nil {
		return "", errors.New("query range is nil")
	}
	tagMap, err := GetStructTag(*queryRange)
	if err != nil {
		return "", err
	}
	getValue := reflect.ValueOf(*queryRange)
	urlParamMap := url.Values{}
	for k, v := range tagMap {
		urlParamMap.Set(v, fmt.Sprintf("%v", getValue.FieldByName(k).Interface()))
	}
	base, err := url.Parse(path)
	if err != nil {
		return "", err
	}
	base.RawQuery = urlParamMap.Encode()
	return base.String(), nil
}

```

### 二、单元测试

``` go
func TestBuildURLByStruct(t *testing.T) {
	type args struct {
		path       string
		queryRange *QueryRange
	}
	tests := []struct {
		name    string
		args    args
		want    string
		wantErr bool
	}{
		{
			name: "build url",
			args: args{
				path: "www.baidu.com",
				queryRange: &QueryRange{
					Query: "cpu_counter",
					Start: 1,
					End:   2,
					Step:  15,
				},
			},
			want:    "",
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := BuildURLByStruct(tt.args.path, tt.args.queryRange)
			if err != nil {
				t.Fatal(err)
			}
			t.Log(got)
		})
	}
}
```
### 三、输出结果

``` txt
config_test.go:74: www.baidu.com?end=2&query=cpu_counter&start=1&step=15
```



### 四、优化参数是any的接口的参数定义方式


1. 实际案例

``` go
package main

import "fmt"

func main() {
    d := new(DealImplement)
    d.Handle(&User{Name: "hello"})
    d.Handle(&School{SchoolName: "work"})
}

type Deal interface {
	// 这个params原来是any导致接口的易用性很差
	// 使用泛型参数定义方式限制这个参数类型明确有哪些类型可以传入
	// 提升接口的可读性
    Handle(params Param)
}

type DealImplement struct {
}

func (d *DealImplement) Handle(params Param) {
    fmt.Println(params.String())
}

type Param interface {
    String() string
}

type User struct {
    Name string
}

func (u *User) String() string {
    return "hello"
}

type School struct {
    SchoolName string
}

func (u *School) String() string {
    return "hello"
}
```

> 表面上调用的Deal函数，实际上执行了子类的方法，与java函数中的范型一样，可以设定参数类型 T 必须是 Comparable的实现。

2. Java的范型

``` java
public static <T extends Comparable<T>> T maximum(T x, T y, T z){                     
      T max = x; // 假设x是初始最大值
      if ( y.compareTo( max ) > 0 ){
         max = y; //y 更大
      }
      if ( z.compareTo( max ) > 0 ){
         max = z; // 现在 z 更大           
      }
      return max; // 返回最大对象
}
```

### 开源包推荐

- [github.com/google/go-querystring](https://github.com/google/go-querystring)
- [GO语言高性能编程](https://geektutu.com/post/high-performance-go.html)