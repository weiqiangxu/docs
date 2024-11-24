# letcode

> hot100和面试经典的思路.

1. 两数之和
```
给定nums获取target对应的2个数字的下标且题意仅仅有一种情况

暴力枚举之2个for循环
哈希表之map[target-x]
```
2. 两数相加
```
给定2个非空链表，12和21获取链表33的

比较巧妙地将十位数和个位数倒过来，将满十进一加至上下一位数
```
3. 无重复字符最长子串长度
```
给定abcdeff返回6

暴力枚举，计算每一个下标的最长字符串，range k+1即可
```
4. 寻找两个正序数组的中位数 ignore
5. 最长回文子串
```
给定cbbd输出bb

重复有2种,aba或者aabb,任何一个下标的元素两边扩展奇数为对称或者偶数不对称
```
10. 正则表达式匹配 ignore
11. 盛最多水的容器
```
常人的思路则是暴力枚举，但是超过了运行内存限制

双指针实现，对firstNode和lastNode，互相往中线聚拢直至index相等，每次聚拢都是min的往中心聚
```
15. 三数之和
```
给定[-1,0,1,2,-1,-4]获取target_sum为0的值组合的下标 [[-1,-1,2],...]

因为排重困难，sort.Ints升序非常关键，对每一个k获取对应的两个index，可以通过双指针的方式减少循环
```
17. 电话号码的字母组合
```
看不懂
```
19. 删除链表的倒数第N个节点
```
[1,2,3,4,5]删除倒数第二个节点后[1,2,3,5]

直接遍历链表获取数组[]int然后直接删除倒数第N个，重新组装链表
```
20. 有效的括号
```
判定{[]}是合法的

使用出栈入栈的方式判定，这里不论几种类型的括号都只需要一个栈
```
21. 合并2个有序链表
```
sort.Ints排序后组装链表，组装链表需要n.Next = xxx然后n = n.Next并且虚拟头结点
```
22. 括号生成
31. 下一个排列
```
很巧妙地找出index和index+1(index+1 > index)的时候,然后将[index+1,end]第一个大大于index_val的值和index替换
然后[index,end]全部升序
```
33. 搜索旋转排序数组
34. 在排序数组中查找元素的第一个和最后一个位置
```
二分法后向前面后面查找
```
39. 组合总和
42. 接雨水
46. 全排列
48. 旋转图像
49. 字母异位词分组
53. 最大子数组和
70. 爬楼梯
```
每次1或2阶，给定n阶需要多少种方法

动态规划的思想类似于数学归纳法

穷举总结 f(n) = f(n-1) + f(n-2) 且 f(1)=1 && f(2)=2
```



# 题库

### 两数之和,给定数组 [1,2,3] 和目标值3, 找出下标为[0,1]

暴力枚举：遍历数组，每个index值下，找出匹配的另一个index值，然后排重
哈希表：hashTable[target-x]

### 两数相加

```
输入：l1 = [2,4,3], l2 = [5,6,4]
输出：[7,0,8]
解释：342 + 465 = 807.
链表 7-> 0 -> 8
以下第一个解法是老实人系列：直接将链表倒序组装为数字相加，然后再倒序组装为链表
```

```
package main

import (
	"fmt"
	"strconv"
)

type ListNode struct {
	Val  int
	Next *ListNode
}

// strconv.Itoa Int转ASCII(string)
// strconv.Atoi ASCII转int
// string([]rune("hello")[0])
func addTwoNumbers(l1 *ListNode, l2 *ListNode) *ListNode {
	var l1_List = []int{}
	var l2_List = []int{}
	for {
		l1_List = append(l1_List, l1.Val)
		if l1.Next == nil {
			break
		}
		l1 = l1.Next
	}
	for {
		l2_List = append(l2_List, l2.Val)
		if l2.Next == nil {
			break
		}
		l2 = l2.Next
	}

	var aa = ""
	var bb = ""

	for k := range l1_List {
		aa += strconv.Itoa(l1_List[len(l1_List)-1-k])
	}

	for k := range l2_List {
		bb += strconv.Itoa(l2_List[len(l2_List)-1-k])
	}
	tmp1, _ := strconv.Atoi(aa)
	tmp2, _ := strconv.Atoi(bb)
	tmp3 := tmp1 + tmp2
	z := strconv.Itoa(tmp3)
	var n *ListNode
	for _, v := range z {
		tt := string(v)
		ttt, _ := strconv.Atoi(tt)
		tmp_node := &ListNode{
			Val:  ttt,
			Next: nil,
		}
		tmp_node.Next = n
		n = tmp_node
	}
	return n
}

func main() {
	// 342 + 465 = 807
	var a = &ListNode{
		Val: 2,
		Next: &ListNode{
			Val: 4,
			Next: &ListNode{
				Val:  3,
				Next: nil,
			},
		},
	}
	var b = &ListNode{
		Val: 5,
		Next: &ListNode{
			Val: 6,
			Next: &ListNode{
				Val:  4,
				Next: nil,
			},
		},
	}
	c := addTwoNumbers(a, b)
	fmt.Println(c)
}
```

解题思路: 

```
输入：l1 = [2,4,3], l2 = [5,6,4]
输出：[7,0,8]
解释：342 + 465 = 807
换一个角度: 243 和 564 ，你把2和5当成个位数，那么相加的值来说，sum%10 就是当前链表位置的值，而进位值继续往下一位累加
是不是很巧妙
```
我的答案

```
func addTwoNumbers(l1 *ListNode, l2 *ListNode) *ListNode {
    var n = &ListNode{}
    var Link = n
    carry := 0
    for {
        if l1 == nil && l2 == nil && carry == 0{
            break
        }
        a := 0
        b := 0
        if l1 != nil {
            a = l1.Val
            l1 = l1.Next
        }
        if l2 != nil {
            b = l2.Val
            l2 = l2.Next
        }
        sum := a+b+carry
        n.Next = &ListNode{
            Val:sum%10,
        }
        n = n.Next
        carry = sum/10
    }
    return Link.Next
}
```

### 无重复字符的最长子串

```
s := "abcdaef"
输出 4
```
解题思路
```
滑动窗口 + Map
```

### 最长回文子串

解题思路:

```
奇数对称:以每个字符为基准,其字符所在index,比对index-1和index+1是否相等,如果想等则继续扩散
偶数对称:以每2个字符为基准,如果index和index+1相等则继续扩散
遍历之时将差值最大的记录下来
```

```
func longestPalindrome(s string) string {
    if s == "" {
        return ""
    }
    start, end := 0, 0
    for i := 0; i < len(s); i++ {
        left1, right1 := expandAroundCenter(s, i, i)
        left2, right2 := expandAroundCenter(s, i, i + 1)
        if right1 - left1 > end - start {
            start, end = left1, right1
        }
        if right2 - left2 > end - start {
            start, end = left2, right2
        }
    }
    return s[start:end+1]
}

func expandAroundCenter(s string, left, right int) (int, int) {
    for {
		if right >= len(s) {
			break
		}
		if left < 0 {
			break
		}
		if s[left] != s[right] {
			break
		}
		left, right = left-1 , right+1
	}
    return left + 1, right - 1
}
```

### 11.盛最多的水

> 双指针，两边向中心聚拢，总是将权值更小的那一个往中心区域聚拢

### 15.三数之和


### 爬楼梯

### 双指针


