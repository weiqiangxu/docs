---
hide: true
---
# MVCC实现机制


### InnoDB的RC和RR的快照读有什么不同
```
Read View的生成时机不同导致的

RC 每次快照读都会新生成一个快照和Read View

RR 事务开始后在第一次快照读创建Read View后面所有的快照读都是同一个
```

### 隐藏字段
```
DB_TRX_ID 最后一次事务ID
DB_ROLL_PTR 回滚指针，用于在undo log里面找版本链


DB_ROW_ID 6byte, 隐含的自增ID
DELETED_BIT 1byte, 记录被更新或删除并不代表真的删除
```
[pdai.tech](https://pdai.tech/)
