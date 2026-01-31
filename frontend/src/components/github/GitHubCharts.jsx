import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  GitCommit,
  Code,
  Activity,
} from 'lucide-react';
import githubService from '../../services/githubService';

function GitHubCharts({ owner, repo, isMobile }) {
  const [commitActivity, setCommitActivity] = useState([]);
  const [codeFrequency, setCodeFrequency] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChart, setActiveChart] = useState('activity');

  useEffect(() => {
    fetchChartData();
  }, [owner, repo]);

  const fetchChartData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [activityData, frequencyData, languagesData] = await Promise.all([
        githubService.getCommitActivity(owner, repo).catch(() => ({ activity: [] })),
        githubService.getCodeFrequency(owner, repo).catch(() => ({ frequency: [] })),
        githubService.getLanguages(owner, repo).catch(() => ({ languages: [] })),
      ]);

      // Process commit activity data
      const processedActivity = (activityData.activity || [])
        .filter((week) => week.total > 0)
        .map((week) => ({
          date: new Date(week.week * 1000).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
          }),
          fullDate: new Date(week.week * 1000).toLocaleDateString('zh-CN'),
          commits: week.total,
          additions: week.days.reduce((a, b) => a + b, 0),
        }))
        .slice(-12); // Last 12 weeks

      // Process code frequency data
      const processedFrequency = (frequencyData.frequency || [])
        .map((week) => ({
          date: new Date(week.week * 1000).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
          }),
          fullDate: new Date(week.week * 1000).toLocaleDateString('zh-CN'),
          additions: week.additions,
          deletions: Math.abs(week.deletions),
        }))
        .slice(-12);

      setCommitActivity(processedActivity);
      setCodeFrequency(processedFrequency);
      setLanguages(languagesData.languages || []);
    } catch (err) {
      setError(err.message || '获取图表数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // Language colors
  const languageColors = {
    JavaScript: '#f1e05a',
    TypeScript: '#2b7489',
    Python: '#3572A5',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#239120',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#ffac45',
    Kotlin: '#A97BFF',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Vue: '#41b883',
    React: '#61dafb',
  };

  const CHART_TYPES = [
    { id: 'activity', label: '提交活动', icon: Activity },
    { id: 'frequency', label: '代码频率', icon: Code },
    { id: 'languages', label: '语言分布', icon: GitCommit },
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-destructive mb-2">{error}</p>
        <button
          onClick={fetchChartData}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Chart Type Selector */}
        <div className="flex flex-wrap gap-2">
          {CHART_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setActiveChart(type.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeChart === type.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Commit Activity Chart */}
        {activeChart === 'activity' && (
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                提交活动趋势
              </h3>
              {commitActivity.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={commitActivity}>
                      <defs>
                        <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="commits"
                        name="提交数"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorCommits)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <p>暂无提交活动数据</p>
                </div>
              )}
            </div>

            {/* Weekly Stats */}
            {commitActivity.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">总提交数</p>
                  <p className="text-2xl font-bold">
                    {commitActivity.reduce((sum, week) => sum + week.commits, 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">平均每周提交</p>
                  <p className="text-2xl font-bold">
                    {Math.round(
                      commitActivity.reduce((sum, week) => sum + week.commits, 0) /
                        commitActivity.length
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">最高周提交</p>
                  <p className="text-2xl font-bold">
                    {Math.max(...commitActivity.map((week) => week.commits)).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Code Frequency Chart */}
        {activeChart === 'frequency' && (
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Code className="w-4 h-4" />
                代码增删趋势
              </h3>
              {codeFrequency.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={codeFrequency}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="additions"
                        name="新增行数"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="deletions"
                        name="删除行数"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <p>暂无代码频率数据</p>
                </div>
              )}
            </div>

            {/* Code Stats */}
            {codeFrequency.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-1">总新增行数</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    +
                    {codeFrequency
                      .reduce((sum, week) => sum + week.additions, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300 mb-1">总删除行数</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    -
                    {codeFrequency
                      .reduce((sum, week) => sum + week.deletions, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Languages Pie Chart */}
        {activeChart === 'languages' && (
          <div className="space-y-4">
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <GitCommit className="w-4 h-4" />
                编程语言分布
              </h3>
              {languages.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={languages.slice(0, 8)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) => `${name} ${percentage}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="bytes"
                          nameKey="name"
                        >
                          {languages.slice(0, 8).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={languageColors[entry.name] || '#8b949e'}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => [
                            `${props.payload.percentage}%`,
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {languages.map((lang) => (
                      <div
                        key={lang.name}
                        className="flex items-center justify-between p-2 hover:bg-accent rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                languageColors[lang.name] || '#8b949e',
                            }}
                          />
                          <span className="font-medium">{lang.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">{lang.percentage}%</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(lang.bytes / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <p>暂无语言数据</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="p-4 border border-border rounded-lg">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            数据概览
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {commitActivity.length > 0
                  ? commitActivity[commitActivity.length - 1]?.commits || 0
                  : 0}
              </p>
              <p className="text-xs text-muted-foreground">最近一周提交</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {languages.length}
              </p>
              <p className="text-xs text-muted-foreground">编程语言</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {codeFrequency.length > 0
                  ? (
                      codeFrequency.reduce((sum, week) => sum + week.additions, 0) /
                      1000
                    ).toFixed(1) + 'K'
                  : '0'}
              </p>
              <p className="text-xs text-muted-foreground">新增代码 (KB)</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">
                {codeFrequency.length > 0
                  ? (
                      codeFrequency.reduce((sum, week) => sum + week.deletions, 0) /
                      1000
                    ).toFixed(1) + 'K'
                  : '0'}
              </p>
              <p className="text-xs text-muted-foreground">删除代码 (KB)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GitHubCharts;
