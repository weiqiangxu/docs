> Redis List 类型：按插入顺序排序的字符串链表，支持两端操作

## 目录

- [一、基本概念](#一基本概念)
- [二、常用命令](#二常用命令)
- [三、底层实现](#三底层实现)
- [四、应用场景](#四应用场景)
- [五、使用示例](#五使用示例)
- [六、相关资料](#六相关资料)

## 一、基本概念

| 特性 | 说明 |
|------|------|
| 结构 | 双向链表（按插入顺序） |
| 元素数上限 | 2^32 - 1 |
| 编码方式 | quicklist |
| 操作复杂度 | 两端O(1)，中间O(n) |

## 二、常用命令

### 2.1 插入操作

```bash
# 头部插入
$ LPUSH list a b c    # 结果: c b a

# 尾部插入
$ RPUSH list a b c    # 结果: a b c

# 头部插入（已存在时）
$ LPUSHX list d

# 尾部插入（已存在时）
$ RPUSHX list d
```

### 2.2 弹出操作

```bash
# 头部弹出
$ LPOP list

# 尾部弹出
$ RPOP list

# 阻塞式头部弹出（5秒超时）
$ BLPOP list 5

# 阻塞式尾部弹出
$ BRPOP list 5

# 从一个list尾部弹出，push到另一个list头部
$ RPOPLPUSH source destination

# 阻塞版
$ BRPOPLPUSH source destination 5
```

### 2.3 查询操作

```bash
# 获取范围
$ LRANGE list 0 -1     # 所有
$ LRANGE list 0 2      # 前3个
$ LRANGE list -3 -1    # 后3个

# 获取长度
$ LLEN list

# 获取指定下标
$ LINDEX list 0

# 获取指定范围
$ LRANGE list 0 9
```

### 2.4 修改操作

```bash
# 设置指定下标的值
$ LSET list 0 newvalue

# 在元素前/后插入
$ LINSERT list BEFORE "pivot" "newvalue"
$ LINSERT list AFTER "pivot" "newvalue"

# 移除指定元素
$ LREM list 2 "value"       # 从头开始移除2个
$ LREM list -2 "value"      # 从尾开始移除2个
$ LREM list 0 "value"       # 移除所有

# 修剪保留范围
$ LTRIM list 0 99    # 只保留前100个
```

## 三、底层实现

### 3.1 quicklist 结构

List 在 Redis 7 之后统一使用 **quicklist**（快速列表）：

```mermaid
flowchart LR
    Head[Head] --> N1[quicklistNode<br/>listpack] --> N2[quicklistNode<br/>listpack] --> N3[quicklistNode<br/>listpack] --> Tail[Tail]
```

**quicklist = 双向链表 + 每个节点是listpack**

### 3.2 结构定义

```c
typedef struct quicklist {
    quicklistNode *head;
    quicklistNode *tail;
    unsigned long count;       // 总元素数
    unsigned long len;         // 节点数
    signed int fill : 16;      // 每节点最大元素数或字节数
    unsigned int compress : 16; // 压缩深度
} quicklist;

typedef struct quicklistNode {
    struct quicklistNode *prev;
    struct quicklistNode *next;
    unsigned char *entry;      // listpack数据
    size_t sz;                 // entry大小
    unsigned int count : 16;   // 元素数
    unsigned int encoding : 2; // RAW/LZF
    unsigned int container : 2;
    unsigned int recompress : 1;
} quicklistNode;
```

### 3.3 设计优势

| 特性 | 说明 |
|------|------|
| 兼具链表与数组优点 | 链表整体结构，节点内是紧凑数组 |
| 内存效率高 | 紧凑存储，减少指针开销 |
| 压缩中间节点 | LZF压缩，节省内存 |
| 两端操作O(1) | 双向链表特性 |

## 四、应用场景

### 4.1 消息队列

```python
# 生产者
r.lpush('task:queue', json.dumps({'task': 'send_email', 'to': 'alice@example.com'}))

# 消费者（阻塞式）
while True:
    task = r.brpop('task:queue', timeout=30)
    if task:
        process_task(task)
```

### 4.2 最新列表

```python
# 最新10条动态
r.lpush('news:latest', news_id)
r.ltrim('news:latest', 0, 9)  # 只保留前10

# 获取最新10条
latest = r.lrange('news:latest', 0, -1)
```

### 4.3 安全队列

```python
# 处理中的任务移到backup队列，处理失败可回滚
task = r.rpoplpush('task:queue', 'task:processing')
try:
    process(task)
    r.lrem('task:processing', 1, task)  # 处理成功移除
except Exception:
    # 失败保持不动，等待重试
    pass
```

### 4.4 浏览历史

```python
# 用户浏览历史
r.lpush('history:user:1001', 'article:123')

# 去重：先移除旧记录
r.lrem('history:user:1001', 0, 'article:123')
r.lpush('history:user:1001', 'article:123')
r.ltrim('history:user:1001', 0, 99)  # 保留最近100条
```

## 五、使用示例

### 5.1 Python示例

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# 插入
r.rpush('fruits', 'apple', 'banana', 'cherry')
r.lpush('fruits', 'orange')

# 查询
print(r.lrange('fruits', 0, -1))
# ['orange', 'apple', 'banana', 'cherry']

print(r.llen('fruits'))  # 4
print(r.lindex('fruits', 0))  # orange

# 弹出
print(r.lpop('fruits'))  # orange
print(r.rpop('fruits'))  # cherry

# 阻塞式弹出
result = r.brpop('fruits', timeout=5)
print(result)  # (b'fruits', b'apple') 或 None
```

### 5.2 Go示例

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    ctx := context.Background()

    // 插入
    rdb.RPush(ctx, "fruits", "apple", "banana", "cherry")
    rdb.LPush(ctx, "fruits", "orange")

    // 查询
    vals, _ := rdb.LRange(ctx, "fruits", 0, -1).Result()
    fmt.Println(vals) // [orange apple banana cherry]

    // 阻塞弹出
    result, _ := rdb.BRPop(ctx, 5*time.Second, "fruits").Result()
    fmt.Println(result)
}
```

## 六、相关资料

- [Redis List命令](https://redis.io/commands/?group=list)
- [quicklist源码](https://github.com/redis/redis/blob/unstable/src/quicklist.c)
