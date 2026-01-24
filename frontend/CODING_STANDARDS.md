# 前端代码规范

## 📌 技术栈版本
- React 18+
- JavaScript ES2020+
- Node.js 20+
- Vite 7+

## 🎨 代码风格

### 格式化
- 使用 **Prettier** 进行代码格式化
- 配置文件：`.prettierrc`

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### 代码质量检查
- 使用 **ESLint** 进行代码质量检查
- 配置文件：`.eslintrc.cjs`

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix
```

## ⚛️ React 组件规范

### 组件定义
- 使用函数式组件
- 使用 Hooks 管理状态和副作用

```jsx
// ✅ 推荐：函数式组件 + Hooks
import React, { useState, useEffect } from 'react'

function UserProfile({ userId }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser(userId).then(data => {
      setUser(data)
      setLoading(false)
    })
  }, [userId])

  if (loading) return <div>Loading...</div>
  return <div>{user.name}</div>
}

export default UserProfile
```

### 组件命名
- 组件名使用 PascalCase
- 文件名与组件名一致
- 自定义 Hook 使用 `use` 前缀

```jsx
// ✅ 推荐：PascalCase 组件名
function UserProfile() {}
function ChatInterface() {}
function ToolUsageCard() {}

// ✅ 推荐：use 前缀的自定义 Hook
function useUserData(userId) {}
function useChatMessages() {}
function useDebounce(value, delay) {}
```

### Props 类型检查
使用 PropTypes 或 TypeScript：

```jsx
import PropTypes from 'prop-types'

function UserProfile({ name, age, email }) {
  return (
    <div>
      <h1>{name}</h1>
      <p>Age: {age}</p>
      <p>Email: {email}</p>
    </div>
  )
}

UserProfile.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number,
  email: PropTypes.string.isRequired,
}

UserProfile.defaultProps = {
  age: 0,
}

export default UserProfile
```

### 组件文档
使用 JSDoc 注释：

```jsx
/**
 * 用户资料卡片组件
 *
 * @component
 * @example
 * return (
 *   <UserProfileCard
 *     name="John Doe"
 *     email="john@example.com"
 *     avatar="https://example.com/avatar.jpg"
 *     onEdit={handleEdit}
 *   />
 * )
 */
function UserProfileCard({ name, email, avatar, onEdit }) {
  return (
    <div className="user-profile-card">
      <img src={avatar} alt={name} />
      <h2>{name}</h2>
      <p>{email}</p>
      <button onClick={onEdit}>Edit</button>
    </div>
  )
}

UserProfileCard.propTypes = {
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  avatar: PropTypes.string.isRequired,
  onEdit: PropTypes.func.isRequired,
}
```

## 🪝 Hooks 规范

### 自定义 Hook
- 使用 `use` 前缀
- 返回数组或对象
- 处理错误和加载状态

```jsx
/**
 * 获取用户数据的自定义 Hook
 *
 * @param {number} userId - 用户 ID
 * @returns {Object} { user, loading, error, refetch }
 */
function useUserData(userId) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getUser(userId)
      setUser(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [userId])

  return { user, loading, error, refetch: fetchUser }
}
```

### Hooks 使用规则
- ✅ 在函数组件顶层调用
- ✅ 在自定义 Hook 中调用
- ❌ 不要在循环、条件或嵌套函数中调用

```jsx
// ✅ 推荐：在顶层调用
function Component() {
  const [count, setCount] = useState(0)
  useEffect(() => {}, [])
  return <div>{count}</div>
}

// ❌ 不推荐：在条件中调用
function Component() {
  if (condition) {
    const [count, setCount] = useState(0) // 错误！
  }
  return <div></div>
}
```

## 🎨 样式规范

### Tailwind CSS
- 优先使用 Tailwind CSS 类
- 使用 `clsx` 和 `tailwind-merge` 合并类名
- 使用 `class-variance-authority` 管理样式变体

```jsx
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

function Button({ variant = 'primary', size = 'md', children, ...props }) {
  const baseStyles = 'rounded-lg font-medium transition-colors'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size])}
      {...props}
    >
      {children}
    </button>
  )
}
```

### CSS Modules
- 对于复杂组件使用 CSS Modules
- 文件名：`*.module.css`

```jsx
import styles from './UserProfile.module.css'

function UserProfile() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>User Profile</h1>
      </div>
    </div>
  )
}
```

## 📦 状态管理规范

### 优先使用 React Context API
对于简单的跨组件状态：

```jsx
// contexts/ThemeContext.jsx
import React, { createContext, useContext, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
```

### 复杂状态使用状态管理库
对于复杂的状态管理，使用 Zustand 或 Redux Toolkit：

```jsx
// stores/chatStore.js
import { create } from 'zustand'

export const useChatStore = create(set => ({
  messages: [],
  isLoading: false,
  addMessage: message => set(state => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  setLoading: loading => set({ isLoading: loading }),
}))
```

### 避免过度使用全局状态
- ✅ 组件内部状态：使用 `useState`
- ✅ 简单跨组件状态：使用 Context API
- ✅ 复杂状态管理：使用 Zustand 或 Redux Toolkit
- ❌ 避免将所有状态都放在全局

## 🚀 性能优化规范

### 使用 React.memo
避免不必要的重新渲染：

```jsx
import React, { memo } from 'react'

const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  // 复杂的计算或渲染
  return <div>{/* ... */}</div>
})

