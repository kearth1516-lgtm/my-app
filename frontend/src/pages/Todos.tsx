import { useState, useEffect } from 'react';
import { todoService } from '../services/todos';
import type { Todo } from '../services/todos';
import './Todos.css';

function Todos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterCompleted, setFilterCompleted] = useState<boolean | undefined>(undefined);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());
  
  // 新規タスクフォーム
  const [newTodo, setNewTodo] = useState<Partial<Todo>>({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    category: '',
    tags: [],
    subtasks: [],
  });

  useEffect(() => {
    loadTodos();
  }, [filterPriority, filterCompleted]);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const response = await todoService.getAll({
        priority: filterPriority || undefined,
        completed: filterCompleted,
      });
      
      // フロントエンド側でソート（未完了タスク優先、締切が近い順）
      const sortedTodos = response.data.data.sort((a, b) => {
        // 完了状態でソート（未完了が先）
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        // 締切でソート（早い順）
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
      
      setTodos(sortedTodos);
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.title?.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    try {
      await todoService.create({
        title: newTodo.title,
        description: newTodo.description,
        priority: newTodo.priority || 'medium',
        dueDate: newTodo.dueDate || undefined,
        category: newTodo.category || undefined,
        tags: newTodo.tags || [],
        subtasks: newTodo.subtasks || [],
      });
      
      setShowAddForm(false);
      setNewTodo({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        category: '',
        tags: [],
        subtasks: [],
      });
      loadTodos();
    } catch (error) {
      console.error('Failed to create todo:', error);
      alert('タスクの作成に失敗しました');
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      if (todo.completed) {
        await todoService.update(todo.id!, { completed: false });
      } else {
        await todoService.complete(todo.id!);
      }
      loadTodos();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (!confirm('このタスクを削除しますか？')) return;
    
    try {
      await todoService.delete(id);
      loadTodos();
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleToggleSubtask = async (todo: Todo, subtaskId: string) => {
    const updatedSubtasks = todo.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    
    try {
      await todoService.update(todo.id!, { subtasks: updatedSubtasks });
      loadTodos();
    } catch (error) {
      console.error('Failed to update subtask:', error);
    }
  };

  const toggleExpanded = (todoId: string) => {
    setExpandedTodos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(todoId)) {
        newSet.delete(todoId);
      } else {
        newSet.add(todoId);
      }
      return newSet;
    });
  };

  const addSubtask = () => {
    const title = prompt('サブタスクのタイトル:');
    if (!title) return;
    
    setNewTodo(prev => ({
      ...prev,
      subtasks: [
        ...(prev.subtasks || []),
        { id: `temp-${Date.now()}`, title, completed: false }
      ]
    }));
  };

  const removeSubtask = (subtaskId: string) => {
    setNewTodo(prev => ({
      ...prev,
      subtasks: (prev.subtasks || []).filter(st => st.id !== subtaskId)
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `期限切れ (${Math.abs(diffDays)}日前)`;
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '明日';
    return `${diffDays}日後`;
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const groupByPriority = () => {
    const groups: { [key: string]: Todo[] } = {
      high: [],
      medium: [],
      low: [],
    };
    
    todos.forEach(todo => {
      if (groups[todo.priority]) {
        groups[todo.priority].push(todo);
      }
    });
    
    return groups;
  };

  const priorityGroups = groupByPriority();

  return (
    <div className="todos-container">
      <div className="todos-header">
        <h1>📝 やることリスト</h1>
        <div className="header-actions">
          <select
            className="filter-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">すべての優先度</option>
            <option value="high">高優先度</option>
            <option value="medium">中優先度</option>
            <option value="low">低優先度</option>
          </select>
          
          <select
            className="filter-select"
            value={filterCompleted === undefined ? '' : filterCompleted.toString()}
            onChange={(e) => setFilterCompleted(e.target.value === '' ? undefined : e.target.value === 'true')}
          >
            <option value="">すべて</option>
            <option value="false">未完了</option>
            <option value="true">完了済み</option>
          </select>
          
          <button className="btn-add-todo" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '✕ キャンセル' : '+ 新規タスク'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-todo-form">
          <h3>新規タスク</h3>
          <input
            type="text"
            placeholder="タイトル *"
            className="form-input"
            value={newTodo.title}
            onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
          />
          <textarea
            placeholder="説明"
            className="form-textarea"
            value={newTodo.description}
            onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
          />
          <div className="form-row">
            <select
              className="form-select"
              value={newTodo.priority}
              onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as any })}
            >
              <option value="high">高優先度</option>
              <option value="medium">中優先度</option>
              <option value="low">低優先度</option>
            </select>
            <input
              type="date"
              className="form-input"
              value={newTodo.dueDate}
              onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
            />
          </div>
          <input
            type="text"
            placeholder="カテゴリ"
            className="form-input"
            value={newTodo.category}
            onChange={(e) => setNewTodo({ ...newTodo, category: e.target.value })}
          />
          
          <div className="subtasks-section">
            <div className="subtasks-header">
              <span>サブタスク</span>
              <button className="btn-add-subtask" onClick={addSubtask}>+ 追加</button>
            </div>
            {(newTodo.subtasks || []).map(st => (
              <div key={st.id} className="subtask-item">
                <span>{st.title}</span>
                <button onClick={() => removeSubtask(st.id)}>✕</button>
              </div>
            ))}
          </div>
          
          <div className="form-actions">
            <button className="btn-create" onClick={handleAddTodo}>作成</button>
            <button className="btn-cancel" onClick={() => setShowAddForm(false)}>キャンセル</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">読み込み中...</div>
      ) : todos.length === 0 ? (
        <div className="empty-state">
          <p>タスクがありません</p>
          <button className="btn-add-first" onClick={() => setShowAddForm(true)}>
            最初のタスクを作成
          </button>
        </div>
      ) : (
        <div className="priority-groups">
          {(['high', 'medium', 'low'] as const).map(priority => {
            const priorityTodos = priorityGroups[priority];
            if (priorityTodos.length === 0 && filterPriority) return null;
            
            return (
              <div key={priority} className="priority-group">
                <h2 className="priority-header" style={{ borderLeftColor: getPriorityColor(priority) }}>
                  {getPriorityLabel(priority)}優先度 ({priorityTodos.length})
                </h2>
                <div className="todos-list">
                  {priorityTodos.map(todo => (
                    <div
                      key={todo.id}
                      className={`todo-card ${todo.completed ? 'completed' : ''} ${isOverdue(todo.dueDate) && !todo.completed ? 'overdue' : ''}`}
                    >
                      <div className="todo-header">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggleComplete(todo)}
                          className="todo-checkbox"
                        />
                        <h3 className="todo-title">{todo.title}</h3>
                        <button
                          className="btn-delete-todo"
                          onClick={() => handleDeleteTodo(todo.id!)}
                        >
                          ✕
                        </button>
                      </div>
                      
                      {todo.description && (
                        <p className="todo-description">{todo.description}</p>
                      )}
                      
                      <div className="todo-meta">
                        {todo.dueDate && (
                          <span className={`todo-due ${isOverdue(todo.dueDate) && !todo.completed ? 'overdue' : ''}`}>
                            📅 {formatDate(todo.dueDate)}
                          </span>
                        )}
                        {todo.category && (
                          <span className="todo-category">🏷️ {todo.category}</span>
                        )}
                      </div>
                      
                      {todo.tags.length > 0 && (
                        <div className="todo-tags">
                          {todo.tags.map(tag => (
                            <span key={tag} className="todo-tag">{tag}</span>
                          ))}
                        </div>
                      )}
                      
                      {todo.subtasks.length > 0 && (
                        <div className="subtasks">
                          <button
                            className="subtasks-toggle"
                            onClick={() => toggleExpanded(todo.id!)}
                          >
                            {expandedTodos.has(todo.id!) ? '▼' : '▶'} サブタスク ({todo.subtasks.filter(st => st.completed).length}/{todo.subtasks.length})
                          </button>
                          {expandedTodos.has(todo.id!) && (
                            <div className="subtasks-list">
                              {todo.subtasks.map(subtask => (
                                <label key={subtask.id} className="subtask">
                                  <input
                                    type="checkbox"
                                    checked={subtask.completed}
                                    onChange={() => handleToggleSubtask(todo, subtask.id)}
                                  />
                                  <span className={subtask.completed ? 'completed' : ''}>
                                    {subtask.title}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <nav className="bottom-nav">
        <a href="/" className="nav-item">
          🏠 ホーム
        </a>
      </nav>
    </div>
  );
}

export default Todos;
