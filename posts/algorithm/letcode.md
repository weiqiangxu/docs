# LeetCode Hot100 题解

> 按题型分类的经典题目与思路，配套本目录其他专题文档。

## 目录

- [一、哈希表](#一哈希表)
- [二、双指针](#二双指针)
- [三、滑动窗口](#三滑动窗口)
- [四、二分查找](#四二分查找)
- [五、链表](#五链表)
- [六、栈与队列](#六栈与队列)
- [七、二叉树](#七二叉树)
- [八、回溯](#八回溯)
- [九、动态规划](#九动态规划)
- [十、贪心](#十贪心)
- [十一、图](#十一图)
- [十二、设计题](#十二设计题)

## 一、哈希表

### 1. 两数之和

> 给定 nums 和 target，返回两数下标，恰有一解。

**思路**：遍历时查 `map[target-x]`，存在即返回，否则把当前值入 map。O(n)。

```go
func twoSum(nums []int, target int) []int {
    m := map[int]int{}
    for i, v := range nums {
        if j, ok := m[target-v]; ok {
            return []int{j, i}
        }
        m[v] = i
    }
    return nil
}
```

### 2. 字母异位词分组

> 把字母相同但排列不同的字符串分组。

**思路**：对每个字符串排序后作为 key，原始串加入对应分组。

```go
import "sort"

func groupAnagrams(strs []string) [][]string {
    m := map[string][]string{}
    for _, s := range strs {
        b := []byte(s)
        sort.Slice(b, func(i, j int) bool { return b[i] < b[j] })
        key := string(b)
        m[key] = append(m[key], s)
    }
    res := make([][]string, 0, len(m))
    for _, v := range m {
        res = append(res, v)
    }
    return res
}
```

### 3. 最长连续序列

> 未排序数组，返回最长连续元素序列长度（如 [100,4,2,1,3] 返回 4）。要求 O(n)。

**思路**：用 set 存所有数，只从「序列起点」（x-1 不在 set 中）开始向后数长度。

```go
func longestConsecutive(nums []int) int {
    set := map[int]bool{}
    for _, v := range nums {
        set[v] = true
    }
    best := 0
    for x := range set {
        if set[x-1] {
            continue // 不是起点，跳过
        }
        y := x + 1
        for set[y] {
            y++
        }
        if y-x > best {
            best = y - x
        }
    }
    return best
}
```

## 二、双指针

### 1. 盛最多水的容器

> 两条垂线与 x 轴围成的容器，求最大水量。

**思路**：左右指针向内收缩，每次移动较短的一边（因为水量被短板限制，移动长板不可能变优）。

```go
func maxArea(height []int) int {
    l, r := 0, len(height)-1
    best := 0
    for l < r {
        h := min(height[l], height[r])
        area := h * (r - l)
        if area > best {
            best = area
        }
        if height[l] < height[r] {
            l++
        } else {
            r--
        }
    }
    return best
}
```

### 2. 三数之和

> 返回所有和为 0 的三元组（不重复）。

**思路**：排序后固定第一个数 i，再用左右指针在 [i+1, n-1] 内找两数之和 = -nums[i]。注意去重。

```go
import "sort"

func threeSum(nums []int) [][]int {
    sort.Ints(nums)
    res := [][]int{}
    n := len(nums)
    for i := 0; i < n-2; i++ {
        if nums[i] > 0 {
            break // 第一个数>0，三数之和必>0
        }
        if i > 0 && nums[i] == nums[i-1] {
            continue // 去重
        }
        l, r := i+1, n-1
        for l < r {
            sum := nums[i] + nums[l] + nums[r]
            if sum == 0 {
                res = append(res, []int{nums[i], nums[l], nums[r]})
                for l < r && nums[l] == nums[l+1] {
                    l++
                }
                for l < r && nums[r] == nums[r-1] {
                    r--
                }
                l++
                r--
            } else if sum < 0 {
                l++
            } else {
                r--
            }
        }
    }
    return res
}
```

## 三、滑动窗口

### 1. 无重复字符的最长子串

> 返回无重复字符的最长子串长度。

**思路**：维护窗口 [l, r]，用 map 记录字符最后出现位置。遇到重复时把 l 跳到 `max(l, map[c]+1)`。

```go
func lengthOfLongestSubstring(s string) int {
    last := map[byte]int{}
    l, best := 0, 0
    for r := 0; r < len(s); r++ {
        c := s[r]
        if i, ok := last[c]; ok && i >= l {
            l = i + 1
        }
        last[c] = r
        if r-l+1 > best {
            best = r - l + 1
        }
    }
    return best
}
```

### 2. 找到字符串中所有字母异位词

> 求 s 中所有 p 的异位词子串的起始下标。

**思路**：固定窗口大小 = len(p)，用计数数组比较窗口内字符频次与 p 是否一致。

```go
func findAnagrams(s string, p string) []int {
    if len(s) < len(p) {
        return nil
    }
    var cntS, cntP [26]int
    for i := 0; i < len(p); i++ {
        cntP[p[i]-'a']++
        cntS[s[i]-'a']++
    }
    res := []int{}
    if cntS == cntP {
        res = append(res, 0)
    }
    for i := len(p); i < len(s); i++ {
        cntS[s[i]-'a']++
        cntS[s[i-len(p)]-'a']--
        if cntS == cntP {
            res = append(res, i-len(p)+1)
        }
    }
    return res
}
```

## 四、二分查找

### 1. 搜索旋转排序数组

> 升序数组在未知点旋转后，查找 target，O(logn)。

**思路**：二分时判断哪半边有序：若 `nums[l] <= nums[mid]` 左半有序，否则右半有序，再判断 target 落在有序侧还是另一侧。

```go
func search(nums []int, target int) int {
    l, r := 0, len(nums)-1
    for l <= r {
        mid := (l + r) / 2
        if nums[mid] == target {
            return mid
        }
        if nums[l] <= nums[mid] { // 左半有序
            if nums[l] <= target && target < nums[mid] {
                r = mid - 1
            } else {
                l = mid + 1
            }
        } else { // 右半有序
            if nums[mid] < target && target <= nums[r] {
                l = mid + 1
            } else {
                r = mid - 1
            }
        }
    }
    return -1
}
```

### 2. 寻找两个正序数组的中位数

> O(log(m+n))。

**思路**：在较短数组上二分切分点 i，让左侧元素数 = 右侧（或多 1），且左侧最大 ≤ 右侧最小。

```go
func findMedianSortedArrays(nums1, nums2 []int) float64 {
    if len(nums1) > len(nums2) {
        nums1, nums2 = nums2, nums1
    }
    m, n := len(nums1), len(nums2)
    l, r := 0, m
    half := (m + n + 1) / 2
    for l <= r {
        i := (l + r) / 2
        j := half - i
        var leftA, rightA, leftB, rightB int
        if i == 0 {
            leftA = -1 << 30
        } else {
            leftA = nums1[i-1]
        }
        if i == m {
            rightA = 1 << 30
        } else {
            rightA = nums1[i]
        }
        if j == 0 {
            leftB = -1 << 30
        } else {
            leftB = nums2[j-1]
        }
        if j == n {
            rightB = 1 << 30
        } else {
            rightB = nums2[j]
        }
        if leftA <= rightB && leftB <= rightA {
            if (m+n)%2 == 1 {
                return float64(max(leftA, leftB))
            }
            return float64(max(leftA, leftB)+min(rightA, rightB)) / 2
        }
        if leftA > rightB {
            r = i - 1
        } else {
            l = i + 1
        }
    }
    return 0
}
```

## 五、链表

### 1. 两数相加

> 两个链表逆序存储数字，返回和的链表。

```go
func addTwoNumbers(l1, l2 *ListNode) *ListNode {
    dummy := &ListNode{}
    cur := dummy
    carry := 0
    for l1 != nil || l2 != nil || carry > 0 {
        sum := carry
        if l1 != nil {
            sum += l1.Val
            l1 = l1.Next
        }
        if l2 != nil {
            sum += l2.Val
            l2 = l2.Next
        }
        cur.Next = &ListNode{Val: sum % 10}
        cur = cur.Next
        carry = sum / 10
    }
    return dummy.Next
}
```

### 2. 合并两个有序链表

```go
func mergeTwoLists(l1, l2 *ListNode) *ListNode {
    dummy := &ListNode{}
    cur := dummy
    for l1 != nil && l2 != nil {
        if l1.Val <= l2.Val {
            cur.Next = l1
            l1 = l1.Next
        } else {
            cur.Next = l2
            l2 = l2.Next
        }
        cur = cur.Next
    }
    if l1 != nil {
        cur.Next = l1
    } else {
        cur.Next = l2
    }
    return dummy.Next
}
```

### 3. K 个一组反转链表 / 反转链表 II / 环形链表

详见 [链表.md](链表.md)。

## 六、栈与队列

### 1. 有效的括号

```go
func isValid(s string) bool {
    pair := map[byte]byte{')': '(', ']': '[', '}': '{'}
    stack := []byte{}
    for i := 0; i < len(s); i++ {
        c := s[i]
        if c == '(' || c == '[' || c == '{' {
            stack = append(stack, c)
        } else {
            if len(stack) == 0 || stack[len(stack)-1] != pair[c] {
                return false
            }
            stack = stack[:len(stack)-1]
        }
    }
    return len(stack) == 0
}
```

### 2. 最小栈

> O(1) 获取最小值。

**思路**：辅助栈同步维护当前最小值。

```go
type MinStack struct {
    st, min []int
}

func Constructor() MinStack { return MinStack{} }

func (s *MinStack) Push(x int) {
    s.st = append(s.st, x)
    if len(s.min) == 0 || x <= s.min[len(s.min)-1] {
        s.min = append(s.min, x)
    }
}

func (s *MinStack) Pop() {
    top := s.st[len(s.st)-1]
    s.st = s.st[:len(s.st)-1]
    if top == s.min[len(s.min)-1] {
        s.min = s.min[:len(s.min)-1]
    }
}

func (s *MinStack) Top() int    { return s.st[len(s.st)-1] }
func (s *MinStack) GetMin() int { return s.min[len(s.min)-1] }
```

### 3. 每日温度

> 返回下一个更高温度出现在几天后。

**思路**：单调递减栈存下标，遇到更高温度时弹出栈顶并填写答案。

```go
func dailyTemperatures(T []int) []int {
    n := len(T)
    res := make([]int, n)
    stack := []int{}
    for i := 0; i < n; i++ {
        for len(stack) > 0 && T[i] > T[stack[len(stack)-1]] {
            top := stack[len(stack)-1]
            stack = stack[:len(stack)-1]
            res[top] = i - top
        }
        stack = append(stack, i)
    }
    return res
}
```

## 七、二叉树

### 1. 二叉树的层序遍历

```go
func levelOrder(root *TreeNode) [][]int {
    if root == nil {
        return nil
    }
    res := [][]int{}
    q := []*TreeNode{root}
    for len(q) > 0 {
        n := len(q)
        level := []int{}
        for i := 0; i < n; i++ {
            node := q[0]
            q = q[1:]
            level = append(level, node.Val)
            if node.Left != nil {
                q = append(q, node.Left)
            }
            if node.Right != nil {
                q = append(q, node.Right)
            }
        }
        res = append(res, level)
    }
    return res
}
```

### 2. 二叉树的最大深度

```go
func maxDepth(root *TreeNode) int {
    if root == nil {
        return 0
    }
    return 1 + max(maxDepth(root.Left), maxDepth(root.Right))
}
```

### 3. 翻转二叉树 / 对称二叉树 / 最近公共祖先

详见 [二叉树与遍历.md](二叉树与遍历.md)。

## 八、回溯

### 1. 全排列

```go
func permute(nums []int) [][]int {
    res := [][]int{}
    var dfs func(int)
    dfs = func(idx int) {
        if idx == len(nums) {
            tmp := append([]int(nil), nums...)
            res = append(res, tmp)
            return
        }
        for i := idx; i < len(nums); i++ {
            nums[idx], nums[i] = nums[i], nums[idx]
            dfs(idx + 1)
            nums[idx], nums[i] = nums[i], nums[idx]
        }
    }
    dfs(0)
    return res
}
```

### 2. 子集 / 组合 / N 皇后

详见 [回溯算法.md](回溯算法.md)。

## 九、动态规划

### 1. 最长递增子序列

```go
func lengthOfLIS(nums []int) int {
    // dp[i] = 以 nums[i] 结尾的 LIS 长度
    dp := make([]int, len(nums))
    best := 0
    for i := 0; i < len(nums); i++ {
        dp[i] = 1
        for j := 0; j < i; j++ {
            if nums[j] < nums[i] && dp[j]+1 > dp[i] {
                dp[i] = dp[j] + 1
            }
        }
        if dp[i] > best {
            best = dp[i]
        }
    }
    return best
}
```

**二分优化**：维护一个尾元素递增的数组，用二分找位置替换，O(nlogn)。

### 2. 最长公共子序列

```go
func longestCommonSubsequence(a, b string) int {
    m, n := len(a), len(b)
    dp := make([][]int, m+1)
    for i := range dp {
        dp[i] = make([]int, n+1)
    }
    for i := 1; i <= m; i++ {
        for j := 1; j <= n; j++ {
            if a[i-1] == b[j-1] {
                dp[i][j] = dp[i-1][j-1] + 1
            } else {
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
            }
        }
    }
    return dp[m][n]
}
```

### 3. 编辑距离 / 打家劫舍 / 零钱兑换

详见 [动态规划.md](动态规划.md)。

## 十、贪心

### 1. 跳跃游戏

> 判断能否跳到最后。

**思路**：维护最远可达位置，逐个更新。

```go
func canJump(nums []int) bool {
    far := 0
    for i := 0; i < len(nums); i++ {
        if i > far {
            return false
        }
        if i+nums[i] > far {
            far = i + nums[i]
        }
        if far >= len(nums)-1 {
            return true
        }
    }
    return true
}
```

### 2. 买卖股票的最佳时机 / 任务调度器

详见 [贪心算法.md](贪心算法.md)。

## 十一、图

### 1. 岛屿数量

> '1' 为陆地，'0' 为水，求岛屿数。

**思路**：遍历每个 '1'，DFS 把相连的 '1' 全染成 '0'，计数 +1。

```go
func numIslands(grid [][]byte) int {
    m, n := len(grid), len(grid[0])
    var dfs func(int, int)
    dfs = func(i, j int) {
        if i < 0 || i >= m || j < 0 || j >= n || grid[i][j] != '1' {
            return
        }
        grid[i][j] = '0'
        dfs(i+1, j)
        dfs(i-1, j)
        dfs(i, j+1)
        dfs(i, j-1)
    }
    cnt := 0
    for i := 0; i < m; i++ {
        for j := 0; j < n; j++ {
            if grid[i][j] == '1' {
                cnt++
                dfs(i, j)
            }
        }
    }
    return cnt
}
```

### 2. 课程表 / 最短路径

详见 [图的DFS与BFS.md](图的DFS与BFS.md)。

## 十二、设计题

### 1. LRU 缓存

详见 [链表.md#九lru-缓存](链表.md)。

### 2. 实现 Trie

```go
type Trie struct {
    children [26]*Trie
    isEnd    bool
}

func Constructor() Trie { return Trie{} }

func (t *Trie) Insert(word string) {
    for i := 0; i < len(word); i++ {
        c := word[i] - 'a'
        if t.children[c] == nil {
            t.children[c] = &Trie{}
        }
        t = t.children[c]
    }
    t.isEnd = true
}

func (t *Trie) Search(word string) bool {
    t = t.searchPrefix(word)
    return t != nil && t.isEnd
}

func (t *Trie) StartsWith(prefix string) bool {
    return t.searchPrefix(prefix) != nil
}

func (t *Trie) searchPrefix(s string) *Trie {
    for i := 0; i < len(s); i++ {
        c := s[i] - 'a'
        if t.children[c] == nil {
            return nil
        }
        t = t.children[c]
    }
    return t
}
```

## 附：高频题分类速查

| 题型 | 经典题 |
|------|------|
| 哈希 | 两数之和、字母异位词分组、最长连续序列 |
| 双指针 | 盛水容器、三数之和、接雨水 |
| 滑动窗口 | 无重复最长子串、最小覆盖子串、异位词 |
| 二分 | 旋转数组、中位数、搜索插入位置 |
| 链表 | 反转、合并、环形、LRU |
| 栈队列 | 括号、最小栈、单调栈每日温度 |
| 二叉树 | 层序、深度、最近公共祖先、对称 |
| 回溯 | 全排列、子集、组合、N 皇后 |
| DP | LIS、LCS、编辑距离、打家劫舍、零钱兑换 |
| 贪心 | 跳跃游戏、买卖股票、分发糖果 |
| 图 | 岛屿数量、课程表、拓扑排序 |
| 设计 | LRU、Trie、LFU、跳表 |
