import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

const CATEGORIES = ['meat', 'salad', 'drink', 'smoothie'];
const CATEGORY_ICONS = { meat: '🥩', salad: '🥗', drink: '🥤', smoothie: '🍹' };
const CATEGORY_COLORS = {
  meat: 'bg-orange-100 text-orange-700',
  salad: 'bg-green-100 text-green-700',
  drink: 'bg-blue-100 text-blue-700',
  smoothie: 'bg-purple-100 text-purple-700',
};

export default function MenuPlanner() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [recipes, setRecipes] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.MenuItem.list('-updated_date', 500),
    ]).then(([items]) => {
      // Get unique recipes
      const uniqueRecipes = new Map();
      items.forEach(item => {
        const key = `${item.name}-${item.category}`;
        if (!uniqueRecipes.has(key)) uniqueRecipes.set(key, item);
      });
      setRecipes(Array.from(uniqueRecipes.values()));
      setMenuItems(items);
      setLoading(false);
    });
  }, []);

  const getMenuForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return menuItems.filter(item => item.menu_date === dateStr);
  };

  const assignRecipeToDate = async (recipe) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // Check if already assigned for this date and category
    const existing = menuItems.find(
      item => item.menu_date === dateStr && item.category === recipe.category
    );

    if (existing) {
      await base44.entities.MenuItem.update(existing.id, {
        name: recipe.name,
        description: recipe.description,
        price: recipe.price,
        calories: recipe.calories,
        allergens: recipe.allergens,
        image_url: recipe.image_url,
        category: recipe.category,
        menu_date: dateStr,
      });
    } else {
      await base44.entities.MenuItem.create({
        name: recipe.name,
        description: recipe.description,
        price: recipe.price,
        calories: recipe.calories,
        allergens: recipe.allergens,
        image_url: recipe.image_url,
        category: recipe.category,
        menu_date: dateStr,
        is_active: true,
        city: 'San Francisco',
      });
    }

    // Reload menu items
    const updated = await base44.entities.MenuItem.list('-updated_date', 500);
    setMenuItems(updated);
    setShowAssignModal(false);
  };

  const removeFromMenu = async (itemId) => {
    await base44.entities.MenuItem.delete(itemId);
    const updated = await base44.entities.MenuItem.list('-updated_date', 500);
    setMenuItems(updated);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDay = daysInMonth[0];
  const startingDayOfWeek = firstDay.getDay();
  const emptyDays = Array(startingDayOfWeek).fill(null);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto bg-background min-h-screen">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5 text-foreground" />
          <h1 className="font-sans text-2xl font-bold text-foreground">Menu Planner</h1>
        </div>
        <p className="text-foreground/60 text-sm">Assign recipes to dates throughout the month</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-foreground/30 border-t-foreground rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg text-foreground">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                className="border-foreground/20 text-foreground hover:bg-foreground/5"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="border-foreground/20 text-foreground hover:bg-foreground/5"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-background border border-foreground/10 rounded-2xl overflow-hidden">
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 bg-foreground/5 border-b border-foreground/10">
              {weekdayLabels.map(day => (
                <div key={day} className="p-3 text-center text-xs font-semibold text-foreground/60">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {/* Empty cells for days before month starts */}
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="min-h-40 bg-foreground/3 border border-foreground/10" />
              ))}

              {/* Actual days */}
              {daysInMonth.map(date => {
                const dayMenu = getMenuForDate(date);
                const isToday = isSameDay(date, new Date());
                const isSelected = selectedDate && isSameDay(date, selectedDate);

                return (
                  <div
                    key={format(date, 'yyyy-MM-dd')}
                    onClick={() => setSelectedDate(date)}
                    className={`min-h-40 border border-foreground/10 p-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary/50'
                        : isToday
                        ? 'bg-foreground/5 border-foreground/30'
                        : 'hover:bg-foreground/5'
                    }`}
                  >
                    <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {format(date, 'd')}
                    </p>

                    {/* Menu items for this day */}
                    <div className="space-y-1 mb-2">
                      {dayMenu.map(item => (
                        <div
                          key={item.id}
                          className="text-xs bg-background border border-foreground/20 rounded p-1.5 group relative"
                        >
                          <div className="flex items-start gap-1">
                            <span className="text-xs">{CATEGORY_ICONS[item.category]}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground line-clamp-1">{item.name}</p>
                              <p className="text-xs text-foreground/60">${item.price?.toFixed(2)}</p>
                            </div>
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              removeFromMenu(item.id);
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add button if space available */}
                    {dayMenu.length < CATEGORIES.length && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedDate(date);
                          setShowAssignModal(true);
                        }}
                        className="w-full text-xs p-1 rounded border border-dashed border-foreground/20 text-foreground/60 hover:bg-foreground/5 transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5 inline mr-0.5" /> Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Info */}
          {selectedDate && (
            <div className="mt-6 bg-background border border-foreground/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">
                  Menu for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-foreground/60 hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {getMenuForDate(selectedDate).length === 0 ? (
                <p className="text-foreground/60 text-sm mb-4">No items assigned yet</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  {getMenuForDate(selectedDate).map(item => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 bg-foreground/3 rounded-lg border border-foreground/10"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-foreground/10 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
                          {CATEGORY_ICONS[item.category]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <Badge className={`text-xs ${CATEGORY_COLORS[item.category]} border-0 mt-1`}>
                          {item.category}
                        </Badge>
                        <p className="text-sm font-semibold text-foreground mt-1">${item.price?.toFixed(2)}</p>
                        {item.calories && (
                          <p className="text-xs text-foreground/60 mt-1">{item.calories} cal</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => setShowAssignModal(true)}
                className="w-full gap-2 bg-foreground text-background hover:bg-foreground/90"
                disabled={getMenuForDate(selectedDate).length >= CATEGORIES.length}
              >
                <Plus className="w-4 h-4" /> Assign Recipe
              </Button>
            </div>
          )}

          {/* Assign Modal */}
          {showAssignModal && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAssignModal(false)}>
              <div
                className="bg-background w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-foreground/10 max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <h2 className="font-sans text-xl font-bold mb-5 text-foreground">
                  Select Recipe for {selectedDate ? format(selectedDate, 'MMM d') : 'Selected Date'}
                </h2>

                <div className="grid md:grid-cols-2 gap-3">
                  {recipes.map(recipe => (
                    <button
                      key={`${recipe.name}-${recipe.category}`}
                      onClick={() => assignRecipeToDate(recipe)}
                      className="text-left p-4 border border-foreground/10 rounded-xl hover:bg-foreground/5 transition-all"
                    >
                      {recipe.image_url ? (
                        <img
                          src={recipe.image_url}
                          alt={recipe.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full h-32 bg-foreground/10 rounded-lg flex items-center justify-center mb-3 text-4xl">
                          {CATEGORY_ICONS[recipe.category]}
                        </div>
                      )}
                      <p className="font-semibold text-foreground">{recipe.name}</p>
                      <Badge className={`text-xs ${CATEGORY_COLORS[recipe.category]} border-0 mt-1`}>
                        {recipe.category}
                      </Badge>
                      <p className="text-sm text-foreground/60 mt-1">${recipe.price?.toFixed(2)}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1 border-foreground/20 text-foreground hover:bg-foreground/5"
                    onClick={() => setShowAssignModal(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}