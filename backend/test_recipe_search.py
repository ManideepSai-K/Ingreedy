import unittest
from unittest.mock import patch
from fastapi import HTTPException
from main import RecipeRequest, get_recipes, recipe_details, get_recipe_instructions


class RecipeSearchTests(unittest.TestCase):
    def search(self, ingredients, spices=()):
        return get_recipes(RecipeRequest(ingredients=ingredients, spices=list(spices)))["data"]

    def test_everyday_meals(self):
        cases = [
            (["rice", "eggs"], ["butter"], "Simple egg fried rice"),
            (["pasta", "tomatoes", "garlic"], ["olive oil"], "Tomato garlic pasta"),
            (["potatoes", "onion"], ["butter"], "Potato and onion skillet"),
            (["chickpeas", "spinach"], ["garlic", "vegetable oil"], "Chickpea and spinach skillet"),
        ]
        for ingredients, staples, expected in cases:
            with self.subTest(ingredients=ingredients):
                result = self.search(ingredients, staples)[0]
                self.assertEqual(result["title"], expected)
                self.assertEqual(result["missedIngredientCount"], 0)
                details = recipe_details(result["id"])
                self.assertTrue(details["steps"])
                self.assertTrue(details["quantities"])

    def test_chicken_and_rice_covers_both_mains(self):
        result = self.search(["chicken", "rice"], ["butter"])[0]
        self.assertIn("chicken", result["matchedIngredients"])
        self.assertIn("rice", " ".join(result["matchedIngredients"]))
        self.assertTrue(recipe_details(result["id"])["sourceUrl"].startswith("https://www.food.com/recipe/"))

    def test_aliases_and_comma_input(self):
        result = self.search(["SPAGHETTI, tomatoes", "garlic cloves"], ["olive oil"])[0]
        self.assertEqual(result["title"], "Tomato garlic pasta")
        self.assertEqual(result["missedIngredientCount"], 0)
        result = self.search(["garbanzo beans", "baby spinach"], ["garlic", "vegetable oil"])[0]
        self.assertEqual(result["title"], "Chickpea and spinach skillet")

    def test_distinct_foods_do_not_match(self):
        for ingredients in [["eggplant"], ["rice flour"], ["chicken broth"]]:
            with self.subTest(ingredients=ingredients):
                for result in self.search(ingredients, ["butter"]):
                    self.assertNotIn("eggs", result["matchedIngredients"])
                    self.assertNotIn("cooked rice", result["matchedIngredients"])
                    self.assertNotIn("chicken", result["matchedIngredients"])

    def test_no_matches(self):
        for ingredients in [[], ["   "], ["zzzxqv"]]:
            self.assertEqual(self.search(ingredients), [])

    def test_guide_without_api_key_and_invalid_id(self):
        with patch("main.GEMINI_API_KEY", None):
            saved = get_recipe_instructions(900000001)
            self.assertEqual(saved["source"], "saved_recipe")
            self.assertGreater(len(saved["steps"]), 2)
            external = get_recipe_instructions(33954)
            self.assertEqual(external["steps"], [])
            self.assertTrue(external["sourceUrl"])
        with self.assertRaises(HTTPException) as context:
            recipe_details(-1)
        self.assertEqual(context.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
