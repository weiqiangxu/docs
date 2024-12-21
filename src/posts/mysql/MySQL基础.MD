# MySQL基础

1. Explain性能分析看哪些字段
2. MySQL分层有哪些分别是做什么事情的(连接\服务\引擎\存储)
3. 优化手段有哪些(Join表\索引\字段多数据量IO大)
4. SQL执行过程详解
5. 共享锁和独占锁
    表级别-读锁(共享锁): `lock tables user read;`
    表级别-写锁(排他锁): `lock tables user write;` 
    行级别-读锁(共享锁): `SELECT * FROM user WHERE id=1 LOCK IN SHARE MODE`
    行级别-写锁(排他锁): `SELECT * FROM user WHERE id=1 FOR UPDATE` 
    锁的释放。表级共享锁和表级排他锁都可以通过`unlock tables`释放。会话退出后，也会释放所有表锁。行级锁的话是事务结束（执行commit或者rollback）时，行级锁会自动释放。
6. 记录锁\间隙锁\临键锁\插入意向锁
    如果 update 语句的 where 条件没有用到索引列，那么就会全表扫描，在一行行扫描的过程中，不仅给行记录加上了行锁，还给行记录两边的空隙也加上了间隙锁，相当于锁住整个表，然后直到事务结束才会释放锁。执行 `SELECT * FROM user WHERE id=1 FOR UPDATE` 的时候会增加行级别的排他锁。如果没有这个记录可能会升级为间隙锁.
7. 高并发的情况下用户在极端的时间内反复提交手机号码，后台会插入一个`insert into user phone values 999`，从MySQL锁的角度来说如何避免数据库出现两个一模一样电话号码的记录呢，是否事务内`SELECT * FROM user WHERE phone=999 FOR UPDATE`的方式呢
8. 为什么`limit offset`会比`between`卡并且使用`between`会有什么问题
    - 如果offset是 10000，数据库可能需要遍历前面的 10000 行，即使最终只需要返回后面的少量行（比如 10 行）。这种遍历和计数的操作会消耗较多的时间和资源。
    - 当使用`between`的时候比如`SELECT * FROM table WHERE id BETWEEN 100 AND 110`时，可以利用索引更直接地定位到满足条件的记录范围。
9. 联合索引index(a, b, c)，在 B + 树中只有一个数据结构来存储索引信息。在 B + 树的非叶子节点中，存储的是索引键值（由a、b、c列的值组合而成）。


### 相关文档

- [Java全栈知识体系](https://pdai.tech/)
- [西瓜汁拌面MySQL分层、存储引擎、解析原理](https://www.cnblogs.com/mululu/p/14457394.html)