export default ExpensiveComponent
```

### 使用 useMemo 和 useCallback
优化计算和函数引用：

```jsx
import React, { useState, useMemo, useCallback } from 'react'

function UserList({ users }) {
  const [filter, setFilter] = useState('')

  // 缓存过滤后的用户列表
  const filteredUsers = useMemo(() => {
    return users.filter(user => user.name.includes(filter))
  }, [users, filter])

  // 缓存回调函数
  const handleDelete = useCallback(userId => {
    // 删除用户逻辑
  }, [])

  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} />
      {filteredUsers.map(user => (
        <UserCard key={user.id} user={user} onDelete={handleDelete} />
      ))}
    </div>
  )
}
```

### 虚拟滚动长列表
使用 `react-virtuoso` 处理长列表：

```jsx
import { Virtuoso } from 'react-virtuoso'

function MessageList({ messages }) {
  return (
    <Virtuoso
      style={{ height: 500 }}
      data={messages}
      itemContent={(index, message) => (
        <MessageCard key={message.id} message={message} />
      )}
    />
  )
}
```

### 图片优化
使用懒加载和占位符：

```jsx
import { useState } from 'react'

function LazyImage({ src, alt, ...props }) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        className={isLoading ? 'opacity-0' : 'opacity-100'}
        {...props}
      />
    </div>
  )
}
```

## 🧪 测试规范

### 测试文件命名
- 测试文件：`*.test.jsx` 或 `*.spec.jsx`
- 测试工具：`@testing-library/react`

### 组件测试示例
```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import UserProfile from './UserProfile'

describe('UserProfile', () => {
  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  }

  it('renders user information', () => {
    render(<UserProfile user={mockUser} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('calls onEdit when edit button is clicked', () => {
    const handleEdit = jest.fn()
    render(<UserProfile user={mockUser} onEdit={handleEdit} />)
    fireEvent.click(screen.getByText('Edit'))
    expect(handleEdit).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<UserProfile user={null} loading={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

### 自定义 Hook 测试
```jsx
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUserData } from './useUserData'

describe('useUserData', () => {
  it('fetches user data', async () => {
    const { result } = renderHook(() => useUserData(1))
    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.user).toEqual({ id: 1, name: 'John Doe' })
  })
})
```

## 📦 模块组织规范

### 导入顺序
```jsx
// 1. React 相关导入
import React, { useState, useEffect } from 'react'

// 2. 第三方库导入
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'

// 3. 本地组件导入
import UserProfile from './UserProfile'
import { useTheme } from '../contexts/ThemeContext'

// 4. 样式导入
import styles from './Component.module.css'

// 5. 工具函数导入
import { formatDate } from '../utils/date'
```

### 文件组织
```
src/
├── components/          # 可复用组件
│   ├── ui/             # UI 基础组件
│   ├── layout/         # 布局组件
│   └── features/       # 功能组件
├── hooks/              # 自定义 Hooks
├── contexts/           # React Context
├── utils/              # 工具函数
├── services/           # API 服务
├── stores/             # 状态管理
├── styles/             # 全局样式
└── types/              # TypeScript 类型（如果使用）
```

## 🔒 安全规范

### XSS 防护
- React 默认转义 JSX 中的内容
- 使用 `dangerouslySetInnerHTML` 时要小心

```jsx
// ✅ 推荐：React 自动转义
function UserMessage({ content }) {
  return <div>{content}</div>
}

// ⚠️ 谨慎使用：dangerouslySetInnerHTML
function HTMLContent({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: sanitize(html) }} />
}
```

### 敏感数据处理
- 不要在前端存储敏感信息
- 使用 HTTPS 通信
- 验证所有用户输入

```jsx
// ❌ 不推荐：在前端存储敏感信息
const API_KEY = 'sk-1234567890abcdef'

// ✅ 推荐：从后端获取
const API_KEY = await fetchApiKey()
```

## 🔧 开发工具

### 代码检查命令
```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npx prettier --write "src/**/*.{js,jsx,ts,tsx,json,md}"
```

### 运行测试
```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 监听模式
npm test -- --watch
```

### 构建和预览
```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 📚 参考资料

- [React 官方文档](https://react.dev/)
- [React Hooks 最佳实践](https://react.dev/reference/react)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [ESLint 规则](https://eslint.org/docs/latest/rules/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)

---

**创建时间**：2026-01-23
**维护者**：iFlow Agent Team
**版本**：1.0.0