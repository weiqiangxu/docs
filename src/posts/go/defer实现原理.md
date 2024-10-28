# defer

1. 特性(延迟调用、异常处理、运行时间点、后进先出、return执行顺序)
2. 源码(数据结构、deferproc、newdefer、deferreturn)


### 1.延迟函数fmt.Println在执行的时候参数就被确定
### 2.return非原子，分为`set返回值`和`callback 返回值`,中间执行`defer`
### 3.具名返回值在`set返回值后`可以被修改
### 4.defer要改变返回值，改变的是在`set值之后的具名返回值`

```golang
// main.go
package main

import "fmt"

func main() {
	i := foo()
	fmt.Println(i)

	z := deferFuncReturn()
	fmt.Println(z)
}

// 为什么结果是0
func foo() int {
	var i int

	fmt.Printf("out1 = %p\n", &i)
	defer func() {
		fmt.Printf("in1 = %p\n", &i)
		i++
	}()

	return i
}

// 为什么结果是1
func deferFuncReturn() (result int) {
	var i int
	fmt.Printf("out = %p\n", &result)
	defer func() {
		result++
		fmt.Printf("in = %p\n", &result)
	}()
	return i
}


// 为什么结果是1
func foo() int {
    var i int

    defer func() {
        i++
    }()

    return 1
}

// 为什么结果是 2
func foo() (ret int) {
    defer func() {
        ret++
    }()

    return 1
}


// 为什么输出是0
func a() {
    i := 0
    defer fmt.Println(i)
    i++
    return
}
```