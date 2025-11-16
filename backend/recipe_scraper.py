"""
外部レシピサイトからレシピ情報をスクレイピングするモジュール
"""
import requests
from bs4 import BeautifulSoup
from typing import Dict, List, Optional
import re


class RecipeScraper:
    """レシピスクレイピングクラス"""
    
    @staticmethod
    def scrape(url: str) -> Optional[Dict]:
        """
        URLからレシピ情報を取得
        
        Args:
            url: レシピのURL
            
        Returns:
            レシピ情報の辞書、または取得失敗時はNone
        """
        try:
            # URLのドメインを判定
            if "cookpad.com" in url:
                return RecipeScraper._scrape_cookpad(url)
            elif "recipe.rakuten.co.jp" in url:
                return RecipeScraper._scrape_rakuten(url)
            else:
                # その他のサイトは汎用スクレイパーで試行
                return RecipeScraper._scrape_generic(url)
        except Exception as e:
            print(f"スクレイピングエラー: {e}")
            return None
    
    @staticmethod
    def _scrape_cookpad(url: str) -> Optional[Dict]:
        """クックパッドからスクレイピング"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # レシピ名
            name_elem = soup.select_one('h1.recipe-title')
            name = name_elem.text.strip() if name_elem else ""
            
            # 材料
            ingredients = []
            ingredient_elems = soup.select('.ingredient_row')
            for elem in ingredient_elems:
                ingredient_name = elem.select_one('.ingredient_name')
                ingredient_quantity = elem.select_one('.ingredient_quantity')
                if ingredient_name and ingredient_quantity:
                    ingredients.append(
                        f"{ingredient_name.text.strip()} {ingredient_quantity.text.strip()}"
                    )
            
            # 手順
            steps = []
            step_elems = soup.select('.step_text')
            for elem in step_elems:
                step_text = elem.text.strip()
                if step_text:
                    steps.append(step_text)
            
            # 調理時間（目安）
            cooking_time = None
            time_elem = soup.select_one('.cooking_time')
            if time_elem:
                time_text = time_elem.text
                # "約30分"のような形式から数値を抽出
                match = re.search(r'(\d+)', time_text)
                if match:
                    cooking_time = int(match.group(1))
            
            return {
                "name": name,
                "ingredients": ingredients,
                "steps": steps,
                "cookingTime": cooking_time,
                "source": url,
                "tags": ["クックパッド"]
            }
            
        except Exception as e:
            print(f"クックパッドスクレイピングエラー: {e}")
            return None
    
    @staticmethod
    def _scrape_rakuten(url: str) -> Optional[Dict]:
        """楽天レシピからスクレイピング"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # レシピ名
            name_elem = soup.select_one('h1.page_title__text')
            name = name_elem.text.strip() if name_elem else ""
            
            # 材料
            ingredients = []
            ingredient_elems = soup.select('.recipe_material__item')
            for elem in ingredient_elems:
                name_elem = elem.select_one('.recipe_material__item_name')
                serving_elem = elem.select_one('.recipe_material__item_serving')
                if name_elem and serving_elem:
                    ingredients.append(
                        f"{name_elem.text.strip()} {serving_elem.text.strip()}"
                    )
            
            # 手順
            steps = []
            step_elems = soup.select('.recipe_howto__text')
            for elem in step_elems:
                step_text = elem.text.strip()
                if step_text:
                    steps.append(step_text)
            
            # 調理時間
            cooking_time = None
            time_elem = soup.select_one('.recipe_material__time')
            if time_elem:
                time_text = time_elem.text
                # "約30分"のような形式から数値を抽出
                match = re.search(r'(\d+)', time_text)
                if match:
                    cooking_time = int(match.group(1))
            
            return {
                "name": name,
                "ingredients": ingredients,
                "steps": steps,
                "cookingTime": cooking_time,
                "source": url,
                "tags": ["楽天レシピ"]
            }
            
        except Exception as e:
            print(f"楽天レシピスクレイピングエラー: {e}")
            return None
    
    @staticmethod
    def _scrape_generic(url: str) -> Optional[Dict]:
        """汎用スクレイパー（schema.org対応）"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # JSON-LDからレシピ情報を探す
            scripts = soup.find_all('script', type='application/ld+json')
            for script in scripts:
                try:
                    import json
                    data = json.loads(script.string)
                    
                    # @typeがRecipeの場合
                    if isinstance(data, dict) and data.get('@type') == 'Recipe':
                        name = data.get('name', '')
                        
                        # 材料
                        ingredients = []
                        recipe_ingredients = data.get('recipeIngredient', [])
                        if isinstance(recipe_ingredients, list):
                            ingredients = recipe_ingredients
                        
                        # 手順
                        steps = []
                        recipe_instructions = data.get('recipeInstructions', [])
                        if isinstance(recipe_instructions, list):
                            for instruction in recipe_instructions:
                                if isinstance(instruction, dict):
                                    step_text = instruction.get('text', '')
                                    if step_text:
                                        steps.append(step_text)
                                elif isinstance(instruction, str):
                                    steps.append(instruction)
                        
                        # 調理時間
                        cooking_time = None
                        total_time = data.get('totalTime', '')
                        if total_time:
                            # ISO 8601形式（例: PT30M）から分を抽出
                            match = re.search(r'PT(\d+)M', total_time)
                            if match:
                                cooking_time = int(match.group(1))
                        
                        return {
                            "name": name,
                            "ingredients": ingredients,
                            "steps": steps,
                            "cookingTime": cooking_time,
                            "source": url,
                            "tags": []
                        }
                        
                except:
                    continue
            
            # JSON-LDで取得できない場合は基本的なスクレイピング
            name_elem = soup.select_one('h1')
            name = name_elem.text.strip() if name_elem else "取り込んだレシピ"
            
            return {
                "name": name,
                "ingredients": [],
                "steps": [],
                "cookingTime": None,
                "source": url,
                "tags": []
            }
            
        except Exception as e:
            print(f"汎用スクレイピングエラー: {e}")
            return None
