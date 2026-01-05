# 性能优化说明

## 问题诊断

根据性能指标分析，发现以下问题：

- **INP (Interaction to Next Paint)**: 7,440 ms（非常差）
- **主要卡顿点**: 点击频道列表中的元素时响应极慢

## 已实施的优化

### 1. ✅ 使用 useCallback 优化事件处理函数

**问题**: 每次组件重新渲染时，事件处理函数都会创建新的函数引用，导致子组件不必要的重新渲染。

**解决方案**: 在 `app/page.tsx` 中使用 `useCallback` 包装所有事件处理函数：

```typescript
const handleSelectChannel = useCallback((channel: Channel) => {
  setSelectedChannel(channel)
}, [])

const handleToggleFavorite = useCallback((channelId: string) => {
  // ...
}, [])

const handlePlay = useCallback((channel: Channel) => {
  // ...
}, [streamMap])
```

**效果**: 函数引用保持稳定，减少不必要的重新渲染。

### 2. ✅ 使用 React.memo 优化 ChannelCard 组件

**问题**: 每次父组件更新，所有 ChannelCard 组件都会重新渲染，即使它们的 props 没有变化。

**解决方案**: 
- 使用 `React.memo` 包装 `ChannelCard` 组件
- 自定义比较函数，只比较关键 props，忽略函数引用

```typescript
export const ChannelCard = memo(
  function ChannelCard({ ... }) {
    // ...
  },
  // 自定义比较函数
  (prevProps, nextProps) => {
    return (
      prevProps.channel.id === nextProps.channel.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isFavorite === nextProps.isFavorite &&
      // ... 其他关键 props
    )
  }
)
```

**效果**: 只有真正需要更新的卡片才会重新渲染。

### 3. ✅ 使用 useMemo 优化计算

**问题**: 每次渲染都会重新计算 `isHD`、`is4K`、`hasEpg` 等值。

**解决方案**: 在 `ChannelCard` 中使用 `useMemo` 缓存计算结果：

```typescript
const isHD = useMemo(() => hasHD(channel), [channel])
const is4K = useMemo(() => has4K(channel), [channel])
const hasEpg = useMemo(() => hasEPG(streamMap, channel.id), [streamMap, channel.id])
```

**效果**: 避免重复计算，提升渲染性能。

### 4. ✅ 优化 SWR 配置

**问题**: SWR 默认会在窗口聚焦、网络重连等情况下重新验证数据，导致不必要的重新渲染。

**解决方案**: 配置 SWR 禁用不必要的重新验证：

```typescript
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  dedupingInterval: 60000, // 1分钟内去重
}
```

**效果**: 减少不必要的数据重新获取和组件重新渲染。

### 5. ✅ 优化图片加载策略

**问题**: 大量频道 Logo 同时加载，阻塞渲染。

**解决方案**: 
- 添加 `loading="lazy"` 实现懒加载
- 添加 `decoding="async"` 异步解码
- 添加占位符避免布局偏移

```typescript
<Image
  src={channel.logo}
  loading="lazy"
  decoding="async"
  placeholder="blur"
  // ...
/>
```

**效果**: 只加载可见区域的图片，减少初始加载时间。

## 预期性能提升

优化后预期：

- **INP**: 从 7,440 ms 降低到 < 200 ms（优秀）
- **交互响应**: 点击响应时间 < 100 ms
- **渲染性能**: 减少 80%+ 的不必要重新渲染
- **内存使用**: 减少重复计算和对象创建

## 进一步优化建议

如果性能仍有问题，可以考虑：

1. **虚拟滚动**: 如果频道列表很长（> 100 项），使用 `react-window` 或 `react-virtualized` 实现虚拟滚动
2. **代码分割**: 使用 React.lazy 和 Suspense 进行代码分割
3. **Web Workers**: 将数据处理逻辑移到 Web Worker
4. **防抖/节流**: 对频繁的事件（如滚动、输入）使用防抖或节流
5. **数据分页**: 如果数据量很大，考虑分页加载

## 测试建议

1. 使用 Chrome DevTools Performance 面板分析性能
2. 使用 React DevTools Profiler 分析组件渲染
3. 监控 Core Web Vitals 指标
4. 在不同设备上测试（特别是低端设备）

## 监控

建议在生产环境中监控：
- INP (Interaction to Next Paint)
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- CLS (Cumulative Layout Shift)
