import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recipeService } from '../services';
import type { Recipe } from '../types';
import './Recipes.css';

interface RecipeFormData {
  name: string;
  ingredients: string[];
  steps: string[];
  cookingTime?: number;
  source?: string;
  tags: string[];
}

function Recipes() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAiSuggestModalOpen, setIsAiSuggestModalOpen] = useState(false);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [recommendedRecipes, setRecommendedRecipes] = useState<(Recipe & { reason?: string })[]>([]);
  const [recommendTagFilter, setRecommendTagFilter] = useState('');
  const [recommendIngredientFilter, setRecommendIngredientFilter] = useState('');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // レシピ一覧取得
  const loadRecipes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (showFavoritesOnly) params.favorite = true;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      
      const response = await recipeService.getAll(params);
      setRecipes(response.data.data || []);
    } catch (error) {
      console.error('レシピの取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, [showFavoritesOnly, searchQuery]);

  // お気に入り切り替え
  const handleToggleFavorite = async (recipe: Recipe) => {
    try {
      await recipeService.toggleFavorite(recipe.id!, !recipe.isFavorite);
      await loadRecipes();
    } catch (error) {
      console.error('お気に入りの更新に失敗しました:', error);
    }
  };

  // 調理記録
  const handleRecordCooking = async (recipeId: string) => {
    try {
      await recipeService.recordCooking(recipeId);
      await loadRecipes();
    } catch (error) {
      console.error('調理記録に失敗しました:', error);
    }
  };

  // レシピ作成
  const handleCreateRecipe = async (data: RecipeFormData) => {
    try {
      await recipeService.create({
        ...data,
        isFavorite: false,
      });
      setIsCreateModalOpen(false);
      await loadRecipes();
    } catch (error) {
      console.error('レシピの作成に失敗しました:', error);
      alert('レシピの作成に失敗しました');
    }
  };

  // レシピ更新
  const handleUpdateRecipe = async (data: RecipeFormData) => {
    if (!editingRecipe) return;
    try {
      await recipeService.update(editingRecipe.id!, data);
      setEditingRecipe(null);
      await loadRecipes();
    } catch (error) {
      console.error('レシピの更新に失敗しました:', error);
      alert('レシピの更新に失敗しました');
    }
  };

  // レシピ削除
  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('このレシピを削除してもよろしいですか？')) return;
    
    setDeletingId(recipeId);
    try {
      await recipeService.delete(recipeId);
      await loadRecipes();
    } catch (error) {
      console.error('レシピの削除に失敗しました:', error);
      alert('レシピの削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  // レシピ推薦を取得
  const handleGetRecommendations = async () => {
    try {
      setIsRecommendModalOpen(true);
      setRecommendedRecipes([]);
      const response = await recipeService.getRecommendations(
        5, 
        recommendTagFilter || undefined, 
        recommendIngredientFilter || undefined
      );
      setRecommendedRecipes(response.data.data || []);
    } catch (error) {
      console.error('レシピの推薦に失敗しました:', error);
      alert('レシピの推薦に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="recipes-page">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="recipes-page">
      <div className="recipes-header">
        <h1>🍳 レシピ</h1>
        <div className="header-actions">
          <button
            className={`filter-button ${showFavoritesOnly ? 'active' : ''}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            {showFavoritesOnly ? '⭐ お気に入りのみ' : '☆ すべて'}
          </button>
          <button className="create-button" onClick={() => setIsCreateModalOpen(true)}>
            ＋ 新規作成
          </button>
          <button className="import-button" onClick={() => setIsImportModalOpen(true)}>
            🌐 URLから取り込み
          </button>
          <button className="ai-button" onClick={() => setIsAiSuggestModalOpen(true)}>
            ✨ AI提案
          </button>
          <button className="recommend-button" onClick={handleGetRecommendations}>
            🔮 おすすめレシピ
          </button>
        </div>
      </div>

      {/* 検索バー */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 レシピ名、材料、タグで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button
            className="clear-search"
            onClick={() => setSearchQuery('')}
            title="検索をクリア"
          >
            ×
          </button>
        )}
      </div>

      <div className="recipes-grid">
        {recipes.length === 0 ? (
          <div className="no-recipes">
            <p>レシピがまだありません</p>
            <button onClick={() => setIsCreateModalOpen(true)}>最初のレシピを作成</button>
          </div>
        ) : (
          recipes.map((recipe) => (
            <div 
              key={recipe.id} 
              className="recipe-card"
              onClick={() => setViewingRecipe(recipe)}
              style={{ cursor: 'pointer' }}
            >
              <div className="recipe-card-header">
                <h3>{recipe.name}</h3>
                <button
                  className="favorite-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(recipe);
                  }}
                >
                  {recipe.isFavorite ? '⭐' : '☆'}
                </button>
              </div>

              <div className="recipe-info">
                {recipe.cookingTime && (
                  <div className="info-item">
                    <span className="icon">⏱️</span>
                    <span>{recipe.cookingTime}分</span>
                  </div>
                )}
                {recipe.tags.length > 0 && (
                  <div className="recipe-tags">
                    {recipe.tags.map((tag, idx) => (
                      <span key={idx} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="info-item">
                  <span className="icon">📊</span>
                  <span>{recipe.timesCooked}回調理</span>
                </div>
              </div>

              {recipe.ingredients.length > 0 && (
                <div className="ingredients-preview">
                  <h4>材料:</h4>
                  <ul>
                    {recipe.ingredients.slice(0, 3).map((ingredient, idx) => (
                      <li key={idx}>{ingredient}</li>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <li>...他{recipe.ingredients.length - 3}件</li>
                    )}
                  </ul>
                </div>
              )}

              {recipe.source && (
                <a
                  href={recipe.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="recipe-link"
                >
                  🔗 レシピを見る
                </a>
              )}

              <div className="recipe-actions">
                <button
                  className="cook-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRecordCooking(recipe.id!);
                  }}
                >
                  🍴 今日作った
                </button>
                <button
                  className="edit-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingRecipe(recipe);
                  }}
                >
                  ✏️ 編集
                </button>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRecipe(recipe.id!);
                  }}
                  disabled={deletingId === recipe.id}
                >
                  {deletingId === recipe.id ? '削除中...' : '🗑️ 削除'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bottom-nav">
        <button onClick={() => navigate('/')}>🏠 ホームへ戻る</button>
      </div>

      {/* 作成モーダル（仮） */}
      {isCreateModalOpen && (
        <RecipeModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateRecipe}
        />
      )}

      {/* 編集モーダル（仮） */}
      {editingRecipe && (
        <RecipeModal
          recipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSubmit={handleUpdateRecipe}
        />
      )}

      {/* 取り込みモーダル */}
      {isImportModalOpen && (
        <ImportRecipeModal
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleCreateRecipe}
        />
      )}

      {/* AI提案モーダル */}
      {isAiSuggestModalOpen && (
        <AiSuggestModal
          onClose={() => setIsAiSuggestModalOpen(false)}
          onAccept={handleCreateRecipe}
        />
      )}

      {/* 詳細表示モーダル */}
      {viewingRecipe && (
        <RecipeDetailModal
          recipe={viewingRecipe}
          onClose={() => setViewingRecipe(null)}
          onEdit={(recipe) => {
            setViewingRecipe(null);
            setEditingRecipe(recipe);
          }}
        />
      )}

      {/* 推薦モーダル */}
      <RecommendationsModal
        isOpen={isRecommendModalOpen}
        onClose={() => {
          setIsRecommendModalOpen(false);
          setRecommendedRecipes([]);
        }}
        recommendations={recommendedRecipes}
        onViewRecipe={(recipe) => {
          setIsRecommendModalOpen(false);
          setViewingRecipe(recipe);
        }}
        tagFilter={recommendTagFilter}
        ingredientFilter={recommendIngredientFilter}
        onTagFilterChange={setRecommendTagFilter}
        onIngredientFilterChange={setRecommendIngredientFilter}
        onRefresh={handleGetRecommendations}
      />
    </div>
  );
}

// 簡易モーダルコンポーネント（後で分離）
interface RecipeModalProps {
  recipe?: Recipe;
  onClose: () => void;
  onSubmit: (data: RecipeFormData) => void;
}

function RecipeModal({ recipe, onClose, onSubmit }: RecipeModalProps) {
  const [name, setName] = useState(recipe?.name || '');
  const [ingredients, setIngredients] = useState(recipe?.ingredients.join('\n') || '');
  const [steps, setSteps] = useState(recipe?.steps.join('\n') || '');
  const [cookingTime, setCookingTime] = useState(recipe?.cookingTime?.toString() || '');
  const [source, setSource] = useState(recipe?.source || '');
  const [tags, setTags] = useState(recipe?.tags.join(', ') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('レシピ名を入力してください');
      return;
    }

    onSubmit({
      name: name.trim(),
      ingredients: ingredients.split('\n').filter(i => i.trim()),
      steps: steps.split('\n').filter(s => s.trim()),
      cookingTime: cookingTime ? parseInt(cookingTime) : undefined,
      source: source.trim() || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content recipe-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{recipe ? 'レシピ編集' : 'レシピ作成'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>レシピ名 *</label>
            <input
              className="recipe-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: カレーライス"
              required
            />
          </div>

          <div className="form-group">
            <label>材料（1行に1つ）</label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="例:&#10;玉ねぎ 2個&#10;人参 1本&#10;じゃがいも 3個"
              rows={5}
            />
          </div>

          <div className="form-group">
            <label>手順（1行に1つ）</label>
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="例:&#10;1. 野菜を切る&#10;2. 炒める&#10;3. 煮込む"
              rows={6}
            />
          </div>

          <div className="form-group">
            <label>調理時間（分）</label>
            <input
              type="number"
              value={cookingTime}
              onChange={(e) => setCookingTime(e.target.value)}
              placeholder="例: 30"
              min="1"
            />
          </div>

          <div className="form-group">
            <label>レシピURL</label>
            <input
              type="url"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="https://example.com/recipe"
            />
          </div>

          <div className="form-group">
            <label>タグ（カンマ区切り）</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例: カレー, 簡単, 和食"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="submit-button">
              {recipe ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 取り込みモーダルコンポーネント
interface ImportRecipeModalProps {
  onClose: () => void;
  onImport: (data: RecipeFormData) => void;
}

function ImportRecipeModal({ onClose, onImport }: ImportRecipeModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importedData, setImportedData] = useState<any>(null);

  const handleFetch = async () => {
    if (!url.trim()) {
      alert('URLを入力してください');
      return;
    }

    setLoading(true);
    try {
      const response = await recipeService.importFromUrl(url.trim());
      const data = response.data.data;
      
      if (!data || !data.name) {
        alert('レシピ情報を取得できませんでした');
        return;
      }

      setImportedData(data);
    } catch (error: any) {
      console.error('取り込みエラー:', error);
      alert(error.response?.data?.detail || 'レシピの取り込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!importedData) return;
    
    onImport({
      name: importedData.name,
      ingredients: importedData.ingredients || [],
      steps: importedData.steps || [],
      cookingTime: importedData.cookingTime,
      source: importedData.source,
      tags: importedData.tags || [],
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🌐 URLからレシピを取り込む</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {!importedData ? (
          <div className="import-form">
            <p className="import-description">
              クックパッド、楽天レシピなどのレシピURLを入力してください
            </p>
            <div className="form-group">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://cookpad.com/recipe/..."
                disabled={loading}
                className="url-input"
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={onClose}>
                キャンセル
              </button>
              <button
                type="button"
                className="submit-button"
                onClick={handleFetch}
                disabled={loading}
              >
                {loading ? '取り込み中...' : '取り込む'}
              </button>
            </div>
          </div>
        ) : (
          <div className="import-preview">
            <h3>取り込み内容の確認</h3>
            <div className="preview-content">
              <p><strong>レシピ名:</strong> {importedData.name}</p>
              <p><strong>材料:</strong> {importedData.ingredients?.length || 0}件</p>
              <p><strong>手順:</strong> {importedData.steps?.length || 0}件</p>
              {importedData.cookingTime && (
                <p><strong>調理時間:</strong> {importedData.cookingTime}分</p>
              )}
              {importedData.tags && importedData.tags.length > 0 && (
                <p><strong>タグ:</strong> {importedData.tags.join(', ')}</p>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={() => setImportedData(null)}>
                やり直し
              </button>
              <button type="button" className="submit-button" onClick={handleConfirm}>
                保存する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// AI提案モーダルコンポーネント
interface AiSuggestModalProps {
  onClose: () => void;
  onAccept: (data: RecipeFormData) => void;
}

function AiSuggestModal({ onClose, onAccept }: AiSuggestModalProps) {
  const [ingredientsInput, setIngredientsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedRecipe, setSuggestedRecipe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!ingredientsInput.trim()) {
      alert('材料を入力してください');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const ingredients = ingredientsInput
        .split('\n')
        .map(i => i.trim())
        .filter(i => i);
      
      const response = await recipeService.suggestByIngredients(ingredients);
      const data = response.data.data;
      
      if (!data || !data.name) {
        throw new Error('レシピを生成できませんでした');
      }

      setSuggestedRecipe(data);
    } catch (err: any) {
      console.error('AI提案エラー:', err);
      
      if (err.response?.status === 503) {
        setError('AI機能は現在利用できません（APIキーが設定されていません）');
      } else if (err.response?.status === 422) {
        setError('入力形式が正しくありません。材料を正しく入力してください。');
      } else if (err.response?.data?.detail) {
        // FastAPIのエラー詳細がある場合
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError('レシピの生成に失敗しました');
        }
      } else {
        setError('レシピの生成に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!suggestedRecipe) return;
    
    onAccept({
      name: suggestedRecipe.name,
      ingredients: suggestedRecipe.ingredients || [],
      steps: suggestedRecipe.steps || [],
      cookingTime: suggestedRecipe.cookingTime,
      source: undefined,
      tags: suggestedRecipe.tags || [],
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✨ AIレシピ提案</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {!suggestedRecipe ? (
          <div className="ai-form">
            <p className="ai-description">
              手持ちの材料を入力すると、AIがレシピを提案します
            </p>
            <div className="form-group">
              <label>材料（1行に1つ）</label>
              <textarea
                value={ingredientsInput}
                onChange={(e) => setIngredientsInput(e.target.value)}
                placeholder="例:&#10;鶏もも肉&#10;玉ねぎ&#10;カレールー"
                rows={6}
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="error-message">{error}</div>
            )}
            
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={onClose}>
                キャンセル
              </button>
              <button
                type="button"
                className="submit-button"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? '生成中...' : 'レシピを生成'}
              </button>
            </div>
          </div>
        ) : (
          <div className="ai-preview">
            <h3>提案されたレシピ</h3>
            <div className="preview-content">
              <p><strong>レシピ名:</strong> {suggestedRecipe.name}</p>
              <p><strong>材料:</strong> {suggestedRecipe.ingredients?.length || 0}件</p>
              <p><strong>手順:</strong> {suggestedRecipe.steps?.length || 0}件</p>
              {suggestedRecipe.cookingTime && (
                <p><strong>調理時間:</strong> {suggestedRecipe.cookingTime}分</p>
              )}
              {suggestedRecipe.tags && suggestedRecipe.tags.length > 0 && (
                <p><strong>タグ:</strong> {suggestedRecipe.tags.join(', ')}</p>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={() => setSuggestedRecipe(null)}>
                やり直し
              </button>
              <button type="button" className="submit-button" onClick={handleAccept}>
                保存する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// レシピ詳細表示モーダル
interface RecipeDetailModalProps {
  recipe: Recipe;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
}

function RecipeDetailModal({ recipe, onClose, onEdit }: RecipeDetailModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content recipe-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🍳 {recipe.name}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="recipe-detail-content">
          {/* 基本情報 */}
          <div className="detail-section">
            <div className="detail-info-grid">
              {recipe.cookingTime && (
                <div className="detail-info-item">
                  <span className="detail-icon">⏱️</span>
                  <div>
                    <div className="detail-label">調理時間</div>
                    <div className="detail-value">{recipe.cookingTime}分</div>
                  </div>
                </div>
              )}
              <div className="detail-info-item">
                <span className="detail-icon">📊</span>
                <div>
                  <div className="detail-label">調理回数</div>
                  <div className="detail-value">{recipe.timesCooked}回</div>
                </div>
              </div>
              {recipe.isFavorite && (
                <div className="detail-info-item">
                  <span className="detail-icon">⭐</span>
                  <div>
                    <div className="detail-label">お気に入り</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* タグ */}
          {recipe.tags.length > 0 && (
            <div className="detail-section">
              <h3>🏷️ タグ</h3>
              <div className="recipe-tags">
                {recipe.tags.map((tag, idx) => (
                  <span key={idx} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* 材料 */}
          {recipe.ingredients.length > 0 && (
            <div className="detail-section">
              <h3>🥕 材料</h3>
              <ul className="detail-list">
                {recipe.ingredients.map((ingredient, idx) => (
                  <li key={idx}>{ingredient}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 手順 */}
          {recipe.steps.length > 0 && (
            <div className="detail-section">
              <h3>📝 手順</h3>
              <ol className="detail-steps">
                {recipe.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* レシピURL */}
          {recipe.source && (
            <div className="detail-section">
              <h3>🔗 参照元</h3>
              <a
                href={recipe.source}
                target="_blank"
                rel="noopener noreferrer"
                className="recipe-link"
              >
                {recipe.source}
              </a>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onClose}
          >
            閉じる
          </button>
          <button
            type="button"
            className="submit-button"
            onClick={() => onEdit(recipe)}
          >
            ✏️ 編集
          </button>
        </div>
      </div>
    </div>
  );
}

// レシピ推薦モーダル
function RecommendationsModal({
  isOpen,
  onClose,
  recommendations,
  onViewRecipe,
  tagFilter,
  ingredientFilter,
  onTagFilterChange,
  onIngredientFilterChange,
  onRefresh
}: {
  isOpen: boolean;
  onClose: () => void;
  recommendations: (Recipe & { reason?: string })[];
  onViewRecipe: (recipe: Recipe) => void;
  tagFilter: string;
  ingredientFilter: string;
  onTagFilterChange: (value: string) => void;
  onIngredientFilterChange: (value: string) => void;
  onRefresh: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal recommend-modal" onClick={(e) => e.stopPropagation()}>
        <h2>🔮 おすすめのレシピ</h2>
        
        {/* フィルター */}
        <div className="recommend-filters">
          <div className="filter-group">
            <label>タグでフィルター:</label>
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => onTagFilterChange(e.target.value)}
              placeholder="例: 洋食、和食"
            />
          </div>
          <div className="filter-group">
            <label>材料でフィルター:</label>
            <input
              type="text"
              value={ingredientFilter}
              onChange={(e) => onIngredientFilterChange(e.target.value)}
              placeholder="例: さつまいも"
            />
          </div>
          <button className="refresh-button" onClick={onRefresh}>
            🔄 再読み込み
          </button>
        </div>
        
        {recommendations.length === 0 ? (
          <div className="no-recommendations">
            <p>おすすめのレシピを準備中...</p>
            <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
              調理記録が増えると、より精度の高いおすすめができます
            </p>
          </div>
        ) : (
          <div className="recommendations-list">
            {recommendations.map((recipe, index) => (
              <div key={recipe.id} className="recommendation-card">
                <div className="recommendation-header">
                  <h3>
                    {index + 1}. {recipe.name}
                  </h3>
                  <div className="recipe-meta">
                    {recipe.cookingTime && (
                      <span className="cooking-time">⏱️ {recipe.cookingTime}分</span>
                    )}
                    <span className="times-cooked">📊 {recipe.timesCooked}回作成</span>
                  </div>
                </div>
                
                {recipe.reason && (
                  <div className="recommendation-reason">
                    <strong>💡 推薦理由:</strong>
                    <p>{recipe.reason}</p>
                  </div>
                )}
                
                {recipe.tags.length > 0 && (
                  <div className="recipe-tags">
                    {recipe.tags.map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                
                <button
                  className="view-recipe-button"
                  onClick={() => onViewRecipe(recipe)}
                >
                  詳細を見る
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="cancel-button" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export default Recipes;
