import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  email: string;
  name: string;
}

export interface BrewTemplate {
  id: string;
  name: string;
  fields: BrewTemplateField[];
}

export interface BrewTemplateField {
  id: string;
  label: string;
  type: "text" | "number" | "rating" | "select";
  required: boolean;
  options?: string[]; // For select type
}

export interface BrewNotes {
  templateId?: string;
  fields: Record<string, any>;
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

export interface RecipeStep {
  description: string;
  waterAmount: number; // in grams
  duration: number; // in seconds
}

export interface Recipe {
  id: string;
  name: string;
  grinderId: string;
  brewerId: string;
  ratio: string;
  dose: number;
  photo?: string;
  process: string; // Keep for backward compatibility
  processSteps?: RecipeStep[]; // New structured steps
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
  currentWeight: number;
  purchaseDate: string;
  notes?: string;
  isActive: boolean;
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
  lowStockThreshold?: number;
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
  templateNotes?: BrewNotes;
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
  brewTemplates: BrewTemplate[];
  addBrewTemplate: (template: Omit<BrewTemplate, "id">) => void;
  updateBrewTemplate: (id: string, template: Partial<BrewTemplate>) => void;
  deleteBrewTemplate: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  const [brewers, setBrewers] = useState<Brewer[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [coffeeBeans, setCoffeeBeans] = useState<CoffeeBean[]>([]);
  const [brews, setBrews] = useState<Brew[]>([]);
  const [brewTemplates, setBrewTemplates] = useState<BrewTemplate[]>([]);

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
    
    const storedTemplates = localStorage.getItem("brewTemplates");
    if (storedTemplates) setBrewTemplates(JSON.parse(storedTemplates));
  }, []);

  const login = async (email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (user) {
      const loggedInUser = { email: user.email, name: user.name };
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
    } else {
      const emailExists = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        throw new Error("Incorrect password");
      } else {
        throw new Error("No account found with this email. Please sign up first.");
      }
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
    users.push({ email: email.toLowerCase(), password, name });
    localStorage.setItem("users", JSON.stringify(users));
    const newUser = { email: email.toLowerCase(), name };
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

  const addBrewTemplate = (template: Omit<BrewTemplate, "id">) => {
    const newTemplate = { ...template, id: Date.now().toString() };
    const updated = [...brewTemplates, newTemplate];
    setBrewTemplates(updated);
    localStorage.setItem("brewTemplates", JSON.stringify(updated));
  };

  const updateBrewTemplate = (id: string, template: Partial<BrewTemplate>) => {
    const updated = brewTemplates.map((t) => (t.id === id ? { ...t, ...template } : t));
    setBrewTemplates(updated);
    localStorage.setItem("brewTemplates", JSON.stringify(updated));
  };

  const deleteBrewTemplate = (id: string) => {
    const updated = brewTemplates.filter((t) => t.id !== id);
    setBrewTemplates(updated);
    localStorage.setItem("brewTemplates", JSON.stringify(updated));
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
        brewTemplates,
        addBrewTemplate,
        updateBrewTemplate,
        deleteBrewTemplate,
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
