# NovaJudge API 文档

基础路径: `/api`

## 认证方式

所有接口均支持 API Key 认证。请在请求头中包含您的 API Key：

- **Header**: `x-api-key`
- **Value**: 您的 API Key (例如：`sk_live_...`)

如果 API Key 无效或缺失（当接口强制要求时），API 将返回 `403 Forbidden` 或 `401 Unauthorized` 错误。

---

## 1. 获取比赛题目列表

获取指定比赛的题目列表。

- **接口地址**: `GET /contests/:contestId/problems`
- **接口描述**: 返回包含时间限制、内存限制和分数的题目列表。

### 请求参数

| 参数名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `contestId` | `integer` | 比赛 ID |

### 响应示例

```json
[
  {
    "displayId": "A",
    "name": "A + B Problem",
    "time": 1000,      // 时间限制 (毫秒)
    "memory": 256,     // 内存限制 (MB)
    "score": 100       // 题目分值
  },
  {
    "displayId": "B",
    "name": "Another Problem",
    "time": 2000,
    "memory": 512,
    "score": 100
  }
]
```

---

## 2. 获取比赛提交记录

获取指定比赛的所有提交记录。

- **接口地址**: `GET /contests/:contestId/submissions`
- **接口描述**: 返回比赛的所有提交记录，包括代码、判题状态和资源使用情况。

### 请求参数

| 参数名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `contestId` | `integer` | 比赛 ID |

### 响应示例

```json
[
  {
    "rid": 1001,                    // 提交 ID (显示 ID)
    "status": "Accepted",           // 判题结果 (如 Accepted, Wrong Answer)
    "score": 100,                   // 获得分数
    "problem": "A + B Problem",     // 题目名称
    "username": "team01",           // 提交用户
    "runtime": 15,                  // 运行时间 (ms)
    "memory": 1024,                 // 内存使用 (KB)
    "language": "cpp",              // 编程语言
    "submit_time": "2024-03-07 10:00:00", // 提交时间 (YYYY-MM-DD HH:mm:ss)
    "code": "#include <iostream>..."      // 源代码
  }
]
```

### 状态值说明 (Status)

- `Waiting` (等待判题)
- `Running` (判题中)
- `Accepted` (通过)
- `Wrong Answer` (答案错误)
- `Time Exceeded` (时间超限)
- `Memory Exceeded` (内存超限)
- `Runtime Error` (运行错误)
- `Compile Error` (编译错误)
- `Format Error` (格式错误/PE)
- `System Error` (系统错误)
