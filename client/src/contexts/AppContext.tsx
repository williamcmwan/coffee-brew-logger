import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, setAuthToken, clearAuth, getAuthToken } from "@/lib/api";

export interface User {
  id: number;
  email: string;
  name: string;
  authProvider?: string;
  avatarUrl?: string;
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
  options?: string[];
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

export interface CoffeeServer {
  id: string;
  model: string;
  photo?: string;
  maxVolume?: number;
  emptyWeight?: number;
}

export interface RecipeStep {
  description: string;
  waterAmount: number;
  duration: number;
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
  processSteps?: RecipeStep[];
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
  roastFor: "pour-over" | "espresso" | "";
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
  coffeeServerId?: string;
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
  signup: (email: string, password: string, confirmPassword: string, name: string) => Promise<void>;
  socialLogin: (provider: 'google' | 'apple', idToken: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmNewPassword: string) => Promise<void>;
  logout: () => void;
  grinders: Grinder[];
  addGrinder: (grinder: Omit<Grinder, "id">) => Promise<void>;
  updateGrinder: (id: string, grinder: Partial<Grinder>) => Promise<void>;
  deleteGrinder: (id: string) => Promise<void>;
  brewers: Brewer[];
  addBrewer: (brewer: Omit<Brewer, "id">) => Promise<void>;
  updateBrewer: (id: string, brewer: Partial<Brewer>) => Promise<void>;
  deleteBrewer: (id: string) => Promise<void>;
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, "id">) => Promise<void>;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  toggleRecipeFavorite: (id: string) => Promise<void>;
  coffeeBeans: CoffeeBean[];
  addCoffeeBean: (bean: Omit<CoffeeBean, "id">) => Promise<void>;
  updateCoffeeBean: (id: string, bean: Partial<CoffeeBean>) => Promise<void>;
  deleteCoffeeBean: (id: string) => Promise<void>;
  toggleCoffeeBeanFavorite: (id: string) => Promise<void>;
  brews: Brew[];
  addBrew: (brew: Omit<Brew, "id">) => Promise<void>;
  updateBrew: (id: string, brew: Partial<Brew>) => Promise<void>;
  deleteBrew: (id: string) => Promise<void>;
  toggleBrewFavorite: (id: string) => Promise<void>;
  brewTemplates: BrewTemplate[];
  addBrewTemplate: (template: Omit<BrewTemplate, "id">) => Promise<void>;
  updateBrewTemplate: (id: string, template: Partial<BrewTemplate>) => Promise<void>;
  deleteBrewTemplate: (id: string) => Promise<void>;
  coffeeServers: CoffeeServer[];
  addCoffeeServer: (server: Omit<CoffeeServer, "id">) => Promise<void>;
  updateCoffeeServer: (id: string, server: Partial<CoffeeServer>) => Promise<void>;
  deleteCoffeeServer: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initialize user from localStorage synchronously to prevent flash
const getInitialUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem("user");
    const storedToken = getAuthToken();
    if (storedUser && storedToken) {
      return JSON.parse(storedUser);
    }
  } catch (e) {
    console.error('Failed to parse stored user:', e);
  }
  return null;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [grinders, setGrinders] = useState<Grinder[]>([]);
  const [brewers, setBrewers] = useState<Brewer[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [coffeeBeans, setCoffeeBeans] = useState<CoffeeBean[]>([]);
  const [brews, setBrews] = useState<Brew[]>([]);
  const [brewTemplates, setBrewTemplates] = useState<BrewTemplate[]>([]);
  const [coffeeServers, setCoffeeServers] = useState<CoffeeServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [grindersData, brewersData, recipesData, beansData, brewsData, templatesData, serversData] = 
        await Promise.all([
          api.grinders.list(),
          api.brewers.list(),
          api.recipes.list(),
          api.coffeeBeans.list(),
          api.brews.list(),
          api.brewTemplates.list(),
          api.coffeeServers.list().catch(() => []),
        ]);
      setGrinders(grindersData.map((g: any) => ({ ...g, id: String(g.id) })));
      setBrewers(brewersData.map((b: any) => ({ ...b, id: String(b.id) })));
      setRecipes(recipesData);
      setCoffeeBeans(beansData);
      setBrews(brewsData);
      setBrewTemplates(templatesData);
      setCoffeeServers(serversData);
    } catch (error) {
      console.error('Failed to load data:', error);
      // If we get an auth error, clear the user state
      if (error instanceof Error && error.message.includes('Session expired')) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [user, loadData]);

  const login = async (email: string, password: string) => {
    const userData = await api.auth.login(email, password);
    const userWithoutToken = { ...userData };
    delete (userWithoutToken as any).token;
    setUser(userWithoutToken);
    localStorage.setItem("user", JSON.stringify(userWithoutToken));
    localStorage.setItem("userId", String(userData.id));
    await loadData();
  };

  const signup = async (email: string, password: string, confirmPassword: string, name: string) => {
    const userData = await api.auth.signup(email, password, confirmPassword, name);
    const userWithoutToken = { ...userData };
    delete (userWithoutToken as any).token;
    setUser(userWithoutToken);
    localStorage.setItem("user", JSON.stringify(userWithoutToken));
    localStorage.setItem("userId", String(userData.id));
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmNewPassword: string) => {
    await api.auth.changePassword(currentPassword, newPassword, confirmNewPassword);
  };

  const socialLogin = async (provider: 'google' | 'apple', idToken: string) => {
    const userData = await api.auth.social(provider, idToken);
    const userWithoutToken = { ...userData };
    delete (userWithoutToken as any).token;
    setUser(userWithoutToken);
    localStorage.setItem("user", JSON.stringify(userWithoutToken));
    localStorage.setItem("userId", String(userData.id));
    await loadData();
  };

  const logout = () => {
    setUser(null);
    setGrinders([]);
    setBrewers([]);
    setRecipes([]);
    setCoffeeBeans([]);
    setBrews([]);
    setBrewTemplates([]);
    setCoffeeServers([]);
    clearAuth();
  };

  const addGrinder = async (grinder: Omit<Grinder, "id">) => {
    const newGrinder = await api.grinders.create(grinder);
    setGrinders(prev => [...prev, { ...newGrinder, id: String(newGrinder.id) }]);
  };

  const updateGrinder = async (id: string, grinder: Partial<Grinder>) => {
    await api.grinders.update(id, grinder);
    setGrinders(prev => prev.map(g => g.id === id ? { ...g, ...grinder } : g));
  };

  const deleteGrinder = async (id: string) => {
    await api.grinders.delete(id);
    setGrinders(prev => prev.filter(g => g.id !== id));
  };

  const addBrewer = async (brewer: Omit<Brewer, "id">) => {
    const newBrewer = await api.brewers.create(brewer);
    setBrewers(prev => [...prev, { ...newBrewer, id: String(newBrewer.id) }]);
  };

  const updateBrewer = async (id: string, brewer: Partial<Brewer>) => {
    await api.brewers.update(id, brewer);
    setBrewers(prev => prev.map(b => b.id === id ? { ...b, ...brewer } : b));
  };

  const deleteBrewer = async (id: string) => {
    await api.brewers.delete(id);
    setBrewers(prev => prev.filter(b => b.id !== id));
  };

  const addRecipe = async (recipe: Omit<Recipe, "id">) => {
    const newRecipe = await api.recipes.create(recipe);
    setRecipes(prev => [...prev, newRecipe]);
  };

  const updateRecipe = async (id: string, recipe: Partial<Recipe>) => {
    await api.recipes.update(id, recipe);
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...recipe } : r));
  };

  const deleteRecipe = async (id: string) => {
    await api.recipes.delete(id);
    setRecipes(prev => prev.filter(r => r.id !== id));
  };

  const toggleRecipeFavorite = async (id: string) => {
    await api.recipes.toggleFavorite(id);
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, favorite: !r.favorite } : r));
  };

  const addCoffeeBean = async (bean: Omit<CoffeeBean, "id">) => {
    const newBean = await api.coffeeBeans.create(bean);
    setCoffeeBeans(prev => [...prev, newBean]);
  };

  const updateCoffeeBean = async (id: string, bean: Partial<CoffeeBean>) => {
    await api.coffeeBeans.update(id, bean);
    setCoffeeBeans(prev => prev.map(b => b.id === id ? { ...b, ...bean } : b));
  };

  const deleteCoffeeBean = async (id: string) => {
    await api.coffeeBeans.delete(id);
    setCoffeeBeans(prev => prev.filter(b => b.id !== id));
  };

  const toggleCoffeeBeanFavorite = async (id: string) => {
    await api.coffeeBeans.toggleFavorite(id);
    setCoffeeBeans(prev => prev.map(b => b.id === id ? { ...b, favorite: !b.favorite } : b));
  };

  const addBrew = async (brew: Omit<Brew, "id">) => {
    const newBrew = await api.brews.create(brew);
    setBrews(prev => [newBrew, ...prev]);
  };

  const updateBrew = async (id: string, brew: Partial<Brew>) => {
    await api.brews.update(id, brew);
    setBrews(prev => prev.map(b => b.id === id ? { ...b, ...brew } : b));
  };

  const deleteBrew = async (id: string) => {
    await api.brews.delete(id);
    setBrews(prev => prev.filter(b => b.id !== id));
  };

  const toggleBrewFavorite = async (id: string) => {
    await api.brews.toggleFavorite(id);
    setBrews(prev => prev.map(b => b.id === id ? { ...b, favorite: !b.favorite } : b));
  };

  const addBrewTemplate = async (template: Omit<BrewTemplate, "id">) => {
    const newTemplate = await api.brewTemplates.create(template);
    setBrewTemplates(prev => [...prev, newTemplate]);
  };

  const updateBrewTemplate = async (id: string, template: Partial<BrewTemplate>) => {
    await api.brewTemplates.update(id, template);
    setBrewTemplates(prev => prev.map(t => t.id === id ? { ...t, ...template } : t));
  };

  const deleteBrewTemplate = async (id: string) => {
    await api.brewTemplates.delete(id);
    setBrewTemplates(prev => prev.filter(t => t.id !== id));
  };

  const addCoffeeServer = async (server: Omit<CoffeeServer, "id">) => {
    const newServer = await api.coffeeServers.create(server);
    setCoffeeServers(prev => [...prev, { ...newServer, id: String(newServer.id) }]);
  };

  const updateCoffeeServer = async (id: string, server: Partial<CoffeeServer>) => {
    await api.coffeeServers.update(id, server);
    setCoffeeServers(prev => prev.map(s => s.id === id ? { ...s, ...server } : s));
  };

  const deleteCoffeeServer = async (id: string) => {
    await api.coffeeServers.delete(id);
    setCoffeeServers(prev => prev.filter(s => s.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        user, login, signup, socialLogin, changePassword, logout,
        grinders, addGrinder, updateGrinder, deleteGrinder,
        brewers, addBrewer, updateBrewer, deleteBrewer,
        recipes, addRecipe, updateRecipe, deleteRecipe, toggleRecipeFavorite,
        coffeeBeans, addCoffeeBean, updateCoffeeBean, deleteCoffeeBean, toggleCoffeeBeanFavorite,
        brews, addBrew, updateBrew, deleteBrew, toggleBrewFavorite,
        brewTemplates, addBrewTemplate, updateBrewTemplate, deleteBrewTemplate,
        coffeeServers, addCoffeeServer, updateCoffeeServer, deleteCoffeeServer,
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
