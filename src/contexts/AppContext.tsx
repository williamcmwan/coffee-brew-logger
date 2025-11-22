import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  email: string;
  name: string;
}

export interface Grinder {
  id: string;
  model: string;
  photo?: string;
  burrType: "conical" | "flat";
  idealFor: "pour-over" | "espresso" | "both";
}

export interface Brewer {
  id: string;
  model: string;
  photo?: string;
  type: "espresso" | "pour-over";
}

export interface Recipe {
  id: string;
  name: string;
  grinderId: string;
  brewerId: string;
  ratio: string;
  dose: number;
  photo?: string;
  process: string;
  grindSize: number;
  water: number;
  yield: number;
  temperature: number;
  brewTime: string;
  favorite?: boolean;
}

export interface CoffeeBatch {
  id: string;
  price: number;
  roastDate: string;
  weight: number;
}

export interface CoffeeBean {
  id: string;
  photo?: string;
  name: string;
  roaster: string;
  country: string;
  region: string;
  altitude: string;
  varietal: string;
  process: string;
  roastLevel: string;
  tastingNotes: string;
  url?: string;
  batches: CoffeeBatch[];
  favorite?: boolean;
}

export interface Brew {
  id: string;
  date: string;
  coffeeBeanId: string;
  batchId: string;
  grinderId: string;
  brewerId: string;
  recipeId: string;
  dose: number;
  grindSize: number;
  water: number;
  yield: number;
  temperature: number;
  brewTime: string;
  tds?: number;
  extractionYield?: number;
  rating?: number;
  comment?: string;
  photo?: string;
  favorite?: boolean;
}

interface AppContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  grinders: Grinder[];
  addGrinder: (grinder: Omit<Grinder, "id">) => void;
  updateGrinder: (id: string, grinder: Partial<Grinder>) => void;
  deleteGrinder: (id: string) => void;
  brewers: Brewer[];
  addBrewer: (brewer: Omit<Brewer, "id">) => void;
  updateBrewer: (id: string, brewer: Partial<Brewer>) => void;
  deleteBrewer: (id: string) => void;
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, "id">) => void;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
  toggleRecipeFavorite: (id: string) => void;
  coffeeBeans: CoffeeBean[];
  addCoffeeBean: (bean: Omit<CoffeeBean, "id">) => void;
  updateCoffeeBean: (id: string, bean: Partial<CoffeeBean>) => void;
  deleteCoffeeBean: (id: string) => void;
  toggleCoffeeBeanFavorite: (id: string) => void;
  brews: Brew[];
  addBrew: (brew: Omit<Brew, "id">) => void;
  updateBrew: (id: string, brew: Partial<Brew>) => void;
  toggleBrewFavorite: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  const [brewers, setBrewers] = useState<Brewer[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [coffeeBeans, setCoffeeBeans] = useState<CoffeeBean[]>([]);
  const [brews, setBrews] = useState<Brew[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    
    const storedGrinders = localStorage.getItem("grinders");
    if (storedGrinders) setGrinders(JSON.parse(storedGrinders));
    
    const storedBrewers = localStorage.getItem("brewers");
    if (storedBrewers) setBrewers(JSON.parse(storedBrewers));
    
    const storedRecipes = localStorage.getItem("recipes");
    if (storedRecipes) setRecipes(JSON.parse(storedRecipes));
    
    const storedBeans = localStorage.getItem("coffeeBeans");
    if (storedBeans) setCoffeeBeans(JSON.parse(storedBeans));
    
    const storedBrews = localStorage.getItem("brews");
    if (storedBrews) setBrews(JSON.parse(storedBrews));
  }, []);

  const login = async (email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u: any) => u.email === email && u.password === password);
    if (user) {
      const loggedInUser = { email: user.email, name: user.name };
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
    } else {
      throw new Error("Invalid credentials");
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.find((u: any) => u.email === email)) {
      throw new Error("User already exists");
    }
    users.push({ email, password, name });
    localStorage.setItem("users", JSON.stringify(users));
    const newUser = { email, name };
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const addGrinder = (grinder: Omit<Grinder, "id">) => {
    const newGrinder = { ...grinder, id: Date.now().toString() };
    const updated = [...grinders, newGrinder];
    setGrinders(updated);
    localStorage.setItem("grinders", JSON.stringify(updated));
  };

  const updateGrinder = (id: string, grinder: Partial<Grinder>) => {
    const updated = grinders.map((g) => (g.id === id ? { ...g, ...grinder } : g));
    setGrinders(updated);
    localStorage.setItem("grinders", JSON.stringify(updated));
  };

  const deleteGrinder = (id: string) => {
    const updated = grinders.filter((g) => g.id !== id);
    setGrinders(updated);
    localStorage.setItem("grinders", JSON.stringify(updated));
  };

  const addBrewer = (brewer: Omit<Brewer, "id">) => {
    const newBrewer = { ...brewer, id: Date.now().toString() };
    const updated = [...brewers, newBrewer];
    setBrewers(updated);
    localStorage.setItem("brewers", JSON.stringify(updated));
  };

  const updateBrewer = (id: string, brewer: Partial<Brewer>) => {
    const updated = brewers.map((b) => (b.id === id ? { ...b, ...brewer } : b));
    setBrewers(updated);
    localStorage.setItem("brewers", JSON.stringify(updated));
  };

  const deleteBrewer = (id: string) => {
    const updated = brewers.filter((b) => b.id !== id);
    setBrewers(updated);
    localStorage.setItem("brewers", JSON.stringify(updated));
  };

  const addRecipe = (recipe: Omit<Recipe, "id">) => {
    const newRecipe = { ...recipe, id: Date.now().toString() };
    const updated = [...recipes, newRecipe];
    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
  };

  const updateRecipe = (id: string, recipe: Partial<Recipe>) => {
    const updated = recipes.map((r) => (r.id === id ? { ...r, ...recipe } : r));
    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
  };

  const deleteRecipe = (id: string) => {
    const updated = recipes.filter((r) => r.id !== id);
    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
  };

  const addCoffeeBean = (bean: Omit<CoffeeBean, "id">) => {
    const newBean = { ...bean, id: Date.now().toString() };
    const updated = [...coffeeBeans, newBean];
    setCoffeeBeans(updated);
    localStorage.setItem("coffeeBeans", JSON.stringify(updated));
  };

  const updateCoffeeBean = (id: string, bean: Partial<CoffeeBean>) => {
    const updated = coffeeBeans.map((b) => (b.id === id ? { ...b, ...bean } : b));
    setCoffeeBeans(updated);
    localStorage.setItem("coffeeBeans", JSON.stringify(updated));
  };

  const deleteCoffeeBean = (id: string) => {
    const updated = coffeeBeans.filter((b) => b.id !== id);
    setCoffeeBeans(updated);
    localStorage.setItem("coffeeBeans", JSON.stringify(updated));
  };

  const addBrew = (brew: Omit<Brew, "id">) => {
    const newBrew = { ...brew, id: Date.now().toString(), date: new Date().toISOString() };
    const updated = [newBrew, ...brews];
    setBrews(updated);
    localStorage.setItem("brews", JSON.stringify(updated));
  };

  const updateBrew = (id: string, brew: Partial<Brew>) => {
    const updated = brews.map((b) => (b.id === id ? { ...b, ...brew } : b));
    setBrews(updated);
    localStorage.setItem("brews", JSON.stringify(updated));
  };

  const toggleRecipeFavorite = (id: string) => {
    const updated = recipes.map((r) => 
      r.id === id ? { ...r, favorite: !r.favorite } : r
    );
    setRecipes(updated);
    localStorage.setItem("recipes", JSON.stringify(updated));
  };

  const toggleCoffeeBeanFavorite = (id: string) => {
    const updated = coffeeBeans.map((b) => 
      b.id === id ? { ...b, favorite: !b.favorite } : b
    );
    setCoffeeBeans(updated);
    localStorage.setItem("coffeeBeans", JSON.stringify(updated));
  };

  const toggleBrewFavorite = (id: string) => {
    const updated = brews.map((b) => 
      b.id === id ? { ...b, favorite: !b.favorite } : b
    );
    setBrews(updated);
    localStorage.setItem("brews", JSON.stringify(updated));
  };

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        grinders,
        addGrinder,
        updateGrinder,
        deleteGrinder,
        brewers,
        addBrewer,
        updateBrewer,
        deleteBrewer,
        recipes,
        addRecipe,
        updateRecipe,
        deleteRecipe,
        toggleRecipeFavorite,
        coffeeBeans,
        addCoffeeBean,
        updateCoffeeBean,
        deleteCoffeeBean,
        toggleCoffeeBeanFavorite,
        brews,
        addBrew,
        updateBrew,
        toggleBrewFavorite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
